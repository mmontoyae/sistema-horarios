import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Conflicto } from '../../servicios/api.service';

@Component({
  selector: 'app-conflictos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conflictos.component.html',
  styleUrls: ['./conflictos.component.css']
})
export class ConflictosComponent implements OnInit {

  dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
           '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  horario: any[] = [];
  conflictos: Conflicto[] = [];
  cargando = true;
  mensajeError = '';

  // diccionarios de codigo -> nombre, para mostrar texto legible
  private nombresAsignatura: { [id: string]: string } = {};
  private nombresDocente: { [id: string]: string } = {};
  private nombresEspacio: { [id: string]: string } = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.obtenerHorario().subscribe({
      next: datos => {
        this.horario = datos;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'No se pudo obtener el horario. Verifique que el backend este disponible.';
        this.cargando = false;
      }
    });

    this.api.obtenerConflictos().subscribe({
      next: datos => this.conflictos = datos,
      error: () => {}
    });

    // los catalogos permiten traducir los codigos a nombres reales
    this.api.obtenerCatalogos().subscribe({
      next: c => {
        (c.asignaturas ?? []).forEach((a: any) => this.nombresAsignatura[a.asignatura_id] = a.nombre_asignatura);
        (c.docentes ?? []).forEach((d: any) => this.nombresDocente[d.docente_id] = `${d.nombres} ${d.apellidos}`);
        (c.espacios ?? []).forEach((e: any) => this.nombresEspacio[e.espacio_id] = e.nombre_espacio ?? e.espacio_id);
      },
      error: () => {}
    });
  }

  // ---------- traduccion de codigos ----------

  nombreAsignatura(id: string): string {
    return this.nombresAsignatura[id] || id;
  }

  nombreDocente(id: string): string {
    return this.nombresDocente[id] || id;
  }

  nombreEspacio(id: string): string {
    return this.nombresEspacio[id] || id;
  }

  /** bloques confirmados que ocupan la celda dia/hora */
  bloquesEn(dia: string, hora: string): any[] {
    const inicioCelda = this.aMinutos(hora);
    const finCelda = inicioCelda + 60;
    return this.horario.filter(b =>
      b.dia_semana === dia &&
      this.aMinutos(b.hora_inicio) < finCelda &&
      this.aMinutos(b.hora_fin) > inicioCelda
    );
  }

  /**
   * Un bloque se marca solo si el conflicto corresponde exactamente a esa
   * franja. Antes se comparaba sin las horas, de modo que un intento fallido
   * en otro horario del mismo dia teñia de rojo al bloque que si era valido.
   */
  tieneConflicto(bloque: any): boolean {
    const texto = `${bloque.asignatura_id}/${bloque.paralelo_id} ${bloque.dia_semana} ${bloque.hora_inicio}-${bloque.hora_fin}`;
    return this.conflictos.some(c => c.bloque === texto);
  }

  /** true cuando el bloque empieza en esa franja (para no repetir el detalle) */
  esInicio(bloque: any, hora: string): boolean {
    return bloque.hora_inicio === hora;
  }

  get totalBloques(): number {
    return this.horario.length;
  }

  get codigosDistintos(): number {
    return new Set(this.conflictos.map(c => c.codigo)).size;
  }

  // ---------- borrado ----------

  confirmandoVaciado = false;
  procesando = false;
  mensajeAccion = '';

  recargar() {
    this.api.obtenerHorario().subscribe({ next: d => this.horario = d });
    this.api.obtenerConflictos().subscribe({ next: d => this.conflictos = d });
  }

  eliminarBloque(bloque: any) {
    this.procesando = true;
    this.api.eliminarBloque(bloque.horario_id).subscribe({
      next: () => {
        this.procesando = false;
        this.mensajeAccion = 'Bloque eliminado del horario.';
        this.recargar();
      },
      error: () => {
        this.procesando = false;
        this.mensajeError = 'No se pudo eliminar el bloque.';
      }
    });
  }

  vaciarHorario() {
    this.procesando = true;
    this.api.vaciarHorario().subscribe({
      next: r => {
        this.procesando = false;
        this.confirmandoVaciado = false;
        this.mensajeAccion = `Se eliminaron ${r.eliminados ?? 0} bloques del horario.`;
        this.recargar();
      },
      error: () => {
        this.procesando = false;
        this.confirmandoVaciado = false;
        this.mensajeError = 'No se pudo vaciar el horario.';
      }
    });
  }

  limpiarConflictos() {
    this.procesando = true;
    this.api.limpiarConflictos().subscribe({
      next: () => {
        this.procesando = false;
        this.conflictos = [];
        this.mensajeAccion = 'Se limpio el registro de conflictos.';
      },
      error: () => {
        this.procesando = false;
        this.mensajeError = 'No se pudo limpiar el registro.';
      }
    });
  }

  private aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }
}
