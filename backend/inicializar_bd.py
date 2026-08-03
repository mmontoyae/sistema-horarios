"""
Prepara la base de datos dentro del contenedor de SQL Server.

Espera a que el motor acepte conexiones y ejecuta database/script_horarios.sql
lote por lote (separando por GO). Se usa pyodbc, que ya viene instalado en la
imagen del backend, para no depender de que la imagen de SQL Server incluya
las herramientas de linea de comandos.

Es idempotente: el script usa CREATE OR ALTER y comprueba la existencia de la
base, de modo que puede ejecutarse varias veces sin romper nada.
"""
import os
import sys
import time
import pyodbc

CLAVE = os.getenv("CLAVE_SA", "")
SERVIDOR = os.getenv("BD_HOST", "bd")
RUTA_SCRIPT = os.getenv("RUTA_SCRIPT", "/scripts/script_horarios.sql")
INTENTOS = int(os.getenv("INTENTOS", "40"))

CADENA_MASTER = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    f"SERVER={SERVIDOR},1433;DATABASE=master;UID=sa;PWD={CLAVE};"
    "Encrypt=yes;TrustServerCertificate=yes;"
)


def esperar_motor():
    """Reintenta hasta que SQL Server acepte conexiones."""
    for intento in range(1, INTENTOS + 1):
        try:
            conexion = pyodbc.connect(CADENA_MASTER, timeout=5, autocommit=True)
            print(f"SQL Server respondio en el intento {intento}")
            return conexion
        except pyodbc.Error as error:
            print(f"Intento {intento}/{INTENTOS}: la base todavia no responde")
            if intento == INTENTOS:
                print(f"No se pudo conectar: {error}")
                sys.exit(1)
            time.sleep(5)
    return None


def separar_lotes(contenido: str) -> list[str]:
    """Divide el script en los lotes delimitados por GO."""
    lotes = []
    actual: list[str] = []

    for linea in contenido.splitlines():
        if linea.strip().upper() == "GO":
            texto = "\n".join(actual).strip()
            if texto:
                lotes.append(texto)
            actual = []
        else:
            actual.append(linea)

    texto = "\n".join(actual).strip()
    if texto:
        lotes.append(texto)

    return lotes


def ya_inicializada(cursor) -> bool:
    """True si la base y sus tablas ya existen."""
    cursor.execute("SELECT DB_ID('horarios_upse')")
    if cursor.fetchone()[0] is None:
        return False

    cursor.execute(
        "SELECT COUNT(*) FROM horarios_upse.sys.tables WHERE name = 'docente'"
    )
    return cursor.fetchone()[0] > 0


def main():
    if not CLAVE:
        print("Falta la variable CLAVE_SA")
        sys.exit(1)

    conexion = esperar_motor()
    cursor = conexion.cursor()

    # el script empieza borrando las tablas, asi que no se vuelve a ejecutar
    # sobre una base ya creada salvo que se pida expresamente
    forzar = os.getenv("FORZAR_RECREACION", "").lower() in ("1", "true", "si")

    if ya_inicializada(cursor) and not forzar:
        print("La base ya estaba creada, no se hace nada")
        print("Para recrearla desde cero: FORZAR_RECREACION=1")
        cursor.close()
        conexion.close()
        return

    with open(RUTA_SCRIPT, encoding="utf-8") as archivo:
        lotes = separar_lotes(archivo.read())

    print(f"Ejecutando {len(lotes)} lotes del script")

    for numero, lote in enumerate(lotes, start=1):
        try:
            cursor.execute(lote)
            while cursor.nextset():
                pass
        except pyodbc.Error as error:
            print(f"Error en el lote {numero}: {error}")
            print(lote[:200])
            sys.exit(1)

    cursor.close()
    conexion.close()
    print("Base de datos lista")


if __name__ == "__main__":
    main()
