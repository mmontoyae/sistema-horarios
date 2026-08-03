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

    <nav class="barra" [class.barra-solida]="!esInicio" [class.barra-con-cinta]="modoDemo">
      <a routerLink="/inicio" class="logo">
        HORARIOS<span class="logo-acento">UPSE</span>
      </a>

      <div class="enlaces">
        <a routerLink="/importacion" routerLinkActive="activo">Importar</a>
        <a routerLink="/horario" routerLinkActive="activo">Propuesta</a>
        <a routerLink="/conflictos" routerLinkActive="activo">Horario</a>
      </div>

      <a routerLink="/importacion" class="boton-barra">Comenzar</a>
    </nav>

    <router-outlet></router-outlet>
  `,
  styles: [`
    .cinta-demo {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 60;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
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
      background: hsl(var(--hero-bg) / 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom-color: hsl(var(--border));
    }

    .logo {
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: hsl(var(--foreground));
      text-decoration: none;
    }

    .logo-acento {
      color: hsl(var(--primary));
      margin-left: 5px;
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
      color: hsl(var(--foreground));
      text-decoration: none;
      padding: 11px 24px;
      border-radius: var(--radius);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      transition: background 0.2s ease, transform 0.1s ease;
    }

    .boton-barra:hover { background: hsl(0 0% 26%); }
    .boton-barra:active { transform: scale(0.97); }

    @media (min-width: 768px) {
      .enlaces { display: flex; }
      .boton-barra { display: inline-flex; }
      .barra { padding: 20px 64px; }
    }
  `]
})
export class AppComponent {
  esInicio = true;
  modoDemo = environment.modoDemo;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.esInicio = url === '/' || url.startsWith('/inicio');
      });
  }
}
