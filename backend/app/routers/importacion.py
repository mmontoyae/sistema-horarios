from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/import", tags=["Importacion"])


def _guardar(db: Session, modelo, filas: list[dict], clave: str) -> schemas.ResumenImportacion:
    """Inserta o actualiza cada fila y devuelve un resumen."""
    procesados = 0
    errores = []
    for fila in filas:
        try:
            existente = db.get(modelo, fila[clave])
            if existente:
                for campo, valor in fila.items():
                    setattr(existente, campo, valor)
            else:
                db.add(modelo(**fila))
            procesados += 1
        except Exception as e:
            errores.append(f"{fila.get(clave, '?')}: {e}")
    db.commit()
    return schemas.ResumenImportacion(entidad=modelo.__tablename__, procesados=procesados, errores=errores)


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
