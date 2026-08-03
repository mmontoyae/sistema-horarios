# Sistema de Horarios Universitarios

Proyecto de aula de la materia **Programación Funcional** — Ingeniería en Software 5/1, Universidad Estatal Península de Santa Elena (UPSE).

**Integrantes:** Emily Cruz · Daniel Parrales · Daniel Tomala · Miguel Montoya

Sistema web para la gestión, proyección y validación de horarios académicos. Permite cargar los insumos desde archivos Excel, construir propuestas de horario y detectar automáticamente los conflictos académicos y operativos.

## Estructura

```
sistema-horarios/
├── database/           script SQL Server (tablas, funciones y stored procedure)
├── backend/            API REST en FastAPI + SQLAlchemy
├── frontend/           aplicación Angular 17 (standalone components)
├── datos/              archivo insumos_horarios.xlsx de prueba
├── docker-compose.yml  despliegue completo en una instancia EC2
└── Documento_Tecnico_Sistema_Horarios.docx
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 17 (standalone), RxJS, xlsx |
| Backend | Python 3.11+, FastAPI, Pydantic, SQLAlchemy 2.0 |
| Base de datos | Microsoft SQL Server (pyodbc) |
| Pruebas | pytest |

## Puesta en marcha

### 1. Base de datos

Ejecutar `database/script_horarios.sql` en SQL Server (SSMS o Azure Data Studio). Crea la base `horarios_upse` con sus tablas, cinco funciones de validación y el procedimiento almacenado `sp_validar_propuesta_horario`.

Requiere el **ODBC Driver 17 for SQL Server**. Si la instancia no usa autenticación de Windows o es SQLEXPRESS, ajustar la cadena de conexión en `backend/app/database.py`.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación de la API en `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Aplicación disponible en `http://localhost:4200`.

### Pruebas unitarias

```bash
cd backend
pytest -v
```

Las pruebas cubren la lógica de validación (funciones puras), por lo que no requieren la base de datos ni el servidor levantados.

## Flujo de uso

0. **Inicio** — pantalla de presentación con fondo 3D interactivo.
1. **Importar datos** — arrastrar `datos/insumos_horarios.xlsx` a cualquier parte de la pantalla (o seleccionarlo) y enviarlo al backend.
2. **Propuesta de horario** — armar un bloque (asignatura, paralelo, docente, espacio, día y horas) y validarlo. Si se marca *confirmar*, los bloques válidos se guardan mediante el procedimiento almacenado.
3. **Horario y conflictos** — matriz semanal con los bloques confirmados y listado de conflictos, con los bloques inconsistentes marcados en rojo.

## Validaciones implementadas

- la combinación docente/asignatura/paralelo debe existir en el distributivo
- el bloque debe estar dentro de la disponibilidad declarada del docente
- un docente no puede dictar dos clases en la misma franja
- un espacio no puede ser asignado a dos clases en la misma franja
- el tipo de espacio debe ser compatible con el requerido por la asignatura
- el bloque no puede exceder la carga horaria semanal del docente
- la capacidad del espacio debe cubrir el número de estudiantes del paralelo

## Enfoque funcional

La lógica de validación (`backend/app/services/validaciones.py`) está escrita con **funciones puras**: reciben la propuesta y los catálogos como argumentos, no modifican ninguna estructura y devuelven siempre una lista de conflictos. La validación completa se resuelve por **composición**, aplicando un pipeline de funciones y combinando sus resultados. Esto hace que la lógica sea determinista y comprobable de forma aislada.

Las mismas reglas están implementadas también en la base de datos mediante funciones y un procedimiento almacenado, de modo que SQL Server actúa como última barrera de integridad.

## Interfaz

La aplicación usa un tema oscuro con acento verde y la tipografía **Sora**. La pantalla de inicio incorpora una escena 3D como fondo mediante `spline-viewer`, cargada desde CDN (no requiere dependencias adicionales en `package.json`).

La carga del archivo Excel admite dos formas: seleccionarlo con el botón o **arrastrarlo y soltarlo** sobre cualquier punto de la ventana, que muestra una zona de destino resaltada mientras se arrastra.

## Despliegue en la web

El sistema completo se levanta en una instancia **AWS EC2** con un solo comando:

```bash
cp .env.ejemplo .env    # y cambiar la contraseña
docker compose up -d --build
```

Esto arranca SQL Server 2022 Express, el backend y Nginx sirviendo el frontend. Nginx redirige `/api` al backend, así que ambos comparten dominio y no hace falta configurar CORS ni fijar la IP en el código.

Los pasos completos —crear la instancia, desplegar y **eliminar todos los recursos al terminar** para no generar cobros— están en [DESPLIEGUE.md](DESPLIEGUE.md).

### Entornos

| Configuración | Archivo | URL de la API |
|---|---|---|
| Desarrollo local | `environment.ts` | `http://localhost:8000` |
| Producción (EC2) | `environment.ec2.ts` | `/api` (a través de Nginx) |
| Demostración | `environment.demo.ts` | sin backend |

El backend lee `DATABASE_URL` y `ORIGENES_PERMITIDOS` desde variables de entorno, y la contraseña de la base vive en `.env`, que no se sube al repositorio.

### Demostración sin servidor

`npm run build:demo` genera una versión que funciona sin backend: los datos quedan en memoria del navegador y la validación se resuelve con `frontend/src/app/servicios/validaciones.ts`, un espejo en TypeScript de las funciones puras del backend. Una cinta superior avisa que está en ese modo.

Se publica sola en GitHub Pages con el flujo de trabajo `.github/workflows/pages.yml`. Sirve como respaldo visual, pero no reemplaza al sistema completo: no usa FastAPI ni el procedimiento almacenado de SQL Server.
