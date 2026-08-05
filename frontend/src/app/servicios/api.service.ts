import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemoService } from './demo.service';

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

export interface ResumenImportacion {
  entidad: string;
  procesados: number;
  errores: string[];
}

/**
 * Punto unico de acceso a los datos.
 *
 * En la ejecucion normal habla con la API de FastAPI. Si el proyecto se compilo
 * en modo demostracion (publicacion en GitHub Pages, sin backend), delega en
 * DemoService, que aplica las mismas reglas de validacion en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private urlBase = environment.urlApi;
  private demo = inject(DemoService);

  readonly modoDemo = environment.modoDemo;

  constructor(private http: HttpClient) {}

  /** Tamano de cada envio, para no mandar archivos enormes de una sola vez. */
  static readonly TAMANO_LOTE = 500;

  importar(entidad: string, datos: any[]): Observable<ResumenImportacion> {
    if (this.modoDemo) return this.demo.importar(entidad, datos);
    return this.http.post<ResumenImportacion>(`${this.urlBase}/import/${entidad}`, datos);
  }

  /**
   * Envia los registros en lotes sucesivos y va informando del avance.
   *
   * Con archivos grandes, un unico POST puede superar el limite del servidor
   * o agotar la memoria; troceandolo se mantiene estable y ademas se puede
   * mostrar progreso al usuario.
   */
  importarPorLotes(entidad: string, datos: any[]): Observable<{ enviados: number; total: number; resumen?: ResumenImportacion }> {
    const total = datos.length;
    const lotes: any[][] = [];
    for (let i = 0; i < total; i += ApiService.TAMANO_LOTE) {
      lotes.push(datos.slice(i, i + ApiService.TAMANO_LOTE));
    }
    if (lotes.length === 0) lotes.push([]);

    return new Observable(observador => {
      let indice = 0;
      let procesados = 0;
      const errores: string[] = [];
      let cancelado = false;

      const siguiente = () => {
        if (cancelado) return;

        if (indice >= lotes.length) {
          observador.next({
            enviados: total,
            total,
            resumen: { entidad, procesados, errores }
          });
          observador.complete();
          return;
        }

        const lote = lotes[indice];
        this.importar(entidad, lote).subscribe({
          next: resumen => {
            procesados += resumen.procesados;
            errores.push(...resumen.errores);
            indice++;
            observador.next({ enviados: Math.min(procesados, total), total });
            siguiente();
          },
          error: err => observador.error(err)
        });
      };

      siguiente();
      return () => { cancelado = true; };
    });
  }

  validarPropuesta(propuesta: any): Observable<ResultadoValidacion> {
    if (this.modoDemo) return this.demo.validarPropuesta(propuesta);
    return this.http.post<ResultadoValidacion>(`${this.urlBase}/horarios/validar`, propuesta);
  }

  obtenerConflictos(): Observable<Conflicto[]> {
    if (this.modoDemo) return this.demo.obtenerConflictos();
    return this.http.get<Conflicto[]>(`${this.urlBase}/horarios/conflictos`);
  }

  obtenerHorario(): Observable<any[]> {
    if (this.modoDemo) return this.demo.obtenerHorario();
    return this.http.get<any[]>(`${this.urlBase}/horarios`);
  }

  obtenerCatalogos(): Observable<any> {
    if (this.modoDemo) return this.demo.obtenerCatalogos();
    return this.http.get<any>(`${this.urlBase}/catalogos`);
  }

  // ---------- borrado ----------

  /** Elimina los insumos cargados y, con ellos, el horario. */
  borrarTodo(): Observable<any> {
    if (this.modoDemo) return this.demo.borrarTodo();
    return this.http.delete<any>(`${this.urlBase}/import/todo`);
  }

  /** Vacia el horario dejando los insumos intactos. */
  vaciarHorario(): Observable<any> {
    if (this.modoDemo) return this.demo.vaciarHorario();
    return this.http.delete<any>(`${this.urlBase}/horarios`);
  }

  /** Elimina un bloque concreto del horario. */
  eliminarBloque(horarioId: number): Observable<any> {
    if (this.modoDemo) return this.demo.eliminarBloque(horarioId);
    return this.http.delete<any>(`${this.urlBase}/horarios/bloque/${horarioId}`);
  }

  /** Limpia el registro de conflictos de la sesion. */
  limpiarConflictos(): Observable<any> {
    if (this.modoDemo) return this.demo.limpiarConflictos();
    return this.http.delete<any>(`${this.urlBase}/horarios/conflictos`);
  }
}
