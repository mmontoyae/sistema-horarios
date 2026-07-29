import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Conflicto } from '../../servicios/api.service';

@Component({
  selector: 'app-conflictos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conflictos.component.html',
  styles: [`
    .celda-bloque {
      background: #d7e8f7;
      border-left: 4px solid #1b3a5c;
      padding: 4px 6px;
      margin-bottom: 4px;
      border-radius: 3px;
      font-size: 12px;
    }
    .celda-conflicto {
      background: #fdecea;
      border-left: 4px solid #d93025;
    }
  `]
})
export class ConflictosComponent implements OnInit {

  dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
           '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  horario: any[] = [];
  conflictos: Conflicto[] = [];
  cargando = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.obtenerHorario().subscribe({
      next: datos => {
        this.horario = datos;
        this.cargando = false;
      },
      error: () => this.cargando = false
    });

    this.api.obtenerConflictos().subscribe({
      next: datos => this.conflictos = datos
    });
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

  /** un bloque se marca si aparece referenciado en algun conflicto */
  tieneConflicto(bloque: any): boolean {
    const texto = `${bloque.asignatura_id}/${bloque.paralelo_id} ${bloque.dia_semana}`;
    return this.conflictos.some(c => c.bloque.startsWith(texto));
  }

  private aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }
}
