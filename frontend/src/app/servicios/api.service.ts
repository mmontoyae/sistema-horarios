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

  importar(entidad: string, datos: any[]): Observable<ResumenImportacion> {
    if (this.modoDemo) return this.demo.importar(entidad, datos);
    return this.http.post<ResumenImportacion>(`${this.urlBase}/import/${entidad}`, datos);
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
