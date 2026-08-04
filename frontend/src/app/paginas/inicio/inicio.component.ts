import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Pantalla de inicio.
 *
 * El fondo combina una imagen de 16 KB con una retícula animada en CSS que
 * evoca los bloques de un horario. Se descarto la escena 3D porque obligaba a
 * descargar varios megabytes y mantenia la GPU ocupada de forma continua, lo
 * que hacia lenta la pantalla en equipos modestos.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {}
