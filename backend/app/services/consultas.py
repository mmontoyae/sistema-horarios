"""
Acceso a datos: carga los catalogos desde SQL Server y los convierte
a listas de diccionarios para que la logica de validacion (funciones
puras) no dependa de la base de datos.
"""
from datetime import time
from sqlalchemy.orm import Session
from sqlalchemy import select
from app import models


def _hora_a_texto(valor: time) -> str:
    return valor.strftime("%H:%M")


def cargar_datos(db: Session) -> dict:
    docentes = db.scalars(select(models.Docente)).all()
    espacios = db.scalars(select(models.Espacio)).all()
    asignaturas = db.scalars(select(models.Asignatura)).all()
    paralelos = db.scalars(select(models.Paralelo)).all()
    distributivo = db.scalars(select(models.Distributivo)).all()
    disponibilidades = db.scalars(select(models.DisponibilidadDocente)).all()
    horarios = db.scalars(select(models.Horario)).all()

    return {
        "docentes": [
            {"docente_id": d.docente_id, "horas_max_semanales": d.horas_max_semanales,
             "nombres": d.nombres, "apellidos": d.apellidos}
            for d in docentes
        ],
        "espacios": [
            {"espacio_id": e.espacio_id, "tipo_espacio": e.tipo_espacio, "capacidad": e.capacidad,
             "nombre_espacio": e.nombre_espacio, "codigo_espacio": e.codigo_espacio}
            for e in espacios
        ],
        "asignaturas": [
            {"asignatura_id": a.asignatura_id, "tipo_espacio_requerido": a.tipo_espacio_requerido,
             "modalidad": a.modalidad, "nombre_asignatura": a.nombre_asignatura,
             # el generador necesita saber cuantas horas repartir en la semana
             "horas_semanales": a.horas_semanales, "requiere_laboratorio": a.requiere_laboratorio}
            for a in asignaturas
        ],
        "paralelos": [
            {"paralelo_id": p.paralelo_id, "asignatura_id": p.asignatura_id,
             "numero_estudiantes": p.numero_estudiantes,
             "codigo_paralelo": p.codigo_paralelo, "jornada": p.jornada}
            for p in paralelos
        ],
        "distributivo": [
            {"docente_id": d.docente_id, "asignatura_id": d.asignatura_id, "paralelo_id": d.paralelo_id}
            for d in distributivo
        ],
        "disponibilidades": [
            {"docente_id": d.docente_id, "dia_semana": d.dia_semana,
             "hora_inicio": _hora_a_texto(d.hora_inicio), "hora_fin": _hora_a_texto(d.hora_fin),
             "disponible": d.disponible}
            for d in disponibilidades
        ],
        "horarios": [
            {"horario_id": h.horario_id, "asignatura_id": h.asignatura_id, "paralelo_id": h.paralelo_id,
             "docente_id": h.docente_id, "espacio_id": h.espacio_id, "dia_semana": h.dia_semana,
             "hora_inicio": _hora_a_texto(h.hora_inicio), "hora_fin": _hora_a_texto(h.hora_fin),
             "modalidad": h.modalidad}
            for h in horarios
        ],
    }
