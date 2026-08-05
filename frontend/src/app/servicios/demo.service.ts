import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { validarPropuesta, ResultadoValidacion, Conflicto } from './validaciones';
import { generarHorario } from './generador';

/**
 * Backend simulado para el modo demostracion (publicacion en GitHub Pages).
 *
 * Guarda los datos en memoria y aplica las mismas reglas de validacion que el
 * backend real. Existe solo para que la interfaz pueda mostrarse en linea sin
 * servidor; la version completa del sistema usa FastAPI y SQL Server.
 */
@Injectable({ providedIn: 'root' })
export class DemoService {

  private datos: any = {
    docentes: [], espacios: [], asignaturas: [],
    paralelos: [], distributivo: [], disponibilidades: [], horarios: []
  };

  private historial: Conflicto[] = [];
  private ultimoId = 0;

  // hoja del excel -> clave interna
  private mapa: { [endpoint: string]: string } = {
    docentes: 'docentes',
    espacios: 'espacios',
    asignaturas: 'asignaturas',
    paralelos: 'paralelos',
    distributivo: 'distributivo',
    disponibilidad: 'disponibilidades'
  };

  importar(entidad: string, filas: any[]): Observable<any> {
    const clave = this.mapa[entidad];
    if (clave) {
      this.datos[clave] = filas;
    }
    return of({
      entidad,
      procesados: filas.length,
      errores: []
    }).pipe(delay(220));
  }

  validarPropuesta(propuesta: any): Observable<ResultadoValidacion> {
    const resultado = validarPropuesta(propuesta, this.datos);
    this.historial = [...this.historial, ...resultado.conflictos];

    if (resultado.estado === 'VALIDO' && propuesta.confirmar) {
      this.datos.horarios = [
        ...this.datos.horarios,
        { ...propuesta, horario_id: ++this.ultimoId }
      ];
    }

    return of(resultado).pipe(delay(220));
  }

  obtenerConflictos(): Observable<Conflicto[]> {
    return of(this.historial);
  }

  obtenerHorario(): Observable<any[]> {
    return of(this.datos.horarios);
  }

  obtenerCatalogos(): Observable<any> {
    return of(this.datos);
  }

  // ---------- borrado ----------

  borrarTodo(): Observable<any> {
    this.datos = {
      docentes: [], espacios: [], asignaturas: [],
      paralelos: [], distributivo: [], disponibilidades: [], horarios: []
    };
    this.historial = [];
    return of({ mensaje: 'datos eliminados' }).pipe(delay(180));
  }

  vaciarHorario(): Observable<any> {
    const eliminados = this.datos.horarios.length;
    this.datos = { ...this.datos, horarios: [] };
    return of({ mensaje: 'horario vaciado', eliminados }).pipe(delay(180));
  }

  eliminarBloque(horarioId: number): Observable<any> {
    this.datos = {
      ...this.datos,
      horarios: this.datos.horarios.filter((h: any) => h.horario_id !== horarioId)
    };
    return of({ mensaje: 'bloque eliminado' }).pipe(delay(180));
  }

  limpiarConflictos(): Observable<any> {
    this.historial = [];
    return of({ mensaje: 'historial limpio' }).pipe(delay(180));
  }

  /** Arma el horario completo a partir del distributivo. */
  generarHorario(conservar: boolean): Observable<any> {
    const r = generarHorario(this.datos, conservar);
    const base = conservar ? this.datos.horarios : [];
    this.datos = {
      ...this.datos,
      horarios: [...base, ...r.asignados].map((h, i) => ({ ...h, horario_id: i + 1 }))
    };
    return of({
      total_asignados: r.total_asignados,
      total_sin_asignar: r.total_sin_asignar,
      sin_asignar: r.sin_asignar
    }).pipe(delay(250));
  }

  /** Mueve un bloque validando el destino sin contarlo a si mismo. */
  moverBloque(horarioId: number, destino: { dia_semana: string; hora_inicio: string }): Observable<any> {
    const bloque = this.datos.horarios.find((h: any) => h.horario_id === horarioId);
    if (!bloque) {
      return of({ estado: 'INVALIDO', total_conflictos: 1, conflictos: [
        { codigo: 'NO_ENCONTRADO', detalle: 'El bloque ya no existe', bloque: '' }
      ]});
    }

    const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
    const duracion = aMin(bloque.hora_fin) - aMin(bloque.hora_inicio);
    const inicio = aMin(destino.hora_inicio);
    const fin = inicio + duracion;

    if (fin > 22 * 60) {
      return of({ estado: 'INVALIDO', total_conflictos: 1, conflictos: [{
        codigo: 'FUERA_DE_JORNADA',
        detalle: 'El bloque no cabe en la jornada si se coloca en esa hora',
        bloque: `${bloque.asignatura_id}/${bloque.paralelo_id} ${destino.dia_semana} ${destino.hora_inicio}`
      }]}).pipe(delay(150));
    }

    const horaFin = `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;

    // el propio bloque no cuenta como ocupacion
    const otros = this.datos.horarios.filter((h: any) => h.horario_id !== horarioId);
    const propuesta = { ...bloque, dia_semana: destino.dia_semana, hora_inicio: destino.hora_inicio, hora_fin: horaFin };
    const resultado = validarPropuesta(propuesta, { ...this.datos, horarios: otros });

    if (resultado.estado === 'VALIDO') {
      this.datos = { ...this.datos, horarios: [...otros, propuesta] };
    } else {
      this.historial = [...this.historial, ...resultado.conflictos];
    }

    return of(resultado).pipe(delay(180));
  }
}
