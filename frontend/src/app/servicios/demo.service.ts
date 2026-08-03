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
      this.datos.horarios = [...this.datos.horarios, { ...propuesta }];
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
}
