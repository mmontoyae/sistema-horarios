import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ------------------------------------------------------------------
# Conexion a SQL Server.
#
# Local: usa autenticacion de Windows contra la instancia de la maquina.
# Nube:  se define la variable de entorno DATABASE_URL con la cadena
#        completa de Azure SQL, por ejemplo:
#        mssql+pyodbc://usuario:clave@servidor.database.windows.net/horarios_upse
#            ?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes
# ------------------------------------------------------------------

SERVIDOR = os.getenv("DB_SERVIDOR", "localhost")
BASE = os.getenv("DB_NOMBRE", "horarios_upse")
DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

URL = os.getenv("DATABASE_URL") or (
    f"mssql+pyodbc://@{SERVIDOR}/{BASE}"
    f"?driver={DRIVER.replace(' ', '+')}&trusted_connection=yes"
)

engine = create_engine(URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
