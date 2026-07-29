import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private urlBase = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  importar(entidad: string, datos: any[]): Observable<ResumenImportacion> {
    return this.http.post<ResumenImportacion>(`${this.urlBase}/import/${entidad}`, datos);
  }

  validarPropuesta(propuesta: any): Observable<ResultadoValidacion> {
    return this.http.post<ResultadoValidacion>(`${this.urlBase}/horarios/validar`, propuesta);
  }

  obtenerConflictos(): Observable<Conflicto[]> {
    return this.http.get<Conflicto[]>(`${this.urlBase}/horarios/conflictos`);
  }

  obtenerHorario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/horarios`);
  }

  obtenerCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.urlBase}/catalogos`);
  }
}
