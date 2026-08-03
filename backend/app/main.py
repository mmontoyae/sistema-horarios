import os
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

# Origenes permitidos. En local es el servidor de Angular; en produccion se
# define la variable de entorno ORIGENES_PERMITIDOS con las URL separadas
# por coma, por ejemplo: https://sistema-horarios.vercel.app
ORIGENES_LOCALES = ["http://localhost:4200", "http://127.0.0.1:4200"]
ORIGENES_EXTRA = [
    o.strip() for o in os.getenv("ORIGENES_PERMITIDOS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_LOCALES + ORIGENES_EXTRA,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(importacion.router)
app.include_router(horarios.router)


@app.get("/")
def raiz():
    return {"mensaje": "API del sistema de horarios funcionando"}


@app.get("/salud")
def salud():
    """Endpoint simple para que el servicio de hosting verifique que esta vivo."""
    return {"estado": "ok"}


@app.get("/catalogos")
def obtener_catalogos(db: Session = Depends(get_db)):
    """Catalogos cargados en la BD, usados por el frontend para los combos."""
    return consultas.cargar_datos(db)
