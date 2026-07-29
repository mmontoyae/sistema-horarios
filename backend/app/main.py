from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import importacion, horarios
from app.services import consultas

app = FastAPI(
    title="Sistema de Horarios Universitarios",
    description="Proyecto de aula - Programacion Funcional - Software 5/1 UPSE",
    version="1.0.0",
)

# comunicacion con el frontend Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(importacion.router)
app.include_router(horarios.router)


@app.get("/")
def raiz():
    return {"mensaje": "API del sistema de horarios funcionando"}


@app.get("/catalogos")
def obtener_catalogos(db: Session = Depends(get_db)):
    """Catalogos cargados en la BD, usados por el frontend para los combos."""
    return consultas.cargar_datos(db)
