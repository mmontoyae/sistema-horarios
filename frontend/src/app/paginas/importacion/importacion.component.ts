import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelService } from '../../servicios/excel.service';
import { ApiService, ResumenImportacion } from '../../servicios/api.service';

interface EstadoHoja {
  nombre: string;
  filas: any[];
  errores: string[];
  resumen?: ResumenImportacion;
  enviando: boolean;
}

@Component({
  selector: 'app-importacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './importacion.component.html'
})
export class ImportacionComponent {

  hojas: EstadoHoja[] = [];
  nombreArchivo = '';
  mensajeError = '';

  // hoja del excel -> endpoint del backend y columnas obligatorias
  configuracion: { [hoja: string]: { endpoint: string; columnas: string[] } } = {
    docentes: {
      endpoint: 'docentes',
      columnas: ['docente_id', 'cedula', 'nombres', 'apellidos', 'correo', 'tipo_contrato', 'horas_max_semanales', 'activo']
    },
    espacios: {
      endpoint: 'espacios',
      columnas: ['espacio_id', 'codigo_espacio', 'nombre_espacio', 'tipo_espacio', 'capacidad', 'edificio', 'piso', 'activo']
    },
    asignaturas: {
      endpoint: 'asignaturas',
      columnas: ['asignatura_id', 'codigo_asignatura', 'nombre_asignatura', 'modalidad', 'requiere_laboratorio', 'tipo_espacio_requerido', 'horas_semanales', 'cupo_estimado', 'activo']
    },
    paralelos: {
      endpoint: 'paralelos',
      columnas: ['paralelo_id', 'asignatura_id', 'codigo_paralelo', 'carrera', 'nivel', 'jornada', 'numero_estudiantes', 'activo']
    },
    distributivo: {
      endpoint: 'distributivo',
      columnas: ['distributivo_id', 'docente_id', 'asignatura_id', 'paralelo_id', 'periodo_academico', 'horas_asignadas', 'observacion']
    },
    disponibilidad_docente: {
      endpoint: 'disponibilidad',
      columnas: ['disponibilidad_id', 'docente_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'disponible']
    }
  };

  // orden correcto de envio por las claves foraneas
  ordenEnvio = ['docentes', 'espacios', 'asignaturas', 'paralelos', 'distributivo', 'disponibilidad_docente'];

  constructor(private excel: ExcelService, private api: ApiService) {}

  async seleccionarArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    this.nombreArchivo = archivo.name;
    this.mensajeError = '';
    this.hojas = [];

    try {
      const contenido = await this.excel.leerArchivo(archivo);

      this.hojas = this.ordenEnvio
        .filter(nombre => contenido[nombre])
        .map(nombre => ({
          nombre,
          filas: contenido[nombre],
          errores: this.excel.validarColumnas(contenido[nombre], this.configuracion[nombre].columnas),
          enviando: false
        }));

      if (this.hojas.length === 0) {
        this.mensajeError = 'El archivo no contiene ninguna de las hojas esperadas (docentes, espacios, asignaturas, paralelos, distributivo, disponibilidad_docente)';
      }
    } catch (error) {
      this.mensajeError = 'No se pudo leer el archivo: ' + error;
    }
  }

  columnas(hoja: EstadoHoja): string[] {
    return hoja.filas.length > 0 ? Object.keys(hoja.filas[0]) : [];
  }

  enviarHoja(hoja: EstadoHoja) {
    hoja.enviando = true;
    const endpoint = this.configuracion[hoja.nombre].endpoint;

    this.api.importar(endpoint, hoja.filas).subscribe({
      next: resumen => {
        hoja.resumen = resumen;
        hoja.enviando = false;
      },
      error: err => {
        hoja.errores = ['Error del servidor: ' + (err.error?.detail ? JSON.stringify(err.error.detail) : err.message)];
        hoja.enviando = false;
      }
    });
  }

  enviarTodo() {
    // se envian en orden para respetar las dependencias entre tablas
    const pendientes = this.hojas.filter(h => h.errores.length === 0);
    const enviarSiguiente = (indice: number) => {
      if (indice >= pendientes.length) return;
      const hoja = pendientes[indice];
      hoja.enviando = true;
      this.api.importar(this.configuracion[hoja.nombre].endpoint, hoja.filas).subscribe({
        next: resumen => {
          hoja.resumen = resumen;
          hoja.enviando = false;
          enviarSiguiente(indice + 1);
        },
        error: err => {
          hoja.errores = ['Error del servidor: ' + (err.error?.detail ? JSON.stringify(err.error.detail) : err.message)];
          hoja.enviando = false;
        }
      });
    };
    enviarSiguiente(0);
  }
}
