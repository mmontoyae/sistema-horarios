from collections import deque

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.services import validaciones, consultas, generador

router = APIRouter(prefix="/horarios", tags=["Horarios"])

# Registro en memoria de las validaciones realizadas.
# Se usa una cola con tope: sin limite, cada validacion iria agrandando la
# lista hasta agotar la memoria del proceso en una sesion larga.
MAX_CONFLICTOS = 500
historial_conflictos: deque = deque(maxlen=MAX_CONFLICTOS)


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


@router.post("/generar", response_model=schemas.ResultadoGeneracion)
def generar_automatico(conservar: bool = False, db: Session = Depends(get_db)):
    """
    Arma el horario completo a partir del distributivo academico.

    Por cada asignacion busca dia, hora y espacio donde el bloque no incumpla
    ninguna regla, resolviendo primero las que tienen menos alternativas.
    Con `conservar=true` respeta los bloques ya registrados y solo agrega los
    que falten; de lo contrario reemplaza el horario completo.
    """
    datos = consultas.cargar_datos(db)
    resultado = generador.generar_horario(datos, conservar_existente=conservar)

    if not conservar:
        db.query(models.Horario).delete()

    for bloque in resultado["asignados"]:
        db.add(models.Horario(
            asignatura_id=bloque["asignatura_id"],
            paralelo_id=bloque["paralelo_id"],
            docente_id=bloque["docente_id"],
            espacio_id=bloque["espacio_id"],
            dia_semana=bloque["dia_semana"],
            hora_inicio=datetime.strptime(bloque["hora_inicio"], "%H:%M").time(),
            hora_fin=datetime.strptime(bloque["hora_fin"], "%H:%M").time(),
            modalidad=bloque["modalidad"],
        ))

    db.commit()

    return schemas.ResultadoGeneracion(
        total_asignados=resultado["total_asignados"],
        total_sin_asignar=resultado["total_sin_asignar"],
        sin_asignar=resultado["sin_asignar"],
    )


@router.get("/conflictos", response_model=list[schemas.Conflicto])
def listar_conflictos():
    return list(historial_conflictos)


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


@router.put("/bloque/{horario_id}/mover", response_model=schemas.ResultadoValidacion)
def mover_bloque(horario_id: int, destino: schemas.MovimientoBloque, db: Session = Depends(get_db)):
    """
    Reubica un bloque ya confirmado en otro dia u hora.

    La duracion se conserva. Antes de mover se valida el destino, pero
    excluyendo el propio bloque de los datos: de lo contrario chocaria
    consigo mismo y siempre daria docente y espacio ocupados.

    Si el destino presenta conflictos, no se modifica nada y se devuelven
    para que la interfaz devuelva la tarjeta a su lugar de origen.
    """
    bloque = db.get(models.Horario, horario_id)
    if bloque is None:
        raise HTTPException(status_code=404, detail="El bloque no existe")

    datos = consultas.cargar_datos(db)

    # el bloque que se esta moviendo no cuenta como ocupacion
    datos["horarios"] = [h for h in datos["horarios"] if h["horario_id"] != horario_id]

    duracion = validaciones.a_minutos(bloque.hora_fin.strftime("%H:%M")) - \
               validaciones.a_minutos(bloque.hora_inicio.strftime("%H:%M"))
    inicio = validaciones.a_minutos(destino.hora_inicio)
    fin = inicio + duracion

    if fin > 22 * 60:
        return schemas.ResultadoValidacion(
            estado="INVALIDO",
            total_conflictos=1,
            conflictos=[schemas.Conflicto(
                codigo="FUERA_DE_JORNADA",
                detalle="El bloque no cabe en la jornada si se coloca en esa hora",
                bloque=f"{bloque.asignatura_id}/{bloque.paralelo_id} {destino.dia_semana} {destino.hora_inicio}",
            )],
        )

    hora_fin = f"{fin // 60:02d}:{fin % 60:02d}"

    propuesta = {
        "asignatura_id": bloque.asignatura_id,
        "paralelo_id": bloque.paralelo_id,
        "docente_id": bloque.docente_id,
        "espacio_id": bloque.espacio_id,
        "dia_semana": destino.dia_semana,
        "hora_inicio": destino.hora_inicio,
        "hora_fin": hora_fin,
        "modalidad": bloque.modalidad,
    }

    resultado = validaciones.validar_propuesta(propuesta, datos)

    if resultado["estado"] == "VALIDO":
        bloque.dia_semana = destino.dia_semana
        bloque.hora_inicio = datetime.strptime(destino.hora_inicio, "%H:%M").time()
        bloque.hora_fin = datetime.strptime(hora_fin, "%H:%M").time()
        db.commit()
    else:
        historial_conflictos.extend(resultado["conflictos"])

    return resultado


@router.delete("/bloque/{horario_id}")
def eliminar_bloque(horario_id: int, db: Session = Depends(get_db)):
    """Elimina un solo bloque del horario."""
    bloque = db.get(models.Horario, horario_id)
    if bloque is None:
        raise HTTPException(status_code=404, detail="El bloque no existe")
    db.delete(bloque)
    db.commit()
    return {"mensaje": "bloque eliminado", "horario_id": horario_id}
