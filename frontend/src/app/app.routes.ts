import { Routes } from '@angular/router';

import { authGuard, notBannedGuard, roleGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/events-page.component').then((m) => m.EventsPageComponent)
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/public/event-detail-page.component').then((m) => m.EventDetailPageComponent)
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page.component').then((m) => m.AuthPageComponent)
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
    path: 'organizer/new',
    canActivate: [authGuard, notBannedGuard, roleGuard('organizer')],
    loadComponent: () =>
      import('./features/organizer/organizer-event-form-page.component').then((m) => m.OrganizerEventFormPageComponent)
  },
  {
    path: 'organizer/:id/edit',
    canActivate: [authGuard, notBannedGuard, roleGuard('organizer')],
    loadComponent: () =>
      import('./features/organizer/organizer-event-form-page.component').then((m) => m.OrganizerEventFormPageComponent)
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
