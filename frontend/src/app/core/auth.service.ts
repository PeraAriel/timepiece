import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthProfile {
  id?: number;
  keycloak_sub?: string;
  email: string;
  display_name: string;
  city?: string | null;
  is_banned?: boolean;
}

export interface SessionState {
  authenticated: boolean;
  profile: AuthProfile | null;
  roles: string[];
}

interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
  profile: AuthProfile | null;
  roles: string[];
}

interface AuthApiResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  profile: AuthProfile;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authBaseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly storageKey = 'eventhub.session';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private readonly sessionSubject = new BehaviorSubject<SessionState>({
    authenticated: false,
    profile: null,
    roles: []
  });

  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly router: Router) {}

  get token(): string | undefined {
    return this.accessToken ?? undefined;
  }

  get authenticated(): boolean {
    return this.sessionSubject.value.authenticated;
  }

  get roles(): string[] {
    return this.sessionSubject.value.roles;
  }

  async init(): Promise<void> {
    const stored = this.readStoredSession();
    if (!stored) {
      return;
    }

    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
    this.sessionSubject.next({
      authenticated: true,
      profile: stored.profile,
      roles: stored.roles.length > 0 ? stored.roles : this.collectRoles(stored.accessToken)
    });

    try {
      await this.ensureFreshToken();
    } catch {
      this.clearSession();
    }
  }

  async ensureFreshToken(): Promise<void> {
    if (!this.accessToken || !this.refreshToken || !this.tokenExpiresSoon(this.accessToken)) {
      return;
    }

    const response = await this.post<AuthApiResponse>('/refresh', {
      refresh_token: this.refreshToken
    });
    this.applySession(response);
  }

  login(returnUrl?: string): Promise<boolean> {
    return this.router.navigate(['/auth'], {
      queryParams: { mode: 'login', returnUrl: returnUrl ?? this.router.url }
    });
  }

  register(returnUrl?: string): Promise<boolean> {
    return this.router.navigate(['/auth'], {
      queryParams: { mode: 'register', returnUrl: returnUrl ?? this.router.url }
    });
  }

  account(): Promise<boolean> {
    return this.router.navigate(['/account']);
  }

  async logout(): Promise<void> {
    this.clearSession();
    await this.router.navigateByUrl('/');
  }

  async signIn(email: string, password: string): Promise<void> {
    const response = await this.post<AuthApiResponse>('/login', { email, password });
    this.applySession(response);
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const response = await this.post<AuthApiResponse>('/register', {
      email,
      password,
      display_name: displayName
    });
    this.applySession(response);
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.authBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw payload;
    }
    return payload as T;
  }

  private applySession(response: AuthApiResponse): void {
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token ?? null;
    const roles = response.roles?.length ? response.roles : this.collectRoles(response.access_token);
    const stored: StoredSession = {
      accessToken: response.access_token,
      refreshToken: this.refreshToken,
      profile: response.profile,
      roles
    };
    localStorage.setItem(this.storageKey, JSON.stringify(stored));
    this.sessionSubject.next({
      authenticated: true,
      profile: response.profile,
      roles
    });
  }

  private clearSession(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next({
      authenticated: false,
      profile: null,
      roles: []
    });
  }

  private readStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed.accessToken) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private tokenExpiresSoon(token: string): boolean {
    const claims = this.decodeJwt(token);
    if (!claims?.exp) {
      return false;
    }
    const expiresAt = claims.exp * 1000;
    return expiresAt - Date.now() < 30_000;
  }

  private collectRoles(token: string): string[] {
    const claims = this.decodeJwt(token);
    const realmRoles = claims?.realm_access?.roles ?? [];
    const clientRoles = claims?.resource_access?.[environment.keycloak.clientId]?.roles ?? [];
    return Array.from(new Set([...realmRoles, ...clientRoles]));
  }

  private decodeJwt(token: string): any | null {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const bytes = Uint8Array.from(window.atob(padded), (char) => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }
}
