/**
 * Datos de ejemplo equivalentes a datos/insumos_horarios.xlsx.
 * Se usan en el modo demostracion para poder probar la interfaz sin cargar
 * el archivo, con la misma estructura de hojas que espera el importador.
 */
export const DATOS_EJEMPLO: { [hoja: string]: any[] } = {
  docentes: [
    { docente_id: 'DOC001', cedula: '0912345671', nombres: 'Ana', apellidos: 'Lopez', correo: 'ana.lopez@upse.edu.ec', tipo_contrato: 'TIEMPO_COMPLETO', horas_max_semanales: 40, activo: true },
    { docente_id: 'DOC002', cedula: '0912345672', nombres: 'Carlos', apellidos: 'Perez', correo: 'carlos.perez@upse.edu.ec', tipo_contrato: 'MEDIO_TIEMPO', horas_max_semanales: 20, activo: true },
    { docente_id: 'DOC003', cedula: '0912345673', nombres: 'Luisa', apellidos: 'Mora', correo: 'luisa.mora@upse.edu.ec', tipo_contrato: 'TIEMPO_PARCIAL', horas_max_semanales: 8, activo: true },
    { docente_id: 'DOC004', cedula: '0912345674', nombres: 'Jorge', apellidos: 'Suarez', correo: 'jorge.suarez@upse.edu.ec', tipo_contrato: 'TIEMPO_COMPLETO', horas_max_semanales: 40, activo: true },
    { docente_id: 'DOC005', cedula: '0912345675', nombres: 'Maria', apellidos: 'Tigrero', correo: 'maria.tigrero@upse.edu.ec', tipo_contrato: 'MEDIO_TIEMPO', horas_max_semanales: 20, activo: true }
  ],
  espacios: [
    { espacio_id: 'ESP001', codigo_espacio: 'A101', nombre_espacio: 'Aula 101', tipo_espacio: 'AULA', capacidad: 40, edificio: 'Bloque A', piso: 1, activo: true },
    { espacio_id: 'ESP002', codigo_espacio: 'A102', nombre_espacio: 'Aula 102', tipo_espacio: 'AULA', capacidad: 35, edificio: 'Bloque A', piso: 1, activo: true },
    { espacio_id: 'ESP003', codigo_espacio: 'LAB201', nombre_espacio: 'Laboratorio de Redes', tipo_espacio: 'LABORATORIO', capacidad: 25, edificio: 'Bloque B', piso: 2, activo: true },
    { espacio_id: 'ESP004', codigo_espacio: 'LAB202', nombre_espacio: 'Laboratorio de Software', tipo_espacio: 'LABORATORIO', capacidad: 30, edificio: 'Bloque B', piso: 2, activo: true },
    { espacio_id: 'ESP005', codigo_espacio: 'C301', nombre_espacio: 'Aula de Computo 301', tipo_espacio: 'AULA_COMPUTO', capacidad: 28, edificio: 'Bloque C', piso: 3, activo: true }
  ],
  asignaturas: [
    { asignatura_id: 'ASI001', codigo_asignatura: 'SOF501', nombre_asignatura: 'Programacion Funcional', modalidad: 'PRESENCIAL', requiere_laboratorio: true, tipo_espacio_requerido: 'LABORATORIO', horas_semanales: 4, cupo_estimado: 30, activo: true },
    { asignatura_id: 'ASI002', codigo_asignatura: 'SOF502', nombre_asignatura: 'Base de Datos Avanzada', modalidad: 'PRESENCIAL', requiere_laboratorio: true, tipo_espacio_requerido: 'LABORATORIO', horas_semanales: 4, cupo_estimado: 30, activo: true },
    { asignatura_id: 'ASI003', codigo_asignatura: 'SOF503', nombre_asignatura: 'Ingenieria de Requisitos', modalidad: 'PRESENCIAL', requiere_laboratorio: false, tipo_espacio_requerido: 'AULA', horas_semanales: 3, cupo_estimado: 35, activo: true },
    { asignatura_id: 'ASI004', codigo_asignatura: 'SOF504', nombre_asignatura: 'Arquitectura de Software', modalidad: 'HIBRIDA', requiere_laboratorio: false, tipo_espacio_requerido: 'AULA', horas_semanales: 3, cupo_estimado: 35, activo: true },
    { asignatura_id: 'ASI005', codigo_asignatura: 'SOF505', nombre_asignatura: 'Redes de Computadoras', modalidad: 'PRESENCIAL', requiere_laboratorio: true, tipo_espacio_requerido: 'LABORATORIO', horas_semanales: 4, cupo_estimado: 25, activo: true }
  ],
  paralelos: [
    { paralelo_id: 'PAR001', asignatura_id: 'ASI001', codigo_paralelo: '5/1', carrera: 'Software', nivel: 5, jornada: 'Matutina', numero_estudiantes: 28, activo: true },
    { paralelo_id: 'PAR002', asignatura_id: 'ASI001', codigo_paralelo: '5/2', carrera: 'Software', nivel: 5, jornada: 'Vespertina', numero_estudiantes: 26, activo: true },
    { paralelo_id: 'PAR003', asignatura_id: 'ASI002', codigo_paralelo: '5/1', carrera: 'Software', nivel: 5, jornada: 'Matutina', numero_estudiantes: 28, activo: true },
    { paralelo_id: 'PAR004', asignatura_id: 'ASI003', codigo_paralelo: '5/1', carrera: 'Software', nivel: 5, jornada: 'Matutina', numero_estudiantes: 32, activo: true },
    { paralelo_id: 'PAR005', asignatura_id: 'ASI004', codigo_paralelo: '5/1', carrera: 'Software', nivel: 5, jornada: 'Matutina', numero_estudiantes: 30, activo: true },
    { paralelo_id: 'PAR006', asignatura_id: 'ASI005', codigo_paralelo: '5/1', carrera: 'Software', nivel: 5, jornada: 'Matutina', numero_estudiantes: 38, activo: true }
  ],
  distributivo: [
    { distributivo_id: 'DIS001', docente_id: 'DOC001', asignatura_id: 'ASI001', paralelo_id: 'PAR001', periodo_academico: '2026-2', horas_asignadas: 4, observacion: 'Asignacion regular' },
    { distributivo_id: 'DIS002', docente_id: 'DOC001', asignatura_id: 'ASI001', paralelo_id: 'PAR002', periodo_academico: '2026-2', horas_asignadas: 4, observacion: 'Asignacion regular' },
    { distributivo_id: 'DIS003', docente_id: 'DOC002', asignatura_id: 'ASI002', paralelo_id: 'PAR003', periodo_academico: '2026-2', horas_asignadas: 4, observacion: 'Asignacion regular' },
    { distributivo_id: 'DIS004', docente_id: 'DOC003', asignatura_id: 'ASI003', paralelo_id: 'PAR004', periodo_academico: '2026-2', horas_asignadas: 3, observacion: 'Asignacion regular' },
    { distributivo_id: 'DIS005', docente_id: 'DOC004', asignatura_id: 'ASI004', paralelo_id: 'PAR005', periodo_academico: '2026-2', horas_asignadas: 3, observacion: 'Asignacion regular' },
    { distributivo_id: 'DIS006', docente_id: 'DOC005', asignatura_id: 'ASI005', paralelo_id: 'PAR006', periodo_academico: '2026-2', horas_asignadas: 4, observacion: 'Asignacion regular' }
  ],
  disponibilidad_docente: [
    { disponibilidad_id: 'DISP001', docente_id: 'DOC001', dia_semana: 'LUNES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP002', docente_id: 'DOC001', dia_semana: 'MARTES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP003', docente_id: 'DOC001', dia_semana: 'MIERCOLES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP004', docente_id: 'DOC002', dia_semana: 'LUNES', hora_inicio: '07:00', hora_fin: '11:00', disponible: true },
    { disponibilidad_id: 'DISP005', docente_id: 'DOC002', dia_semana: 'JUEVES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP006', docente_id: 'DOC003', dia_semana: 'MARTES', hora_inicio: '14:00', hora_fin: '18:00', disponible: true },
    { disponibilidad_id: 'DISP007', docente_id: 'DOC004', dia_semana: 'LUNES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP008', docente_id: 'DOC004', dia_semana: 'VIERNES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true },
    { disponibilidad_id: 'DISP009', docente_id: 'DOC005', dia_semana: 'LUNES', hora_inicio: '07:00', hora_fin: '09:00', disponible: true },
    { disponibilidad_id: 'DISP010', docente_id: 'DOC005', dia_semana: 'MIERCOLES', hora_inicio: '07:00', hora_fin: '13:00', disponible: true }
  ]
};
