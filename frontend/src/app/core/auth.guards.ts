import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.authenticated) {
    return true;
  }
  return router.createUrlTree(['/auth'], {
    queryParams: { mode: 'login', returnUrl: state.url }
  });
};

export function roleGuard(role: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.hasRole(role) || auth.hasRole('admin')) {
      return true;
    }
    return router.createUrlTree(['/']);
  };
}

export const notBannedGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.profile().pipe(
    map((profile) => profile.is_banned ? router.createUrlTree(['/banned']) : true),
    catchError((error) => of(error.status === 403 ? router.createUrlTree(['/banned']) : true))
  );
};
