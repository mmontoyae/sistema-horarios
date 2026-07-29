"""
Pruebas unitarias de la logica de validacion.
Como las funciones son puras, se prueban pasando los datos directamente,
sin necesidad de levantar la base de datos.

Ejecutar desde la carpeta backend con: pytest -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import validaciones as v


# ------------------- datos base para las pruebas -------------------

DOCENTES = [
    {"docente_id": "DOC001", "horas_max_semanales": 40},
    {"docente_id": "DOC002", "horas_max_semanales": 4},
]

ESPACIOS = [
    {"espacio_id": "ESP001", "tipo_espacio": "AULA", "capacidad": 40},
    {"espacio_id": "ESP002", "tipo_espacio": "LABORATORIO", "capacidad": 25},
]

ASIGNATURAS = [
    {"asignatura_id": "ASI001", "tipo_espacio_requerido": "LABORATORIO"},
    {"asignatura_id": "ASI002", "tipo_espacio_requerido": None},
]

PARALELOS = [
    {"paralelo_id": "PAR001", "asignatura_id": "ASI001", "numero_estudiantes": 20},
    {"paralelo_id": "PAR002", "asignatura_id": "ASI002", "numero_estudiantes": 35},
]

DISTRIBUTIVO = [
    {"docente_id": "DOC001", "asignatura_id": "ASI001", "paralelo_id": "PAR001"},
    {"docente_id": "DOC002", "asignatura_id": "ASI002", "paralelo_id": "PAR002"},
]

DISPONIBILIDADES = [
    {"docente_id": "DOC001", "dia_semana": "LUNES", "hora_inicio": "07:00", "hora_fin": "13:00", "disponible": True},
    {"docente_id": "DOC002", "dia_semana": "LUNES", "hora_inicio": "07:00", "hora_fin": "13:00", "disponible": True},
]

HORARIOS = [
    {"asignatura_id": "ASI002", "paralelo_id": "PAR002", "docente_id": "DOC002",
     "espacio_id": "ESP001", "dia_semana": "LUNES", "hora_inicio": "07:00", "hora_fin": "09:00",
     "modalidad": "PRESENCIAL"},
]

DATOS = {
    "docentes": DOCENTES,
    "espacios": ESPACIOS,
    "asignaturas": ASIGNATURAS,
    "paralelos": PARALELOS,
    "distributivo": DISTRIBUTIVO,
    "disponibilidades": DISPONIBILIDADES,
    "horarios": HORARIOS,
}


def propuesta_base(**cambios):
    base = {
        "asignatura_id": "ASI001",
        "paralelo_id": "PAR001",
        "docente_id": "DOC001",
        "espacio_id": "ESP002",
        "dia_semana": "LUNES",
        "hora_inicio": "09:00",
        "hora_fin": "11:00",
        "modalidad": "PRESENCIAL",
    }
    return {**base, **cambios}


# ------------------- funciones auxiliares -------------------

def test_a_minutos():
    assert v.a_minutos("07:00") == 420
    assert v.a_minutos("13:30") == 810


def test_hay_traslape_cuando_se_cruzan():
    assert v.hay_traslape("08:00", "10:00", "09:00", "11:00") is True


def test_no_hay_traslape_cuando_son_consecutivos():
    # que una clase termine 09:00 y otra empiece 09:00 no es conflicto
    assert v.hay_traslape("07:00", "09:00", "09:00", "11:00") is False


def test_duracion_horas():
    assert v.duracion_horas("07:00", "09:30") == 2.5


# ------------------- validaciones del dominio -------------------

def test_propuesta_valida_no_genera_conflictos():
    resultado = v.validar_propuesta(propuesta_base(), DATOS)
    assert resultado["estado"] == "VALIDO"
    assert resultado["total_conflictos"] == 0


def test_distributivo_invalido():
    # DOC002 no tiene asignada ASI001/PAR001
    propuesta = propuesta_base(docente_id="DOC002")
    conflictos = v.validar_distributivo(propuesta, DISTRIBUTIVO)
    assert len(conflictos) == 1
    assert conflictos[0]["codigo"] == "DISTRIBUTIVO_INVALIDO"


def test_fuera_de_disponibilidad():
    # DOC001 solo esta disponible el lunes hasta las 13:00
    propuesta = propuesta_base(hora_inicio="14:00", hora_fin="16:00")
    conflictos = v.validar_disponibilidad_docente(propuesta, DISPONIBILIDADES)
    assert conflictos[0]["codigo"] == "FUERA_DISPONIBILIDAD"


def test_docente_ocupado():
    # DOC002 ya dicta clase el lunes de 07:00 a 09:00
    propuesta = propuesta_base(docente_id="DOC002", hora_inicio="08:00", hora_fin="10:00")
    conflictos = v.validar_docente_ocupado(propuesta, HORARIOS)
    assert conflictos[0]["codigo"] == "DOCENTE_OCUPADO"


def test_espacio_ocupado():
    # ESP001 esta ocupada el lunes de 07:00 a 09:00
    propuesta = propuesta_base(espacio_id="ESP001", hora_inicio="08:00", hora_fin="10:00")
    conflictos = v.validar_espacio_ocupado(propuesta, HORARIOS)
    assert conflictos[0]["codigo"] == "ESPACIO_OCUPADO"


def test_espacio_libre_en_otra_franja():
    propuesta = propuesta_base(espacio_id="ESP001", hora_inicio="10:00", hora_fin="12:00")
    conflictos = v.validar_espacio_ocupado(propuesta, HORARIOS)
    assert conflictos == []


def test_espacio_incompatible():
    # ASI001 requiere laboratorio y ESP001 es aula normal
    propuesta = propuesta_base(espacio_id="ESP001", hora_inicio="10:00", hora_fin="12:00")
    conflictos = v.validar_espacio_compatible(propuesta, ASIGNATURAS, ESPACIOS)
    assert conflictos[0]["codigo"] == "ESPACIO_INCOMPATIBLE"


def test_asignatura_sin_requisito_acepta_cualquier_espacio():
    propuesta = propuesta_base(asignatura_id="ASI002", espacio_id="ESP001")
    conflictos = v.validar_espacio_compatible(propuesta, ASIGNATURAS, ESPACIOS)
    assert conflictos == []


def test_exceso_de_carga_horaria():
    # DOC002 tiene maximo 4 horas y ya ocupa 2, un bloque de 3 lo pasa
    propuesta = propuesta_base(docente_id="DOC002", hora_inicio="09:00", hora_fin="12:00")
    conflictos = v.validar_carga_horaria(propuesta, HORARIOS, DOCENTES)
    assert conflictos[0]["codigo"] == "EXCESO_CARGA"


def test_carga_horaria_dentro_del_limite():
    propuesta = propuesta_base(docente_id="DOC002", hora_inicio="09:00", hora_fin="11:00")
    conflictos = v.validar_carga_horaria(propuesta, HORARIOS, DOCENTES)
    assert conflictos == []


def test_capacidad_insuficiente():
    # PAR002 tiene 35 estudiantes y el laboratorio soporta 25
    propuesta = propuesta_base(paralelo_id="PAR002", espacio_id="ESP002")
    conflictos = v.validar_capacidad(propuesta, PARALELOS, ESPACIOS)
    assert conflictos[0]["codigo"] == "CAPACIDAD_INSUFICIENTE"


def test_propuesta_con_varios_conflictos():
    # docente equivocado, fuera de horario y espacio incompatible a la vez
    propuesta = propuesta_base(docente_id="DOC002", espacio_id="ESP001",
                               hora_inicio="14:00", hora_fin="16:00")
    resultado = v.validar_propuesta(propuesta, DATOS)
    assert resultado["estado"] == "INVALIDO"
    assert resultado["total_conflictos"] >= 3


def test_validar_propuesta_no_modifica_los_datos():
    # las funciones deben ser puras: los catalogos no cambian
    copia_horarios = [dict(h) for h in HORARIOS]
    v.validar_propuesta(propuesta_base(), DATOS)
    assert HORARIOS == copia_horarios
