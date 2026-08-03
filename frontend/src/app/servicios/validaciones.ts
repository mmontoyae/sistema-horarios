/**
 * Espejo en TypeScript de backend/app/services/validaciones.py
 *
 * Se usa unicamente en el modo demostracion (publicacion en GitHub Pages),
 * donde no hay backend disponible y la validacion se resuelve en el navegador.
 * En la ejecucion normal del sistema estas reglas se evaluan en el backend y,
 * al confirmar un bloque, tambien en el procedimiento almacenado de SQL Server.
 *
 * Al igual que en el backend, todas las funciones son puras: reciben los datos
 * como argumentos, no modifican nada y devuelven la lista de conflictos.
 */

export interface Conflicto {
  codigo: string;
  detalle: string;
  bloque: string;
}

export interface ResultadoValidacion {
  estado: string;
  total_conflictos: number;
  conflictos: Conflicto[];
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function hayTraslape(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  return aMinutos(inicio1) < aMinutos(fin2) && aMinutos(fin1) > aMinutos(inicio2);
}

export function duracionHoras(inicio: string, fin: string): number {
  return (aMinutos(fin) - aMinutos(inicio)) / 60;
}

function textoBloque(p: any): string {
  return `${p.asignatura_id}/${p.paralelo_id} ${p.dia_semana} ${p.hora_inicio}-${p.hora_fin}`;
}

function conflicto(codigo: string, detalle: string, p: any): Conflicto {
  return { codigo, detalle, bloque: textoBloque(p) };
}

// ---------------- validaciones individuales ----------------

export function validarDistributivo(p: any, distributivo: any[]): Conflicto[] {
  const existe = distributivo.some(d =>
    d.docente_id === p.docente_id &&
    d.asignatura_id === p.asignatura_id &&
    d.paralelo_id === p.paralelo_id
  );
  return existe ? [] : [conflicto(
    'DISTRIBUTIVO_INVALIDO',
    'La combinacion docente/asignatura/paralelo no existe en el distributivo',
    p
  )];
}

export function validarDisponibilidadDocente(p: any, disponibilidades: any[]): Conflicto[] {
  const cubierto = disponibilidades.some(d =>
    d.docente_id === p.docente_id &&
    d.dia_semana === p.dia_semana &&
    d.disponible &&
    aMinutos(d.hora_inicio) <= aMinutos(p.hora_inicio) &&
    aMinutos(d.hora_fin) >= aMinutos(p.hora_fin)
  );
  return cubierto ? [] : [conflicto(
    'FUERA_DISPONIBILIDAD',
    `El docente ${p.docente_id} no tiene disponibilidad en esa franja`,
    p
  )];
}

export function validarDocenteOcupado(p: any, horarios: any[]): Conflicto[] {
  return horarios
    .filter(h =>
      h.docente_id === p.docente_id &&
      h.dia_semana === p.dia_semana &&
      hayTraslape(p.hora_inicio, p.hora_fin, h.hora_inicio, h.hora_fin))
    .map(h => conflicto(
      'DOCENTE_OCUPADO',
      `El docente ${p.docente_id} ya dicta ${h.asignatura_id} en esa franja`,
      p
    ));
}

export function validarEspacioOcupado(p: any, horarios: any[]): Conflicto[] {
  return horarios
    .filter(h =>
      h.espacio_id === p.espacio_id &&
      h.dia_semana === p.dia_semana &&
      hayTraslape(p.hora_inicio, p.hora_fin, h.hora_inicio, h.hora_fin))
    .map(h => conflicto(
      'ESPACIO_OCUPADO',
      `El espacio ${p.espacio_id} ya esta ocupado por ${h.asignatura_id} en esa franja`,
      p
    ));
}

export function validarEspacioCompatible(p: any, asignaturas: any[], espacios: any[]): Conflicto[] {
  const asignatura = asignaturas.find(a => a.asignatura_id === p.asignatura_id);
  const espacio = espacios.find(e => e.espacio_id === p.espacio_id);

  if (!asignatura || !espacio) {
    return [conflicto('DATO_INEXISTENTE', 'La asignatura o el espacio no estan registrados', p)];
  }

  const requerido = asignatura.tipo_espacio_requerido;
  if (!requerido || requerido === espacio.tipo_espacio) return [];

  return [conflicto(
    'ESPACIO_INCOMPATIBLE',
    `La asignatura requiere ${requerido} y el espacio es ${espacio.tipo_espacio}`,
    p
  )];
}

export function validarCargaHoraria(p: any, horarios: any[], docentes: any[]): Conflicto[] {
  const docente = docentes.find(d => d.docente_id === p.docente_id);
  if (!docente) {
    return [conflicto('DATO_INEXISTENTE', 'El docente no esta registrado', p)];
  }

  const horasActuales = horarios
    .filter(h => h.docente_id === p.docente_id)
    .reduce((suma, h) => suma + duracionHoras(h.hora_inicio, h.hora_fin), 0);

  const total = horasActuales + duracionHoras(p.hora_inicio, p.hora_fin);
  const maximo = docente.horas_max_semanales;

  if (total <= maximo) return [];

  return [conflicto(
    'EXCESO_CARGA',
    `Con este bloque el docente llegaria a ${total.toFixed(1)} horas y su maximo es ${maximo}`,
    p
  )];
}

export function validarCapacidad(p: any, paralelos: any[], espacios: any[]): Conflicto[] {
  const paralelo = paralelos.find(x => x.paralelo_id === p.paralelo_id);
  const espacio = espacios.find(e => e.espacio_id === p.espacio_id);

  if (!paralelo || !espacio) {
    return [conflicto('DATO_INEXISTENTE', 'El paralelo o el espacio no estan registrados', p)];
  }

  if (paralelo.numero_estudiantes <= espacio.capacidad) return [];

  return [conflicto(
    'CAPACIDAD_INSUFICIENTE',
    `El paralelo tiene ${paralelo.numero_estudiantes} estudiantes y el espacio soporta ${espacio.capacidad}`,
    p
  )];
}

// ---------------- composicion ----------------

export function validarPropuesta(p: any, datos: any): ResultadoValidacion {
  const validaciones: Array<() => Conflicto[]> = [
    () => validarDistributivo(p, datos.distributivo),
    () => validarDisponibilidadDocente(p, datos.disponibilidades),
    () => validarDocenteOcupado(p, datos.horarios),
    () => validarEspacioOcupado(p, datos.horarios),
    () => validarEspacioCompatible(p, datos.asignaturas, datos.espacios),
    () => validarCargaHoraria(p, datos.horarios, datos.docentes),
    () => validarCapacidad(p, datos.paralelos, datos.espacios)
  ];

  const conflictos = validaciones.flatMap(validar => validar());

  return {
    estado: conflictos.length > 0 ? 'INVALIDO' : 'VALIDO',
    total_conflictos: conflictos.length,
    conflictos
  };
}
