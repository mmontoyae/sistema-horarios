import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <h1>Sistema de Horarios Universitarios</h1>
      <nav>
        <a routerLink="/importacion" routerLinkActive="activo">Importar datos</a>
        <a routerLink="/horario" routerLinkActive="activo">Propuesta de horario</a>
        <a routerLink="/conflictos" routerLinkActive="activo">Horario y conflictos</a>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    header {
      background: #1b3a5c;
      color: white;
      padding: 14px 24px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 20px;
    }
    nav a {
      color: #cfe0f0;
      margin-right: 18px;
      text-decoration: none;
      padding-bottom: 4px;
    }
    nav a.activo {
      color: white;
      border-bottom: 2px solid #f0a500;
    }
    main {
      padding: 20px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {}
