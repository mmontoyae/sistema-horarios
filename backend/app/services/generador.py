"""
Generacion automatica de horarios.

Recorre el distributivo academico y busca, para cada asignacion, una franja
y un espacio donde el bloque no incumpla ninguna regla. Reutiliza las mismas
funciones de validacion que se aplican cuando el usuario propone un bloque a
mano, de modo que el horario generado cumple exactamente los mismos criterios.

Todas las funciones son puras: no modifican los datos que reciben. El estado
del horario en construccion se pasa de una iteracion a la siguiente creando
listas nuevas, nunca alterando la anterior.
"""
from app.services import validaciones

DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"]
HORAS_INICIO = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
                "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

DURACION_BLOQUE = 2   # horas por bloque
FIN_JORNADA = 22 * 60


def partir_en_bloques(horas_semanales: int) -> list[int]:
    """
    Reparte las horas semanales en bloques de dos horas.

    Cuatro horas se convierten en dos bloques de dos; tres horas, en uno de
    dos y otro de una.
    """
    bloques = []
    restantes = horas_semanales
    while restantes > 0:
        bloques.append(min(DURACION_BLOQUE, restantes))
        restantes -= DURACION_BLOQUE
    return bloques


def sumar_horas(hora: str, horas: int) -> str:
    total = validaciones.a_minutos(hora) + horas * 60
    return f"{total // 60:02d}:{total % 60:02d}"


def espacios_compatibles(asignatura: dict, paralelo: dict, espacios: list[dict]) -> list[dict]:
    """Espacios del tipo requerido con capacidad suficiente, del mas ajustado al mas holgado."""
    requerido = asignatura.get("tipo_espacio_requerido")
    validos = [
        e for e in espacios
        if (not requerido or e["tipo_espacio"] == requerido)
        and e["capacidad"] >= paralelo["numero_estudiantes"]
    ]
    # se prefiere el espacio mas ajustado para no malgastar los grandes
    return sorted(validos, key=lambda e: e["capacidad"])


def dias_del_docente(docente_id: str, disponibilidades: list[dict]) -> list[str]:
    """Dias en los que el docente declaro disponibilidad, en el orden de la semana."""
    suyos = {d["dia_semana"] for d in disponibilidades
             if d["docente_id"] == docente_id and d["disponible"]}
    return [d for d in DIAS if d in suyos]


def dificultad(asignacion: dict, datos: dict) -> tuple:
    """
    Cuantas opciones tiene una asignacion. Las mas restringidas se colocan
    primero, porque son las que menos alternativas tienen despues.
    """
    asignatura = next((a for a in datos["asignaturas"]
                       if a["asignatura_id"] == asignacion["asignatura_id"]), None)
    paralelo = next((p for p in datos["paralelos"]
                     if p["paralelo_id"] == asignacion["paralelo_id"]), None)
    if not asignatura or not paralelo:
        return (0, 0)

    n_espacios = len(espacios_compatibles(asignatura, paralelo, datos["espacios"]))
    n_dias = len(dias_del_docente(asignacion["docente_id"], datos["disponibilidades"]))
    return (n_espacios * n_dias, n_espacios)


def buscar_hueco(asignacion: dict, duracion: int, datos: dict) -> dict | None:
    """
    Primera combinacion de dia, hora y espacio que no genera ningun conflicto.
    Devuelve None si no existe ninguna.
    """
    asignatura = next((a for a in datos["asignaturas"]
                       if a["asignatura_id"] == asignacion["asignatura_id"]), None)
    paralelo = next((p for p in datos["paralelos"]
                     if p["paralelo_id"] == asignacion["paralelo_id"]), None)
    if not asignatura or not paralelo:
        return None

    espacios = espacios_compatibles(asignatura, paralelo, datos["espacios"])
    dias = dias_del_docente(asignacion["docente_id"], datos["disponibilidades"])

    for dia in dias:
        for hora in HORAS_INICIO:
            fin = validaciones.a_minutos(hora) + duracion * 60
            if fin > FIN_JORNADA:
                continue
            for espacio in espacios:
                propuesta = {
                    "asignatura_id": asignacion["asignatura_id"],
                    "paralelo_id": asignacion["paralelo_id"],
                    "docente_id": asignacion["docente_id"],
                    "espacio_id": espacio["espacio_id"],
                    "dia_semana": dia,
                    "hora_inicio": hora,
                    "hora_fin": sumar_horas(hora, duracion),
                    "modalidad": asignatura.get("modalidad", "PRESENCIAL"),
                }
                if validaciones.validar_propuesta(propuesta, datos)["estado"] == "VALIDO":
                    return propuesta
    return None


def motivo_sin_hueco(asignacion: dict, datos: dict) -> str:
    """Explica por que una asignacion no pudo colocarse en ninguna parte."""
    asignatura = next((a for a in datos["asignaturas"]
                       if a["asignatura_id"] == asignacion["asignatura_id"]), None)
    paralelo = next((p for p in datos["paralelos"]
                     if p["paralelo_id"] == asignacion["paralelo_id"]), None)

    if not asignatura or not paralelo:
        return "La asignatura o el paralelo no estan registrados"

    if not dias_del_docente(asignacion["docente_id"], datos["disponibilidades"]):
        return "El docente no tiene disponibilidad declarada"

    compatibles = espacios_compatibles(asignatura, paralelo, datos["espacios"])
    if not compatibles:
        requerido = asignatura.get("tipo_espacio_requerido") or "cualquier espacio"
        return (f"No hay ningun espacio de tipo {requerido} con capacidad para "
                f"{paralelo['numero_estudiantes']} estudiantes")

    return "No quedan franjas libres que cumplan todas las reglas"


def generar_horario(datos: dict, conservar_existente: bool = False) -> dict:
    """
    Construye el horario completo a partir del distributivo.

    Devuelve los bloques asignados y la lista de los que no se pudieron
    colocar, cada uno con su motivo.
    """
    horarios = list(datos["horarios"]) if conservar_existente else []

    # las asignaciones con menos alternativas se resuelven primero
    pendientes = sorted(datos["distributivo"], key=lambda a: dificultad(a, datos))

    asignados: list[dict] = []
    sin_asignar: list[dict] = []

    for asignacion in pendientes:
        asignatura = next((a for a in datos["asignaturas"]
                           if a["asignatura_id"] == asignacion["asignatura_id"]), None)
        if not asignatura:
            sin_asignar.append({
                "asignatura_id": asignacion["asignatura_id"],
                "paralelo_id": asignacion["paralelo_id"],
                "docente_id": asignacion["docente_id"],
                "motivo": "La asignatura no esta registrada",
            })
            continue

        for duracion in partir_en_bloques(asignatura.get("horas_semanales", DURACION_BLOQUE)):
            estado = {**datos, "horarios": horarios}
            bloque = buscar_hueco(asignacion, duracion, estado)

            if bloque is None:
                sin_asignar.append({
                    "asignatura_id": asignacion["asignatura_id"],
                    "paralelo_id": asignacion["paralelo_id"],
                    "docente_id": asignacion["docente_id"],
                    "motivo": motivo_sin_hueco(asignacion, estado),
                })
                break

            horarios = horarios + [bloque]
            asignados.append(bloque)

    return {
        "asignados": asignados,
        "sin_asignar": sin_asignar,
        "total_asignados": len(asignados),
        "total_sin_asignar": len(sin_asignar),
    }
