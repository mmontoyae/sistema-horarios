import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelService } from '../../servicios/excel.service';
import { ApiService, ResumenImportacion } from '../../servicios/api.service';
import { DATOS_EJEMPLO } from '../../servicios/datos-ejemplo';

interface EstadoHoja {
  nombre: string;
  filas: any[];
  errores: string[];
  resumen?: ResumenImportacion;
  enviando: boolean;
  abierta: boolean;
}

@Component({
  selector: 'app-importacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './importacion.component.html',
  styleUrls: ['./importacion.component.css']
})
export class ImportacionComponent {

  hojas: EstadoHoja[] = [];
  nombreArchivo = '';
  mensajeError = '';
  arrastrando = false;
  enviandoTodo = false;

  private contadorArrastre = 0;

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

  // orden de envio por las claves foraneas
  ordenEnvio = ['docentes', 'espacios', 'asignaturas', 'paralelos', 'distributivo', 'disponibilidad_docente'];

  constructor(private excel: ExcelService, private api: ApiService) {}

  get modoDemo(): boolean {
    return this.api.modoDemo;
  }

  /** Carga el juego de datos de ejemplo sin necesidad del archivo Excel. */
  usarDatosEjemplo() {
    this.mensajeError = '';
    this.nombreArchivo = 'insumos_horarios.xlsx (datos de ejemplo)';
    this.hojas = this.ordenEnvio
      .filter(nombre => DATOS_EJEMPLO[nombre])
      .map((nombre, indice) => ({
        nombre,
        filas: DATOS_EJEMPLO[nombre],
        errores: [],
        enviando: false,
        abierta: indice === 0
      }));
  }

  // ---------- arrastrar y soltar ----------

  @HostListener('window:dragenter', ['$event'])
  alEntrarArrastre(evento: DragEvent) {
    if (!this.tieneArchivos(evento)) return;
    evento.preventDefault();
    this.contadorArrastre++;
    this.arrastrando = true;
  }

  @HostListener('window:dragover', ['$event'])
  alArrastrarEncima(evento: DragEvent) {
    if (!this.tieneArchivos(evento)) return;
    evento.preventDefault();
  }

  @HostListener('window:dragleave', ['$event'])
  alSalirArrastre(evento: DragEvent) {
    evento.preventDefault();
    this.contadorArrastre--;
    if (this.contadorArrastre <= 0) {
      this.contadorArrastre = 0;
      this.arrastrando = false;
    }
  }

  @HostListener('window:drop', ['$event'])
  alSoltar(evento: DragEvent) {
    evento.preventDefault();
    this.contadorArrastre = 0;
    this.arrastrando = false;

    const archivos = evento.dataTransfer?.files;
    if (archivos && archivos.length > 0) {
      this.procesarArchivo(archivos[0]);
    }
  }

  private tieneArchivos(evento: DragEvent): boolean {
    return Array.from(evento.dataTransfer?.types ?? []).includes('Files');
  }

  // ---------- seleccion manual ----------

  seleccionarArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  // ---------- lectura del archivo ----------

  async procesarArchivo(archivo: File) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      this.mensajeError = `El archivo "${archivo.name}" no es un Excel o CSV valido.`;
      this.hojas = [];
      this.nombreArchivo = '';
      return;
    }

    this.nombreArchivo = archivo.name;
    this.mensajeError = '';
    this.hojas = [];

    try {
      const contenido = await this.excel.leerArchivo(archivo);

      this.hojas = this.ordenEnvio
        .filter(nombre => contenido[nombre])
        .map((nombre, indice) => ({
          nombre,
          filas: contenido[nombre],
          errores: this.excel.validarColumnas(contenido[nombre], this.configuracion[nombre].columnas),
          enviando: false,
          abierta: indice === 0
        }));

      if (this.hojas.length === 0) {
        this.mensajeError = 'El archivo no contiene ninguna de las hojas esperadas: docentes, espacios, asignaturas, paralelos, distributivo o disponibilidad_docente.';
      }
    } catch (error) {
      this.mensajeError = 'No se pudo leer el archivo: ' + error;
    }
  }

  // ---------- utilidades de vista ----------

  columnas(hoja: EstadoHoja): string[] {
    return hoja.filas.length > 0 ? Object.keys(hoja.filas[0]) : [];
  }

  alternar(hoja: EstadoHoja) {
    hoja.abierta = !hoja.abierta;
  }

  get totalRegistros(): number {
    return this.hojas.reduce((suma, h) => suma + h.filas.length, 0);
  }

  get hojasValidas(): number {
    return this.hojas.filter(h => h.errores.length === 0).length;
  }

  get todasEnviadas(): boolean {
    return this.hojas.length > 0 && this.hojas.every(h => h.resumen);
  }

  limpiar() {
    this.hojas = [];
    this.nombreArchivo = '';
    this.mensajeError = '';
  }

  // ---------- envio al backend ----------

  enviarHoja(hoja: EstadoHoja) {
    hoja.enviando = true;
    this.api.importar(this.configuracion[hoja.nombre].endpoint, hoja.filas).subscribe({
      next: resumen => {
        hoja.resumen = resumen;
        hoja.enviando = false;
      },
      error: err => {
        hoja.errores = [this.textoError(err)];
        hoja.enviando = false;
      }
    });
  }

  enviarTodo() {
    const pendientes = this.hojas.filter(h => h.errores.length === 0);
    this.enviandoTodo = true;

    const enviarSiguiente = (indice: number) => {
      if (indice >= pendientes.length) {
        this.enviandoTodo = false;
        return;
      }
      const hoja = pendientes[indice];
      hoja.enviando = true;
      this.api.importar(this.configuracion[hoja.nombre].endpoint, hoja.filas).subscribe({
        next: resumen => {
          hoja.resumen = resumen;
          hoja.enviando = false;
          enviarSiguiente(indice + 1);
        },
        error: err => {
          hoja.errores = [this.textoError(err)];
          hoja.enviando = false;
          this.enviandoTodo = false;
        }
      });
    };

    enviarSiguiente(0);
  }

  private textoError(err: any): string {
    if (err.status === 0) {
      return 'No se pudo contactar al backend. Verifique que el servidor este disponible.';
    }
    return 'Error del servidor: ' + (err.error?.detail ? JSON.stringify(err.error.detail) : err.message);
  }
}
