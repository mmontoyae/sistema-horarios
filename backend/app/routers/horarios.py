from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.services import validaciones, consultas

router = APIRouter(prefix="/horarios", tags=["Horarios"])

# registro en memoria de las validaciones realizadas en la sesion
historial_conflictos: list[dict] = []


@router.post("/validar", response_model=schemas.ResultadoValidacion)
def validar_propuesta(propuesta: schemas.PropuestaHorario, db: Session = Depends(get_db)):
    datos = consultas.cargar_datos(db)
    resultado = validaciones.validar_propuesta(propuesta.model_dump(), datos)

    # se guarda el resultado para poder consultarlo luego
    historial_conflictos.extend(resultado["conflictos"])

    # si la propuesta es valida y el usuario pidio confirmarla, se guarda
    # usando el procedimiento almacenado (la BD vuelve a validar)
    if resultado["estado"] == "VALIDO" and propuesta.confirmar:
        db.execute(
            text(
                "EXEC dbo.sp_validar_propuesta_horario "
                ":asig, :par, :doc, :esp, :dia, :hini, :hfin, :mod, 1"
            ),
            {
                "asig": propuesta.asignatura_id,
                "par": propuesta.paralelo_id,
                "doc": propuesta.docente_id,
                "esp": propuesta.espacio_id,
                "dia": propuesta.dia_semana,
                "hini": propuesta.hora_inicio,
                "hfin": propuesta.hora_fin,
                "mod": propuesta.modalidad,
            },
        )
        db.commit()

    return resultado


@router.get("/conflictos", response_model=list[schemas.Conflicto])
def listar_conflictos():
    return historial_conflictos


@router.delete("/conflictos")
def limpiar_conflictos():
    historial_conflictos.clear()
    return {"mensaje": "historial limpio"}


@router.get("")
def listar_horario(db: Session = Depends(get_db)):
    """Devuelve los bloques confirmados para armar la matriz semanal."""
    datos = consultas.cargar_datos(db)
    return datos["horarios"]


@router.delete("")
def vaciar_horario(db: Session = Depends(get_db)):
    """Elimina todos los bloques confirmados, sin tocar los insumos."""
    eliminados = db.query(models.Horario).delete()
    db.commit()
    return {"mensaje": "horario vaciado", "eliminados": eliminados}


@router.delete("/bloque/{horario_id}")
def eliminar_bloque(horario_id: int, db: Session = Depends(get_db)):
    """Elimina un solo bloque del horario."""
    bloque = db.get(models.Horario, horario_id)
    if bloque is None:
        raise HTTPException(status_code=404, detail="El bloque no existe")
    db.delete(bloque)
    db.commit()
    return {"mensaje": "bloque eliminado", "horario_id": horario_id}
