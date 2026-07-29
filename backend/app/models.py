from sqlalchemy import String, Integer, Boolean, Time, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Docente(Base):
    __tablename__ = "docente"

    docente_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    cedula: Mapped[str] = mapped_column(String(13))
    nombres: Mapped[str] = mapped_column(String(80))
    apellidos: Mapped[str] = mapped_column(String(80))
    correo: Mapped[str] = mapped_column(String(120))
    tipo_contrato: Mapped[str] = mapped_column(String(20))
    horas_max_semanales: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Espacio(Base):
    __tablename__ = "espacio"

    espacio_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    codigo_espacio: Mapped[str] = mapped_column(String(20))
    nombre_espacio: Mapped[str] = mapped_column(String(80))
    tipo_espacio: Mapped[str] = mapped_column(String(20))
    capacidad: Mapped[int] = mapped_column(Integer)
    edificio: Mapped[str] = mapped_column(String(50), nullable=True)
    piso: Mapped[int] = mapped_column(Integer, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Asignatura(Base):
    __tablename__ = "asignatura"

    asignatura_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    codigo_asignatura: Mapped[str] = mapped_column(String(20))
    nombre_asignatura: Mapped[str] = mapped_column(String(120))
    modalidad: Mapped[str] = mapped_column(String(20))
    requiere_laboratorio: Mapped[bool] = mapped_column(Boolean, default=False)
    tipo_espacio_requerido: Mapped[str] = mapped_column(String(20), nullable=True)
    horas_semanales: Mapped[int] = mapped_column(Integer)
    cupo_estimado: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Paralelo(Base):
    __tablename__ = "paralelo"

    paralelo_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    asignatura_id: Mapped[str] = mapped_column(ForeignKey("asignatura.asignatura_id"))
    codigo_paralelo: Mapped[str] = mapped_column(String(10))
    carrera: Mapped[str] = mapped_column(String(60))
    nivel: Mapped[int] = mapped_column(Integer)
    jornada: Mapped[str] = mapped_column(String(20))
    numero_estudiantes: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Distributivo(Base):
    __tablename__ = "distributivo"

    distributivo_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    docente_id: Mapped[str] = mapped_column(ForeignKey("docente.docente_id"))
    asignatura_id: Mapped[str] = mapped_column(ForeignKey("asignatura.asignatura_id"))
    paralelo_id: Mapped[str] = mapped_column(ForeignKey("paralelo.paralelo_id"))
    periodo_academico: Mapped[str] = mapped_column(String(10))
    horas_asignadas: Mapped[int] = mapped_column(Integer)
    observacion: Mapped[str] = mapped_column(String(200), nullable=True)


class DisponibilidadDocente(Base):
    __tablename__ = "disponibilidad_docente"

    disponibilidad_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    docente_id: Mapped[str] = mapped_column(ForeignKey("docente.docente_id"))
    dia_semana: Mapped[str] = mapped_column(String(10))
    hora_inicio = mapped_column(Time)
    hora_fin = mapped_column(Time)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True)


class Horario(Base):
    __tablename__ = "horario"

    horario_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asignatura_id: Mapped[str] = mapped_column(ForeignKey("asignatura.asignatura_id"))
    paralelo_id: Mapped[str] = mapped_column(ForeignKey("paralelo.paralelo_id"))
    docente_id: Mapped[str] = mapped_column(ForeignKey("docente.docente_id"))
    espacio_id: Mapped[str] = mapped_column(ForeignKey("espacio.espacio_id"))
    dia_semana: Mapped[str] = mapped_column(String(10))
    hora_inicio = mapped_column(Time)
    hora_fin = mapped_column(Time)
    modalidad: Mapped[str] = mapped_column(String(20))
