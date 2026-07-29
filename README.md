# Sistema de Horarios Universitarios

Proyecto de aula de la materia **Programación Funcional** — Ingeniería en Software 5/1, Universidad Estatal Península de Santa Elena (UPSE).

**Integrantes:** Emily Cruz · Daniel Parrales · Daniel Tomala · Miguel Montoya

Sistema web para la gestión, proyección y validación de horarios académicos. Permite cargar los insumos desde archivos Excel, construir propuestas de horario y detectar automáticamente los conflictos académicos y operativos.

## Estructura

```
sistema-horarios/
├── database/    script SQL Server (tablas, funciones y stored procedure)
├── backend/     API REST en FastAPI + SQLAlchemy
├── frontend/    aplicación Angular 17 (standalone components)
├── datos/       archivo insumos_horarios.xlsx de prueba
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

1. **Importar datos** — cargar `datos/insumos_horarios.xlsx` y enviarlo al backend.
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
