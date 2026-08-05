from pydantic import BaseModel, Field
from typing import Optional


# ---------- esquemas de importacion ----------

class DocenteIn(BaseModel):
    docente_id: str
    cedula: str
    nombres: str
    apellidos: str
    correo: str
    tipo_contrato: str
    horas_max_semanales: int = Field(gt=0)
    activo: bool = True


class EspacioIn(BaseModel):
    espacio_id: str
    codigo_espacio: str
    nombre_espacio: str
    tipo_espacio: str
    capacidad: int = Field(gt=0)
    edificio: Optional[str] = None
    piso: Optional[int] = None
    activo: bool = True


class AsignaturaIn(BaseModel):
    asignatura_id: str
    codigo_asignatura: str
    nombre_asignatura: str
    modalidad: str
    requiere_laboratorio: bool = False
    tipo_espacio_requerido: Optional[str] = None
    horas_semanales: int = Field(gt=0)
    cupo_estimado: int = Field(gt=0)
    activo: bool = True


class ParaleloIn(BaseModel):
    paralelo_id: str
    asignatura_id: str
    codigo_paralelo: str
    carrera: str
    nivel: int
    jornada: str
    numero_estudiantes: int = Field(gt=0)
    activo: bool = True


class DistributivoIn(BaseModel):
    distributivo_id: str
    docente_id: str
    asignatura_id: str
    paralelo_id: str
    periodo_academico: str
    horas_asignadas: int = Field(gt=0)
    observacion: Optional[str] = None


class DisponibilidadIn(BaseModel):
    disponibilidad_id: str
    docente_id: str
    dia_semana: str
    hora_inicio: str   # formato HH:MM
    hora_fin: str
    disponible: bool = True


# ---------- propuesta de horario ----------

class MovimientoBloque(BaseModel):
    """Nueva ubicacion a la que se quiere arrastrar un bloque ya confirmado."""
    dia_semana: str
    hora_inicio: str


class PropuestaHorario(BaseModel):
    asignatura_id: str
    paralelo_id: str
    docente_id: str
    espacio_id: str
    dia_semana: str
    hora_inicio: str
    hora_fin: str
    modalidad: str
    confirmar: bool = False  # si es valida, se guarda en la tabla horario


# ---------- respuestas ----------

class Conflicto(BaseModel):
    codigo: str
    detalle: str
    bloque: str


class ResultadoValidacion(BaseModel):
    estado: str               # VALIDO o INVALIDO
    total_conflictos: int
    conflictos: list[Conflicto]


class ResumenImportacion(BaseModel):
    entidad: str
    procesados: int
    errores: list[str]


class AsignacionPendiente(BaseModel):
    asignatura_id: str
    paralelo_id: str
    docente_id: str
    motivo: str


class ResultadoGeneracion(BaseModel):
    total_asignados: int
    total_sin_asignar: int
    sin_asignar: list[AsignacionPendiente]
