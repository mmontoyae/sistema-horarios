-- =============================================================
-- Sistema de Horarios Universitarios
-- Script de base de datos para SQL Server
-- Materia: Programacion Funcional - Software 5/1
-- =============================================================

IF DB_ID('horarios_upse') IS NULL
BEGIN
    CREATE DATABASE horarios_upse;
END
GO

USE horarios_upse;
GO

-- =============================================================
-- 1. TABLAS
-- =============================================================

IF OBJECT_ID('dbo.disponibilidad_docente') IS NOT NULL DROP TABLE dbo.disponibilidad_docente;
IF OBJECT_ID('dbo.horario') IS NOT NULL DROP TABLE dbo.horario;
IF OBJECT_ID('dbo.distributivo') IS NOT NULL DROP TABLE dbo.distributivo;
IF OBJECT_ID('dbo.paralelo') IS NOT NULL DROP TABLE dbo.paralelo;
IF OBJECT_ID('dbo.asignatura') IS NOT NULL DROP TABLE dbo.asignatura;
IF OBJECT_ID('dbo.espacio') IS NOT NULL DROP TABLE dbo.espacio;
IF OBJECT_ID('dbo.docente') IS NOT NULL DROP TABLE dbo.docente;
GO

CREATE TABLE dbo.docente (
    docente_id          VARCHAR(20)  NOT NULL PRIMARY KEY,
    cedula              VARCHAR(13)  NOT NULL UNIQUE,
    nombres             VARCHAR(80)  NOT NULL,
    apellidos           VARCHAR(80)  NOT NULL,
    correo              VARCHAR(120) NOT NULL,
    tipo_contrato       VARCHAR(20)  NOT NULL,
    horas_max_semanales INT          NOT NULL,
    activo              BIT          NOT NULL DEFAULT 1,
    CONSTRAINT ck_docente_contrato CHECK (tipo_contrato IN ('TIEMPO_COMPLETO','MEDIO_TIEMPO','TIEMPO_PARCIAL')),
    CONSTRAINT ck_docente_horas CHECK (horas_max_semanales > 0)
);

CREATE TABLE dbo.espacio (
    espacio_id     VARCHAR(20) NOT NULL PRIMARY KEY,
    codigo_espacio VARCHAR(20) NOT NULL UNIQUE,
    nombre_espacio VARCHAR(80) NOT NULL,
    tipo_espacio   VARCHAR(20) NOT NULL,
    capacidad      INT         NOT NULL,
    edificio       VARCHAR(50) NULL,
    piso           INT         NULL,
    activo         BIT         NOT NULL DEFAULT 1,
    CONSTRAINT ck_espacio_tipo CHECK (tipo_espacio IN ('AULA','LABORATORIO','AULA_COMPUTO')),
    CONSTRAINT ck_espacio_capacidad CHECK (capacidad > 0)
);

CREATE TABLE dbo.asignatura (
    asignatura_id          VARCHAR(20)  NOT NULL PRIMARY KEY,
    codigo_asignatura      VARCHAR(20)  NOT NULL UNIQUE,
    nombre_asignatura      VARCHAR(120) NOT NULL,
    modalidad              VARCHAR(20)  NOT NULL,
    requiere_laboratorio   BIT          NOT NULL DEFAULT 0,
    tipo_espacio_requerido VARCHAR(20)  NULL,
    horas_semanales        INT          NOT NULL,
    cupo_estimado          INT          NOT NULL,
    activo                 BIT          NOT NULL DEFAULT 1,
    CONSTRAINT ck_asignatura_modalidad CHECK (modalidad IN ('PRESENCIAL','HIBRIDA','ONLINE')),
    CONSTRAINT ck_asignatura_tipo_esp CHECK (tipo_espacio_requerido IS NULL OR tipo_espacio_requerido IN ('AULA','LABORATORIO','AULA_COMPUTO'))
);

CREATE TABLE dbo.paralelo (
    paralelo_id        VARCHAR(20) NOT NULL PRIMARY KEY,
    asignatura_id      VARCHAR(20) NOT NULL,
    codigo_paralelo    VARCHAR(10) NOT NULL,
    carrera            VARCHAR(60) NOT NULL,
    nivel              INT         NOT NULL,
    jornada            VARCHAR(20) NOT NULL,
    numero_estudiantes INT         NOT NULL,
    activo             BIT         NOT NULL DEFAULT 1,
    CONSTRAINT fk_paralelo_asignatura FOREIGN KEY (asignatura_id) REFERENCES dbo.asignatura(asignatura_id)
);

CREATE TABLE dbo.distributivo (
    distributivo_id   VARCHAR(20) NOT NULL PRIMARY KEY,
    docente_id        VARCHAR(20) NOT NULL,
    asignatura_id     VARCHAR(20) NOT NULL,
    paralelo_id       VARCHAR(20) NOT NULL,
    periodo_academico VARCHAR(10) NOT NULL,
    horas_asignadas   INT         NOT NULL,
    observacion       VARCHAR(200) NULL,
    CONSTRAINT fk_dist_docente FOREIGN KEY (docente_id) REFERENCES dbo.docente(docente_id),
    CONSTRAINT fk_dist_asignatura FOREIGN KEY (asignatura_id) REFERENCES dbo.asignatura(asignatura_id),
    CONSTRAINT fk_dist_paralelo FOREIGN KEY (paralelo_id) REFERENCES dbo.paralelo(paralelo_id)
);

CREATE TABLE dbo.disponibilidad_docente (
    disponibilidad_id VARCHAR(20) NOT NULL PRIMARY KEY,
    docente_id        VARCHAR(20) NOT NULL,
    dia_semana        VARCHAR(10) NOT NULL,
    hora_inicio       TIME        NOT NULL,
    hora_fin          TIME        NOT NULL,
    disponible        BIT         NOT NULL DEFAULT 1,
    CONSTRAINT fk_disp_docente FOREIGN KEY (docente_id) REFERENCES dbo.docente(docente_id),
    CONSTRAINT ck_disp_dia CHECK (dia_semana IN ('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO')),
    CONSTRAINT ck_disp_horas CHECK (hora_inicio < hora_fin)
);

-- bloques de horario ya confirmados (lo que ocupa aulas y docentes)
CREATE TABLE dbo.horario (
    horario_id    INT IDENTITY(1,1) PRIMARY KEY,
    asignatura_id VARCHAR(20) NOT NULL,
    paralelo_id   VARCHAR(20) NOT NULL,
    docente_id    VARCHAR(20) NOT NULL,
    espacio_id    VARCHAR(20) NOT NULL,
    dia_semana    VARCHAR(10) NOT NULL,
    hora_inicio   TIME        NOT NULL,
    hora_fin      TIME        NOT NULL,
    modalidad     VARCHAR(20) NOT NULL,
    CONSTRAINT fk_hor_asignatura FOREIGN KEY (asignatura_id) REFERENCES dbo.asignatura(asignatura_id),
    CONSTRAINT fk_hor_paralelo FOREIGN KEY (paralelo_id) REFERENCES dbo.paralelo(paralelo_id),
    CONSTRAINT fk_hor_docente FOREIGN KEY (docente_id) REFERENCES dbo.docente(docente_id),
    CONSTRAINT fk_hor_espacio FOREIGN KEY (espacio_id) REFERENCES dbo.espacio(espacio_id),
    CONSTRAINT ck_hor_dia CHECK (dia_semana IN ('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO')),
    CONSTRAINT ck_hor_horas CHECK (hora_inicio < hora_fin)
);
GO

-- =============================================================
-- 2. FUNCIONES DE VALIDACION
-- =============================================================

-- ¿el docente esta disponible en ese dia y rango de horas?
CREATE OR ALTER FUNCTION dbo.fn_docente_disponible (
    @docente_id  VARCHAR(20),
    @dia         VARCHAR(10),
    @hora_inicio TIME,
    @hora_fin    TIME
)
RETURNS BIT
AS
BEGIN
    DECLARE @resultado BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM dbo.disponibilidad_docente
        WHERE docente_id = @docente_id
          AND dia_semana = @dia
          AND disponible = 1
          AND hora_inicio <= @hora_inicio
          AND hora_fin >= @hora_fin
    )
        SET @resultado = 1;

    RETURN @resultado;
END;
GO

-- ¿el espacio ya esta ocupado en esa franja? (traslape de intervalos)
CREATE OR ALTER FUNCTION dbo.fn_espacio_ocupado (
    @espacio_id  VARCHAR(20),
    @dia         VARCHAR(10),
    @hora_inicio TIME,
    @hora_fin    TIME
)
RETURNS BIT
AS
BEGIN
    DECLARE @resultado BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM dbo.horario
        WHERE espacio_id = @espacio_id
          AND dia_semana = @dia
          AND hora_inicio < @hora_fin
          AND hora_fin > @hora_inicio
    )
        SET @resultado = 1;

    RETURN @resultado;
END;
GO

-- ¿el docente ya tiene clase en esa franja?
CREATE OR ALTER FUNCTION dbo.fn_docente_ocupado (
    @docente_id  VARCHAR(20),
    @dia         VARCHAR(10),
    @hora_inicio TIME,
    @hora_fin    TIME
)
RETURNS BIT
AS
BEGIN
    DECLARE @resultado BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM dbo.horario
        WHERE docente_id = @docente_id
          AND dia_semana = @dia
          AND hora_inicio < @hora_fin
          AND hora_fin > @hora_inicio
    )
        SET @resultado = 1;

    RETURN @resultado;
END;
GO

-- ¿el tipo de espacio es compatible con lo que pide la asignatura?
CREATE OR ALTER FUNCTION dbo.fn_espacio_compatible (
    @asignatura_id VARCHAR(20),
    @espacio_id    VARCHAR(20)
)
RETURNS BIT
AS
BEGIN
    DECLARE @tipo_requerido VARCHAR(20);
    DECLARE @tipo_espacio   VARCHAR(20);
    DECLARE @resultado BIT = 0;

    SELECT @tipo_requerido = tipo_espacio_requerido FROM dbo.asignatura WHERE asignatura_id = @asignatura_id;
    SELECT @tipo_espacio = tipo_espacio FROM dbo.espacio WHERE espacio_id = @espacio_id;

    IF @tipo_requerido IS NULL OR @tipo_requerido = @tipo_espacio
        SET @resultado = 1;

    RETURN @resultado;
END;
GO

-- horas ya planificadas del docente en la semana + horas del bloque nuevo
CREATE OR ALTER FUNCTION dbo.fn_carga_horaria_docente (
    @docente_id  VARCHAR(20),
    @horas_nuevas DECIMAL(5,2)
)
RETURNS DECIMAL(5,2)
AS
BEGIN
    DECLARE @horas_actuales DECIMAL(5,2);

    SELECT @horas_actuales = ISNULL(SUM(DATEDIFF(MINUTE, hora_inicio, hora_fin) / 60.0), 0)
    FROM dbo.horario
    WHERE docente_id = @docente_id;

    RETURN @horas_actuales + @horas_nuevas;
END;
GO

-- =============================================================
-- 3. PROCEDIMIENTO ALMACENADO PRINCIPAL
--    Valida una propuesta de horario y devuelve los conflictos
-- =============================================================

CREATE OR ALTER PROCEDURE dbo.sp_validar_propuesta_horario
    @asignatura_id VARCHAR(20),
    @paralelo_id   VARCHAR(20),
    @docente_id    VARCHAR(20),
    @espacio_id    VARCHAR(20),
    @dia_semana    VARCHAR(10),
    @hora_inicio   TIME,
    @hora_fin      TIME,
    @modalidad     VARCHAR(20),
    @confirmar     BIT = 0   -- si es 1 y no hay conflictos, inserta el bloque
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @conflictos TABLE (
        codigo  VARCHAR(40),
        detalle VARCHAR(300)
    );

    DECLARE @horas_bloque DECIMAL(5,2) = DATEDIFF(MINUTE, @hora_inicio, @hora_fin) / 60.0;
    DECLARE @horas_max INT;
    DECLARE @capacidad INT;
    DECLARE @estudiantes INT;

    -- 1. distributivo: la combinacion docente-asignatura-paralelo debe existir
    IF NOT EXISTS (
        SELECT 1 FROM dbo.distributivo
        WHERE docente_id = @docente_id
          AND asignatura_id = @asignatura_id
          AND paralelo_id = @paralelo_id
    )
        INSERT INTO @conflictos VALUES ('DISTRIBUTIVO_INVALIDO',
            'La combinacion docente/asignatura/paralelo no existe en el distributivo');

    -- 2. disponibilidad del docente
    IF dbo.fn_docente_disponible(@docente_id, @dia_semana, @hora_inicio, @hora_fin) = 0
        INSERT INTO @conflictos VALUES ('FUERA_DISPONIBILIDAD',
            'El bloque esta fuera de la disponibilidad declarada del docente ' + @docente_id);

    -- 3. docente ocupado en otra clase
    IF dbo.fn_docente_ocupado(@docente_id, @dia_semana, @hora_inicio, @hora_fin) = 1
        INSERT INTO @conflictos VALUES ('DOCENTE_OCUPADO',
            'El docente ' + @docente_id + ' ya tiene una clase en esa franja');

    -- 4. espacio ocupado
    IF dbo.fn_espacio_ocupado(@espacio_id, @dia_semana, @hora_inicio, @hora_fin) = 1
        INSERT INTO @conflictos VALUES ('ESPACIO_OCUPADO',
            'El espacio ' + @espacio_id + ' ya esta ocupado en esa franja');

    -- 5. compatibilidad del espacio
    IF dbo.fn_espacio_compatible(@asignatura_id, @espacio_id) = 0
        INSERT INTO @conflictos VALUES ('ESPACIO_INCOMPATIBLE',
            'El tipo de espacio no es compatible con lo que requiere la asignatura');

    -- 6. carga horaria maxima del docente
    SELECT @horas_max = horas_max_semanales FROM dbo.docente WHERE docente_id = @docente_id;
    IF dbo.fn_carga_horaria_docente(@docente_id, @horas_bloque) > @horas_max
        INSERT INTO @conflictos VALUES ('EXCESO_CARGA',
            'El bloque hace que el docente supere sus ' + CAST(@horas_max AS VARCHAR) + ' horas semanales');

    -- 7. capacidad del espacio vs estudiantes del paralelo
    SELECT @capacidad = capacidad FROM dbo.espacio WHERE espacio_id = @espacio_id;
    SELECT @estudiantes = numero_estudiantes FROM dbo.paralelo WHERE paralelo_id = @paralelo_id;
    IF @estudiantes > @capacidad
        INSERT INTO @conflictos VALUES ('CAPACIDAD_INSUFICIENTE',
            'El paralelo tiene ' + CAST(@estudiantes AS VARCHAR) + ' estudiantes y el espacio solo soporta ' + CAST(@capacidad AS VARCHAR));

    -- insercion opcional si la propuesta es valida
    IF @confirmar = 1 AND NOT EXISTS (SELECT 1 FROM @conflictos)
    BEGIN
        INSERT INTO dbo.horario (asignatura_id, paralelo_id, docente_id, espacio_id, dia_semana, hora_inicio, hora_fin, modalidad)
        VALUES (@asignatura_id, @paralelo_id, @docente_id, @espacio_id, @dia_semana, @hora_inicio, @hora_fin, @modalidad);
    END

    -- resultado: estado general + lista de conflictos
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM @conflictos) THEN 'INVALIDO' ELSE 'VALIDO' END AS estado;

    SELECT codigo, detalle FROM @conflictos;
END;
GO

PRINT 'Base de datos horarios_upse creada correctamente';
