import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Pantalla de inicio.
 *
 * El fondo se muestra siempre como imagen estatica, que pesa unos 16 KB y
 * aparece de inmediato. La escena 3D se carga encima solo cuando el equipo
 * puede moverla con soltura, y se descarta al salir de la pantalla para no
 * seguir consumiendo GPU en el resto del sistema.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {

  private static readonly URL_VISOR =
    'https://unpkg.com/@splinetool/viewer@1.9.28/build/spline-viewer.js';

  mostrar3d = false;
  escenaLista = false;

  ngOnInit() {
    if (!this.equipoCapaz()) return;

    // se espera a que la pagina termine de pintar antes de traer el visor
    setTimeout(() => this.cargarVisor(), 400);
  }

  ngOnDestroy() {
    this.mostrar3d = false;
  }

  /** El fondo 3D solo se activa si el equipo y las preferencias lo permiten. */
  private equipoCapaz(): boolean {
    const navegador = navigator as any;

    // el usuario pidio menos animaciones en su sistema
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    // pantallas pequenas: casi siempre moviles, donde la escena va lenta
    if (window.innerWidth < 900) return false;

    // pocos nucleos o poca memoria
    if ((navegador.hardwareConcurrency ?? 4) < 4) return false;
    if ((navegador.deviceMemory ?? 4) < 4) return false;

    // conexion lenta o con ahorro de datos
    const conexion = navegador.connection;
    if (conexion?.saveData) return false;
    if (conexion?.effectiveType && ['slow-2g', '2g', '3g'].includes(conexion.effectiveType)) return false;

    // sin WebGL no hay nada que hacer
    try {
      const lienzo = document.createElement('canvas');
      if (!lienzo.getContext('webgl2') && !lienzo.getContext('webgl')) return false;
    } catch {
      return false;
    }

    return true;
  }

  private cargarVisor() {
    if (customElements.get('spline-viewer')) {
      this.mostrar3d = true;
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = InicioComponent.URL_VISOR;
    script.onload = () => { this.mostrar3d = true; };
    script.onerror = () => { this.mostrar3d = false; };
    document.head.appendChild(script);
  }

  /** El visor avisa cuando termino de cargar la escena. */
  alCargarEscena() {
    this.escenaLista = true;
  }
}
