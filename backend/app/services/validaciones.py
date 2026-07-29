"""
Logica de validacion de horarios.

Todas las funciones de este modulo son puras: reciben los datos como
argumentos y devuelven el resultado sin modificar nada ni tocar la base
de datos. Eso permite probarlas de forma aislada con pytest y es el
enfoque que estamos trabajando en la materia (funciones puras,
inmutabilidad y composicion).
"""


def a_minutos(hora: str) -> int:
    """Convierte 'HH:MM' a minutos desde medianoche."""
    h, m = hora.split(":")
    return int(h) * 60 + int(m)


def hay_traslape(inicio1: str, fin1: str, inicio2: str, fin2: str) -> bool:
    """Dos intervalos se traslapan si uno empieza antes de que termine el otro."""
    return a_minutos(inicio1) < a_minutos(fin2) and a_minutos(fin1) > a_minutos(inicio2)


def duracion_horas(inicio: str, fin: str) -> float:
    return (a_minutos(fin) - a_minutos(inicio)) / 60


def _bloque_texto(propuesta: dict) -> str:
    return f"{propuesta['asignatura_id']}/{propuesta['paralelo_id']} {propuesta['dia_semana']} {propuesta['hora_inicio']}-{propuesta['hora_fin']}"


def _conflicto(codigo: str, detalle: str, propuesta: dict) -> dict:
    return {"codigo": codigo, "detalle": detalle, "bloque": _bloque_texto(propuesta)}


# ------------------------------------------------------------------
# Validaciones individuales: cada una devuelve una lista de conflictos
# (vacia si no hay problema)
# ------------------------------------------------------------------

def validar_distributivo(propuesta: dict, distributivo: list[dict]) -> list[dict]:
    existe = any(
        d["docente_id"] == propuesta["docente_id"]
        and d["asignatura_id"] == propuesta["asignatura_id"]
        and d["paralelo_id"] == propuesta["paralelo_id"]
        for d in distributivo
    )
    if existe:
        return []
    return [_conflicto(
        "DISTRIBUTIVO_INVALIDO",
        "La combinacion docente/asignatura/paralelo no existe en el distributivo",
        propuesta,
    )]


def validar_disponibilidad_docente(propuesta: dict, disponibilidades: list[dict]) -> list[dict]:
    franjas = [
        d for d in disponibilidades
        if d["docente_id"] == propuesta["docente_id"]
        and d["dia_semana"] == propuesta["dia_semana"]
        and d["disponible"]
    ]
    cubierto = any(
        a_minutos(f["hora_inicio"]) <= a_minutos(propuesta["hora_inicio"])
        and a_minutos(f["hora_fin"]) >= a_minutos(propuesta["hora_fin"])
        for f in franjas
    )
    if cubierto:
        return []
    return [_conflicto(
        "FUERA_DISPONIBILIDAD",
        f"El docente {propuesta['docente_id']} no tiene disponibilidad en esa franja",
        propuesta,
    )]


def validar_docente_ocupado(propuesta: dict, horarios: list[dict]) -> list[dict]:
    ocupado = [
        h for h in horarios
        if h["docente_id"] == propuesta["docente_id"]
        and h["dia_semana"] == propuesta["dia_semana"]
        and hay_traslape(propuesta["hora_inicio"], propuesta["hora_fin"], h["hora_inicio"], h["hora_fin"])
    ]
    return [
        _conflicto(
            "DOCENTE_OCUPADO",
            f"El docente {propuesta['docente_id']} ya dicta {h['asignatura_id']} en esa franja",
            propuesta,
        )
        for h in ocupado
    ]


def validar_espacio_ocupado(propuesta: dict, horarios: list[dict]) -> list[dict]:
    ocupado = [
        h for h in horarios
        if h["espacio_id"] == propuesta["espacio_id"]
        and h["dia_semana"] == propuesta["dia_semana"]
        and hay_traslape(propuesta["hora_inicio"], propuesta["hora_fin"], h["hora_inicio"], h["hora_fin"])
    ]
    return [
        _conflicto(
            "ESPACIO_OCUPADO",
            f"El espacio {propuesta['espacio_id']} ya esta ocupado por {h['asignatura_id']} en esa franja",
            propuesta,
        )
        for h in ocupado
    ]


def validar_espacio_compatible(propuesta: dict, asignaturas: list[dict], espacios: list[dict]) -> list[dict]:
    asignatura = next((a for a in asignaturas if a["asignatura_id"] == propuesta["asignatura_id"]), None)
    espacio = next((e for e in espacios if e["espacio_id"] == propuesta["espacio_id"]), None)

    if asignatura is None or espacio is None:
        return [_conflicto("DATO_INEXISTENTE", "La asignatura o el espacio no estan registrados", propuesta)]

    requerido = asignatura.get("tipo_espacio_requerido")
    if not requerido or requerido == espacio["tipo_espacio"]:
        return []
    return [_conflicto(
        "ESPACIO_INCOMPATIBLE",
        f"La asignatura requiere {requerido} y el espacio es {espacio['tipo_espacio']}",
        propuesta,
    )]


def validar_carga_horaria(propuesta: dict, horarios: list[dict], docentes: list[dict]) -> list[dict]:
    docente = next((d for d in docentes if d["docente_id"] == propuesta["docente_id"]), None)
    if docente is None:
        return [_conflicto("DATO_INEXISTENTE", "El docente no esta registrado", propuesta)]

    horas_actuales = sum(
        duracion_horas(h["hora_inicio"], h["hora_fin"])
        for h in horarios
        if h["docente_id"] == propuesta["docente_id"]
    )
    horas_nuevas = duracion_horas(propuesta["hora_inicio"], propuesta["hora_fin"])
    maximo = docente["horas_max_semanales"]

    if horas_actuales + horas_nuevas <= maximo:
        return []
    return [_conflicto(
        "EXCESO_CARGA",
        f"Con este bloque el docente llegaria a {horas_actuales + horas_nuevas:.1f} horas y su maximo es {maximo}",
        propuesta,
    )]


def validar_capacidad(propuesta: dict, paralelos: list[dict], espacios: list[dict]) -> list[dict]:
    paralelo = next((p for p in paralelos if p["paralelo_id"] == propuesta["paralelo_id"]), None)
    espacio = next((e for e in espacios if e["espacio_id"] == propuesta["espacio_id"]), None)

    if paralelo is None or espacio is None:
        return [_conflicto("DATO_INEXISTENTE", "El paralelo o el espacio no estan registrados", propuesta)]

    if paralelo["numero_estudiantes"] <= espacio["capacidad"]:
        return []
    return [_conflicto(
        "CAPACIDAD_INSUFICIENTE",
        f"El paralelo tiene {paralelo['numero_estudiantes']} estudiantes y el espacio soporta {espacio['capacidad']}",
        propuesta,
    )]


# ------------------------------------------------------------------
# Composicion: se aplican todas las validaciones y se juntan los
# resultados. La lista de funciones actua como pipeline.
# ------------------------------------------------------------------

def validar_propuesta(propuesta: dict, datos: dict) -> dict:
    """
    datos es un diccionario con los catalogos:
    docentes, espacios, asignaturas, paralelos, distributivo,
    disponibilidades y horarios (bloques ya confirmados).
    """
    validaciones = [
        lambda: validar_distributivo(propuesta, datos["distributivo"]),
        lambda: validar_disponibilidad_docente(propuesta, datos["disponibilidades"]),
        lambda: validar_docente_ocupado(propuesta, datos["horarios"]),
        lambda: validar_espacio_ocupado(propuesta, datos["horarios"]),
        lambda: validar_espacio_compatible(propuesta, datos["asignaturas"], datos["espacios"]),
        lambda: validar_carga_horaria(propuesta, datos["horarios"], datos["docentes"]),
        lambda: validar_capacidad(propuesta, datos["paralelos"], datos["espacios"]),
    ]

    conflictos = [c for validar in validaciones for c in validar()]

    return {
        "estado": "INVALIDO" if conflictos else "VALIDO",
        "total_conflictos": len(conflictos),
        "conflictos": conflictos,
    }
