import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="cinta-demo" *ngIf="modoDemo">
      Modo demostracion · la validacion se ejecuta en el navegador, sin backend ni base de datos
    </div>

    <nav class="barra" [class.barra-solida]="!esInicio || menuAbierto" [class.barra-con-cinta]="modoDemo">
      <a routerLink="/inicio" class="logo" (click)="cerrarMenu()">
        <img src="assets/escudo-upse.webp" alt="Universidad Estatal Peninsula de Santa Elena">
        <span class="logo-texto">
          <strong>UPSE</strong>
          <small>Sistema de Horarios</small>
        </span>
      </a>

      <div class="enlaces">
        <a routerLink="/importacion" routerLinkActive="activo">Importar</a>
        <a routerLink="/horario" routerLinkActive="activo">Propuesta</a>
        <a routerLink="/conflictos" routerLinkActive="activo">Horario</a>
      </div>

      <a routerLink="/importacion" class="boton-barra">Comenzar</a>

      <button
        type="button"
        class="boton-menu"
        [class.abierto]="menuAbierto"
        (click)="alternarMenu()"
        [attr.aria-expanded]="menuAbierto"
        aria-label="Abrir menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>

    <div class="menu-movil" [class.visible]="menuAbierto">
      <a routerLink="/inicio" routerLinkActive="activo" (click)="cerrarMenu()">Inicio</a>
      <a routerLink="/importacion" routerLinkActive="activo" (click)="cerrarMenu()">Importar</a>
      <a routerLink="/horario" routerLinkActive="activo" (click)="cerrarMenu()">Propuesta</a>
      <a routerLink="/conflictos" routerLinkActive="activo" (click)="cerrarMenu()">Horario</a>
    </div>

    <router-outlet></router-outlet>
  `,
  styles: [`
    .cinta-demo {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 60;
      background: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
      text-align: center;
      padding: 6px 14px;
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .barra-con-cinta { top: 28px; }

    .barra {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 26px;
      transition: background 0.3s ease, border-color 0.3s ease;
      border-bottom: 1px solid transparent;
    }

    .barra-solida {
      background: hsl(0 0% 100% / 0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom-color: hsl(var(--border));
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .logo img {
      height: 38px;
      width: auto;
      display: block;
    }

    /* bloque de marca: nombre de la universidad y del modulo */
    .logo-texto {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding-left: 13px;
      position: relative;
    }

    .logo-texto::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 1px;
      height: 26px;
      background: hsl(var(--border));
    }

    .logo-texto strong {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: hsl(var(--primary));
      line-height: 1;
    }

    .logo-texto small {
      font-size: 0.6rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: hsl(var(--muted-foreground));
      line-height: 1;
    }

    @media (max-width: 480px) {
      .logo img { height: 32px; }
      .logo-texto small { display: none; }
    }

    .enlaces {
      display: none;
      gap: 34px;
    }

    .enlaces a {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: hsl(var(--muted-foreground));
      text-decoration: none;
      padding-bottom: 4px;
      border-bottom: 1px solid transparent;
      transition: color 0.2s ease, border-color 0.2s ease;
    }

    .enlaces a:hover { color: hsl(var(--foreground)); }

    .enlaces a.activo {
      color: hsl(var(--foreground));
      border-bottom-color: hsl(var(--primary));
    }

    .boton-barra {
      display: none;
      background: hsl(var(--nav-button));
      color: hsl(var(--primary-foreground));
      text-decoration: none;
      padding: 11px 24px;
      border-radius: var(--radius);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      transition: background 0.2s ease, transform 0.1s ease;
    }

    .boton-barra:hover { background: hsl(207 100% 20%); }
    .boton-barra:active { transform: scale(0.97); }

    .boton-menu {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      width: 34px;
      height: 34px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 70;
    }

    .boton-menu span {
      display: block;
      width: 22px;
      height: 2px;
      background: hsl(var(--foreground));
      transition: transform 0.25s ease, opacity 0.2s ease;
    }

    .boton-menu.abierto span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .boton-menu.abierto span:nth-child(2) { opacity: 0; }
    .boton-menu.abierto span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    .menu-movil {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: min(78vw, 300px);
      background: hsl(var(--background));
      box-shadow: -8px 0 30px hsl(207 30% 20% / 0.1);
      border-left: 1px solid hsl(var(--border));
      z-index: 55;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 96px 28px 28px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }

    .menu-movil.visible { transform: translateX(0); }

    .menu-movil a {
      color: hsl(var(--foreground));
      text-decoration: none;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 14px 0;
      border-bottom: 1px solid hsl(var(--border));
    }

    .menu-movil a.activo { color: hsl(var(--primary)); }

    @media (min-width: 768px) {
      .enlaces { display: flex; }
      .boton-barra { display: inline-flex; }
      .boton-menu { display: none; }
      .menu-movil { display: none; }
      .barra { padding: 20px 64px; }
    }
  `]
})
export class AppComponent {
  esInicio = true;
  modoDemo = environment.modoDemo;
  menuAbierto = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.esInicio = url === '/' || url.startsWith('/inicio');
        this.menuAbierto = false;
      });
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }
}
