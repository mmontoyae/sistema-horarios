import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ResultadoValidacion } from '../../servicios/api.service';

@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {

  catalogos: any = null;
  resultado: ResultadoValidacion | null = null;
  enviando = false;
  mensajeError = '';

  dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
           '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  modalidades = ['PRESENCIAL', 'HIBRIDA', 'ONLINE'];

  propuesta = {
    asignatura_id: '',
    paralelo_id: '',
    docente_id: '',
    espacio_id: '',
    dia_semana: 'LUNES',
    hora_inicio: '07:00',
    hora_fin: '09:00',
    modalidad: 'PRESENCIAL',
    confirmar: false
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.obtenerCatalogos().subscribe({
      next: datos => this.catalogos = datos,
      error: () => this.mensajeError = 'No se pudieron cargar los catalogos. Verifique que el backend este disponible y que los datos esten importados.'
    });
  }

  get paralelosFiltrados(): any[] {
    if (!this.catalogos) return [];
    return this.catalogos.paralelos.filter(
      (p: any) => !this.propuesta.asignatura_id || p.asignatura_id === this.propuesta.asignatura_id
    );
  }

  get formularioCompleto(): boolean {
    return !!(this.propuesta.asignatura_id && this.propuesta.paralelo_id &&
              this.propuesta.docente_id && this.propuesta.espacio_id);
  }

  get sinDatos(): boolean {
    return !!this.catalogos && (this.catalogos.asignaturas?.length ?? 0) === 0;
  }

  validar() {
    this.enviando = true;
    this.resultado = null;
    this.mensajeError = '';

    this.api.validarPropuesta(this.propuesta).subscribe({
      next: r => {
        this.resultado = r;
        this.enviando = false;
      },
      error: err => {
        this.mensajeError = err.status === 0
          ? 'No se pudo contactar al backend.'
          : 'Error al validar: ' + (err.error?.detail ? JSON.stringify(err.error.detail) : err.message);
        this.enviando = false;
      }
    });
  }
}
