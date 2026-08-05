"""
Pruebas del generador automatico de horarios.

Al igual que las validaciones, el generador esta formado por funciones puras,
de modo que se prueba entregando los catalogos directamente.

Ejecutar desde la carpeta backend con: pytest -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import generador as g
from app.services import validaciones as v


DOCENTES = [
    {"docente_id": "DOC001", "horas_max_semanales": 40, "nombres": "Ana", "apellidos": "Lopez"},
    {"docente_id": "DOC002", "horas_max_semanales": 40, "nombres": "Luis", "apellidos": "Mora"},
]

ESPACIOS = [
    {"espacio_id": "ESP001", "tipo_espacio": "AULA", "capacidad": 40, "nombre_espacio": "Aula 101"},
    {"espacio_id": "ESP002", "tipo_espacio": "LABORATORIO", "capacidad": 30, "nombre_espacio": "Lab 1"},
    {"espacio_id": "ESP003", "tipo_espacio": "LABORATORIO", "capacidad": 20, "nombre_espacio": "Lab 2"},
]

ASIGNATURAS = [
    {"asignatura_id": "ASI001", "tipo_espacio_requerido": "LABORATORIO",
     "horas_semanales": 4, "modalidad": "PRESENCIAL", "nombre_asignatura": "Programacion"},
    {"asignatura_id": "ASI002", "tipo_espacio_requerido": "AULA",
     "horas_semanales": 3, "modalidad": "PRESENCIAL", "nombre_asignatura": "Calculo"},
]

PARALELOS = [
    {"paralelo_id": "PAR001", "asignatura_id": "ASI001", "numero_estudiantes": 25},
    {"paralelo_id": "PAR002", "asignatura_id": "ASI002", "numero_estudiantes": 35},
]

DISTRIBUTIVO = [
    {"docente_id": "DOC001", "asignatura_id": "ASI001", "paralelo_id": "PAR001"},
    {"docente_id": "DOC002", "asignatura_id": "ASI002", "paralelo_id": "PAR002"},
]

DISPONIBILIDADES = [
    {"docente_id": "DOC001", "dia_semana": "LUNES", "hora_inicio": "07:00", "hora_fin": "13:00", "disponible": True},
    {"docente_id": "DOC001", "dia_semana": "MARTES", "hora_inicio": "07:00", "hora_fin": "13:00", "disponible": True},
    {"docente_id": "DOC002", "dia_semana": "LUNES", "hora_inicio": "07:00", "hora_fin": "13:00", "disponible": True},
]

DATOS = {
    "docentes": DOCENTES, "espacios": ESPACIOS, "asignaturas": ASIGNATURAS,
    "paralelos": PARALELOS, "distributivo": DISTRIBUTIVO,
    "disponibilidades": DISPONIBILIDADES, "horarios": [],
}


# ------------------- funciones auxiliares -------------------

def test_partir_en_bloques_pares():
    assert g.partir_en_bloques(4) == [2, 2]


def test_partir_en_bloques_impares():
    assert g.partir_en_bloques(3) == [2, 1]


def test_partir_en_bloques_una_hora():
    assert g.partir_en_bloques(1) == [1]


def test_sumar_horas():
    assert g.sumar_horas("07:00", 2) == "09:00"
    assert g.sumar_horas("13:30", 1) == "14:30"


def test_espacios_compatibles_filtra_por_tipo_y_capacidad():
    # ASI001 requiere laboratorio; PAR001 tiene 25 estudiantes,
    # asi que el laboratorio de 20 queda descartado
    resultado = g.espacios_compatibles(ASIGNATURAS[0], PARALELOS[0], ESPACIOS)
    assert [e["espacio_id"] for e in resultado] == ["ESP002"]


def test_espacios_compatibles_ordena_del_mas_ajustado():
    paralelo = {"paralelo_id": "X", "asignatura_id": "ASI001", "numero_estudiantes": 15}
    resultado = g.espacios_compatibles(ASIGNATURAS[0], paralelo, ESPACIOS)
    assert [e["capacidad"] for e in resultado] == [20, 30]


def test_dias_del_docente_en_orden_de_semana():
    assert g.dias_del_docente("DOC001", DISPONIBILIDADES) == ["LUNES", "MARTES"]


def test_dias_del_docente_sin_disponibilidad():
    assert g.dias_del_docente("DOC999", DISPONIBILIDADES) == []


# ------------------- generacion -------------------

def test_genera_todos_los_bloques_esperados():
    # ASI001 son 4 horas (2 bloques) y ASI002 son 3 horas (2 bloques)
    resultado = g.generar_horario(DATOS)
    assert resultado["total_asignados"] == 4
    assert resultado["total_sin_asignar"] == 0


def test_los_bloques_generados_no_tienen_conflictos():
    resultado = g.generar_horario(DATOS)
    acumulado = []
    for bloque in resultado["asignados"]:
        estado = {**DATOS, "horarios": acumulado}
        assert v.validar_propuesta(bloque, estado)["estado"] == "VALIDO"
        acumulado.append(bloque)


def test_informa_cuando_no_hay_espacio_con_capacidad():
    # un paralelo de 50 estudiantes no cabe en ningun laboratorio
    paralelos = [{"paralelo_id": "PAR001", "asignatura_id": "ASI001", "numero_estudiantes": 50}]
    datos = {**DATOS, "paralelos": paralelos,
             "distributivo": [DISTRIBUTIVO[0]]}

    resultado = g.generar_horario(datos)
    assert resultado["total_asignados"] == 0
    assert resultado["total_sin_asignar"] == 1
    assert "capacidad" in resultado["sin_asignar"][0]["motivo"]


def test_informa_cuando_el_docente_no_tiene_disponibilidad():
    datos = {**DATOS, "disponibilidades": [], "distributivo": [DISTRIBUTIVO[0]]}
    resultado = g.generar_horario(datos)
    assert resultado["total_sin_asignar"] == 1
    assert "disponibilidad" in resultado["sin_asignar"][0]["motivo"]


def test_no_modifica_los_datos_recibidos():
    # el generador debe ser puro: los catalogos no cambian
    copia = {clave: list(valor) for clave, valor in DATOS.items()}
    g.generar_horario(DATOS)
    assert DATOS == copia


def test_conservar_existente_respeta_los_bloques_previos():
    previo = {
        "asignatura_id": "ASI001", "paralelo_id": "PAR001", "docente_id": "DOC001",
        "espacio_id": "ESP002", "dia_semana": "LUNES", "hora_inicio": "07:00",
        "hora_fin": "09:00", "modalidad": "PRESENCIAL",
    }
    datos = {**DATOS, "horarios": [previo]}
    resultado = g.generar_horario(datos, conservar_existente=True)

    # ningun bloque nuevo debe ocupar el laboratorio el lunes a las 07:00
    choques = [
        b for b in resultado["asignados"]
        if b["espacio_id"] == "ESP002" and b["dia_semana"] == "LUNES"
        and v.hay_traslape(b["hora_inicio"], b["hora_fin"], "07:00", "09:00")
    ]
    assert choques == []
