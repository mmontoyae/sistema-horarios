# Imagen del backend. Incluye el driver ODBC 18 para conectarse a SQL Server.
# Se usa tanto en la instancia EC2 (docker compose) como en cualquier
# servicio de hosting que soporte Docker.

FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    ACCEPT_EULA=Y \
    PYTHONUNBUFFERED=1

# driver ODBC de Microsoft para SQL Server
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg apt-transport-https ca-certificates unixodbc-dev gcc g++ \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
        > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update && apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY inicializar_bd.py .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
