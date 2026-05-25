import { Routes } from '@angular/router';

import { authGuard, notBannedGuard, roleGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/events-page.component').then((m) => m.EventsPageComponent)
  },
  {
    path: 'banned',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/user/banned-page.component').then((m) => m.BannedPageComponent)
  },
  {
    path: 'account',
    canActivate: [authGuard, notBannedGuard],
    loadComponent: () =>
      import('./features/user/account-page.component').then((m) => m.AccountPageComponent)
  },
  {
    path: 'tickets',
    canActivate: [authGuard, notBannedGuard],
    loadComponent: () =>
      import('./features/user/tickets-page.component').then((m) => m.TicketsPageComponent)
  },
  {
    path: 'organizer',
    canActivate: [authGuard, notBannedGuard, roleGuard('organizer')],
    loadComponent: () =>
      import('./features/organizer/organizer-page.component').then((m) => m.OrganizerPageComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () =>
      import('./features/admin/admin-page.component').then((m) => m.AdminPageComponent)
  },
  { path: '**', redirectTo: '' }
];
