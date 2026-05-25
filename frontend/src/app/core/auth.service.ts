import { Injectable } from '@angular/core';
import Keycloak, { KeycloakProfile } from 'keycloak-js';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SessionState {
  authenticated: boolean;
  profile: KeycloakProfile | null;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId
  });

  private readonly sessionSubject = new BehaviorSubject<SessionState>({
    authenticated: false,
    profile: null,
    roles: []
  });

  readonly session$ = this.sessionSubject.asObservable();

  get token(): string | undefined {
    return this.keycloak.token;
  }

  get authenticated(): boolean {
    return this.sessionSubject.value.authenticated;
  }

  get roles(): string[] {
    return this.sessionSubject.value.roles;
  }

  async init(): Promise<void> {
    const authenticated = await this.keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${window.location.origin}/assets/silent-check-sso.html`
    });

    const profile = authenticated ? await this.keycloak.loadUserProfile() : null;
    this.sessionSubject.next({
      authenticated,
      profile,
      roles: this.collectRoles()
    });
  }

  async ensureFreshToken(): Promise<void> {
    if (this.keycloak.authenticated) {
      await this.keycloak.updateToken(30);
    }
  }

  login(): Promise<void> {
    return this.keycloak.login();
  }

  register(): Promise<void> {
    return this.keycloak.register();
  }

  account(): Promise<void> {
    return this.keycloak.accountManagement();
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: window.location.origin });
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  private collectRoles(): string[] {
    const realmRoles = this.keycloak.realmAccess?.roles ?? [];
    const clientRoles = this.keycloak.resourceAccess?.[environment.keycloak.clientId]?.roles ?? [];
    return Array.from(new Set([...realmRoles, ...clientRoles]));
  }
}

