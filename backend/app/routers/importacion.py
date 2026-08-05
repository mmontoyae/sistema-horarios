from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/import", tags=["Importacion"])


def _guardar(db: Session, modelo, filas: list[dict], clave: str) -> schemas.ResumenImportacion:
    """
    Inserta o actualiza las filas recibidas.

    Se resuelve con tres consultas en total, en lugar de una por fila:
    una para saber que identificadores ya existen, una insercion masiva y
    una actualizacion masiva. Con cargas grandes la diferencia es enorme,
    porque el enfoque fila por fila hace miles de viajes a la base.
    """
    if not filas:
        return schemas.ResumenImportacion(entidad=modelo.__tablename__, procesados=0, errores=[])

    errores: list[str] = []

    # se descartan los identificadores repetidos dentro del propio archivo,
    # conservando la ultima aparicion
    unicas: dict = {}
    for fila in filas:
        identificador = fila.get(clave)
        if identificador is None:
            errores.append(f"Fila sin {clave}, se omite")
            continue
        if identificador in unicas:
            errores.append(f"{identificador}: repetido en el archivo, se usa el ultimo")
        unicas[identificador] = fila

    if not unicas:
        return schemas.ResumenImportacion(entidad=modelo.__tablename__, procesados=0, errores=errores)

    columna = getattr(modelo, clave)
    identificadores = list(unicas.keys())

    # 1. una sola consulta para saber cuales ya estan en la base;
    #    se trocea porque SQL Server limita los parametros de un IN
    existentes: set = set()
    for i in range(0, len(identificadores), 1000):
        lote = identificadores[i:i + 1000]
        existentes.update(db.scalars(select(columna).where(columna.in_(lote))).all())

    nuevos = [f for k, f in unicas.items() if k not in existentes]
    modificados = [f for k, f in unicas.items() if k in existentes]

    try:
        # 2. insercion masiva
        if nuevos:
            db.bulk_insert_mappings(modelo, nuevos)
        # 3. actualizacion masiva
        if modificados:
            db.bulk_update_mappings(modelo, modificados)
        db.commit()
    except Exception as e:
        db.rollback()
        errores.append(f"Error al guardar: {e}")
        return schemas.ResumenImportacion(entidad=modelo.__tablename__, procesados=0, errores=errores)

    return schemas.ResumenImportacion(
        entidad=modelo.__tablename__,
        procesados=len(unicas),
        errores=errores,
    )


@router.post("/docentes", response_model=schemas.ResumenImportacion)
def importar_docentes(datos: list[schemas.DocenteIn], db: Session = Depends(get_db)):
    return _guardar(db, models.Docente, [d.model_dump() for d in datos], "docente_id")


@router.post("/espacios", response_model=schemas.ResumenImportacion)
def importar_espacios(datos: list[schemas.EspacioIn], db: Session = Depends(get_db)):
    return _guardar(db, models.Espacio, [d.model_dump() for d in datos], "espacio_id")


@router.post("/asignaturas", response_model=schemas.ResumenImportacion)
def importar_asignaturas(datos: list[schemas.AsignaturaIn], db: Session = Depends(get_db)):
    return _guardar(db, models.Asignatura, [d.model_dump() for d in datos], "asignatura_id")


@router.post("/paralelos", response_model=schemas.ResumenImportacion)
def importar_paralelos(datos: list[schemas.ParaleloIn], db: Session = Depends(get_db)):
    return _guardar(db, models.Paralelo, [d.model_dump() for d in datos], "paralelo_id")


@router.post("/distributivo", response_model=schemas.ResumenImportacion)
def importar_distributivo(datos: list[schemas.DistributivoIn], db: Session = Depends(get_db)):
    return _guardar(db, models.Distributivo, [d.model_dump() for d in datos], "distributivo_id")


@router.delete("/todo")
def borrar_todo(db: Session = Depends(get_db)):
    """
    Vacia todas las tablas de insumos y tambien el horario.

    El orden importa: primero las tablas que dependen de otras, para no
    violar las claves foraneas.
    """
    orden = [
        models.Horario,
        models.DisponibilidadDocente,
        models.Distributivo,
        models.Paralelo,
        models.Asignatura,
        models.Espacio,
        models.Docente,
    ]

    resumen = {}
    for modelo in orden:
        resumen[modelo.__tablename__] = db.query(modelo).delete()

    db.commit()
    return {"mensaje": "datos eliminados", "detalle": resumen}


@router.post("/disponibilidad", response_model=schemas.ResumenImportacion)
def importar_disponibilidad(datos: list[schemas.DisponibilidadIn], db: Session = Depends(get_db)):
    filas = []
    for d in datos:
        fila = d.model_dump()
        fila["hora_inicio"] = datetime.strptime(fila["hora_inicio"], "%H:%M").time()
        fila["hora_fin"] = datetime.strptime(fila["hora_fin"], "%H:%M").time()
        filas.append(fila)
    return _guardar(db, models.DisponibilidadDocente, filas, "disponibilidad_id")
