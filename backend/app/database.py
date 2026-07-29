from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# conexion a SQL Server local (autenticacion de Windows)
# si se usa usuario y clave: mssql+pyodbc://usuario:clave@localhost/horarios_upse?driver=...
SERVIDOR = "localhost"
BASE = "horarios_upse"
DRIVER = "ODBC Driver 17 for SQL Server"

URL = f"mssql+pyodbc://@{SERVIDOR}/{BASE}?driver={DRIVER.replace(' ', '+')}&trusted_connection=yes"

engine = create_engine(URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
