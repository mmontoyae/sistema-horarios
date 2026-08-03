import { Routes } from '@angular/router';
import { InicioComponent } from './paginas/inicio/inicio.component';
import { ImportacionComponent } from './paginas/importacion/importacion.component';
import { HorarioComponent } from './paginas/horario/horario.component';
import { ConflictosComponent } from './paginas/conflictos/conflictos.component';

export const rutas: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'importacion', component: ImportacionComponent },
  { path: 'horario', component: HorarioComponent },
  { path: 'conflictos', component: ConflictosComponent },
  { path: '**', redirectTo: 'inicio' }
];
