/**
 * Espejo en TypeScript de backend/app/services/generador.py
 *
 * Se usa solo en el modo demostracion, cuando no hay backend disponible.
 * Aplica el mismo algoritmo: recorre el distributivo y busca para cada
 * asignacion una franja y un espacio que no incumplan ninguna regla,
 * resolviendo primero las asignaciones con menos alternativas.
 */
import { aMinutos, validarPropuesta } from './validaciones';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const HORAS_INICIO = ['07:00','08:00','09:00','10:00','11:00','12:00',
                      '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

const DURACION_BLOQUE = 2;
const FIN_JORNADA = 22 * 60;

export interface AsignacionPendiente {
  asignatura_id: string;
  paralelo_id: string;
  docente_id: string;
  motivo: string;
}

export interface ResultadoGeneracion {
  asignados: any[];
  sin_asignar: AsignacionPendiente[];
  total_asignados: number;
  total_sin_asignar: number;
}

export function partirEnBloques(horasSemanales: number): number[] {
  const bloques: number[] = [];
  let restantes = horasSemanales;
  while (restantes > 0) {
    bloques.push(Math.min(DURACION_BLOQUE, restantes));
    restantes -= DURACION_BLOQUE;
  }
  return bloques;
}

function sumarHoras(hora: string, horas: number): string {
  const total = aMinutos(hora) + horas * 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function espaciosCompatibles(asignatura: any, paralelo: any, espacios: any[]): any[] {
  const requerido = asignatura?.tipo_espacio_requerido;
  return espacios
    .filter(e => (!requerido || e.tipo_espacio === requerido) && e.capacidad >= paralelo.numero_estudiantes)
    .sort((a, b) => a.capacidad - b.capacidad);
}

function diasDelDocente(docenteId: string, disponibilidades: any[]): string[] {
  const suyos = new Set(
    disponibilidades.filter(d => d.docente_id === docenteId && d.disponible).map(d => d.dia_semana)
  );
  return DIAS.filter(d => suyos.has(d));
}

function dificultad(asignacion: any, datos: any): number {
  const asignatura = datos.asignaturas.find((a: any) => a.asignatura_id === asignacion.asignatura_id);
  const paralelo = datos.paralelos.find((p: any) => p.paralelo_id === asignacion.paralelo_id);
  if (!asignatura || !paralelo) return 0;
  return espaciosCompatibles(asignatura, paralelo, datos.espacios).length *
         diasDelDocente(asignacion.docente_id, datos.disponibilidades).length;
}

function buscarHueco(asignacion: any, duracion: number, datos: any): any | null {
  const asignatura = datos.asignaturas.find((a: any) => a.asignatura_id === asignacion.asignatura_id);
  const paralelo = datos.paralelos.find((p: any) => p.paralelo_id === asignacion.paralelo_id);
  if (!asignatura || !paralelo) return null;

  const espacios = espaciosCompatibles(asignatura, paralelo, datos.espacios);
  const dias = diasDelDocente(asignacion.docente_id, datos.disponibilidades);

  for (const dia of dias) {
    for (const hora of HORAS_INICIO) {
      if (aMinutos(hora) + duracion * 60 > FIN_JORNADA) continue;
      for (const espacio of espacios) {
        const propuesta = {
          asignatura_id: asignacion.asignatura_id,
          paralelo_id: asignacion.paralelo_id,
          docente_id: asignacion.docente_id,
          espacio_id: espacio.espacio_id,
          dia_semana: dia,
          hora_inicio: hora,
          hora_fin: sumarHoras(hora, duracion),
          modalidad: asignatura.modalidad ?? 'PRESENCIAL'
        };
        if (validarPropuesta(propuesta, datos).estado === 'VALIDO') return propuesta;
      }
    }
  }
  return null;
}

function motivoSinHueco(asignacion: any, datos: any): string {
  const asignatura = datos.asignaturas.find((a: any) => a.asignatura_id === asignacion.asignatura_id);
  const paralelo = datos.paralelos.find((p: any) => p.paralelo_id === asignacion.paralelo_id);

  if (!asignatura || !paralelo) return 'La asignatura o el paralelo no estan registrados';
  if (diasDelDocente(asignacion.docente_id, datos.disponibilidades).length === 0) {
    return 'El docente no tiene disponibilidad declarada';
  }
  if (espaciosCompatibles(asignatura, paralelo, datos.espacios).length === 0) {
    const requerido = asignatura.tipo_espacio_requerido || 'cualquier espacio';
    return `No hay ningun espacio de tipo ${requerido} con capacidad para ${paralelo.numero_estudiantes} estudiantes`;
  }
  return 'No quedan franjas libres que cumplan todas las reglas';
}

export function generarHorario(datos: any, conservarExistente = false): ResultadoGeneracion {
  let horarios: any[] = conservarExistente ? [...datos.horarios] : [];

  const pendientes = [...datos.distributivo].sort((a, b) => dificultad(a, datos) - dificultad(b, datos));

  const asignados: any[] = [];
  const sinAsignar: AsignacionPendiente[] = [];

  for (const asignacion of pendientes) {
    const asignatura = datos.asignaturas.find((a: any) => a.asignatura_id === asignacion.asignatura_id);
    if (!asignatura) {
      sinAsignar.push({ ...asignacion, motivo: 'La asignatura no esta registrada' });
      continue;
    }

    for (const duracion of partirEnBloques(asignatura.horas_semanales ?? DURACION_BLOQUE)) {
      const estado = { ...datos, horarios };
      const bloque = buscarHueco(asignacion, duracion, estado);

      if (!bloque) {
        sinAsignar.push({
          asignatura_id: asignacion.asignatura_id,
          paralelo_id: asignacion.paralelo_id,
          docente_id: asignacion.docente_id,
          motivo: motivoSinHueco(asignacion, estado)
        });
        break;
      }

      horarios = [...horarios, bloque];
      asignados.push(bloque);
    }
  }

  return {
    asignados,
    sin_asignar: sinAsignar,
    total_asignados: asignados.length,
    total_sin_asignar: sinAsignar.length
  };
}
