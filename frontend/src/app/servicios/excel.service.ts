import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

/**
 * Lee el archivo Excel en el navegador y convierte cada hoja a un
 * arreglo de objetos JSON, aplicando las conversiones basicas
 * (SI/NO a booleano, numeros, horas).
 */
@Injectable({ providedIn: 'root' })
export class ExcelService {

  private camposBooleanos = ['activo', 'disponible', 'requiere_laboratorio'];
  private camposNumericos = [
    'horas_max_semanales', 'capacidad', 'piso', 'horas_semanales',
    'cupo_estimado', 'nivel', 'numero_estudiantes', 'horas_asignadas'
  ];

  leerArchivo(archivo: File): Promise<{ [hoja: string]: any[] }> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();

      lector.onload = (evento: any) => {
        try {
          const libro = XLSX.read(evento.target.result, { type: 'array' });
          const resultado: { [hoja: string]: any[] } = {};

          libro.SheetNames.forEach(nombre => {
            const filas: any[] = XLSX.utils.sheet_to_json(libro.Sheets[nombre], { defval: null });
            resultado[nombre] = filas
              .filter(fila => Object.values(fila).some(v => v !== null && v !== ''))
              .map(fila => this.convertirFila(fila));
          });

          resolve(resultado);
        } catch (error) {
          reject(error);
        }
      };

      lector.onerror = () => reject(lector.error);
      lector.readAsArrayBuffer(archivo);
    });
  }

  private convertirFila(fila: any): any {
    const convertida: any = {};

    Object.keys(fila).forEach(campo => {
      let valor = fila[campo];

      if (this.camposBooleanos.includes(campo)) {
        valor = String(valor).trim().toUpperCase() === 'SI';
      } else if (this.camposNumericos.includes(campo) && valor !== null) {
        valor = Number(valor);
      } else if ((campo === 'hora_inicio' || campo === 'hora_fin') && valor !== null) {
        valor = this.normalizarHora(valor);
      } else if (typeof valor === 'string') {
        valor = valor.trim();
      }

      convertida[campo] = valor;
    });

    return convertida;
  }

  /** Excel a veces entrega las horas como fraccion del dia (0.29166 = 07:00) */
  private normalizarHora(valor: any): string {
    if (typeof valor === 'number') {
      const totalMinutos = Math.round(valor * 24 * 60);
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }
    return String(valor).trim().substring(0, 5);
  }

  /** Validacion basica de columnas antes de enviar al backend */
  validarColumnas(filas: any[], obligatorias: string[]): string[] {
    if (filas.length === 0) {
      return ['La hoja no tiene registros'];
    }
    const presentes = Object.keys(filas[0]);
    return obligatorias
      .filter(col => !presentes.includes(col))
      .map(col => `Falta la columna obligatoria: ${col}`);
  }
}
