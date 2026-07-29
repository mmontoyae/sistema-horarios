import { Routes } from '@angular/router';
import { ImportacionComponent } from './paginas/importacion/importacion.component';
import { HorarioComponent } from './paginas/horario/horario.component';
import { ConflictosComponent } from './paginas/conflictos/conflictos.component';

export const rutas: Routes = [
  { path: '', redirectTo: 'importacion', pathMatch: 'full' },
  { path: 'importacion', component: ImportacionComponent },
  { path: 'horario', component: HorarioComponent },
  { path: 'conflictos', component: ConflictosComponent }
];
