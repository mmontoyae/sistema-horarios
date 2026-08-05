import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { validarPropuesta, ResultadoValidacion, Conflicto } from './validaciones';

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
}
