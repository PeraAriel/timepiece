import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';
import { IconComponent } from './shared/icon.component';
import { TranslatePipe } from './shared/t.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IconComponent,
    TranslatePipe
  ],
  template: `
    <div class="min-h-screen">
      <header class="sticky top-0 z-20 border-b backdrop-blur" style="background: color-mix(in oklch, var(--surface-raised), transparent 8%); border-color: var(--line)">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <a routerLink="/" class="app-link flex min-w-0 items-center gap-3 font-semibold tracking-normal">
            <span class="grid size-10 shrink-0 place-items-center rounded-lg text-sm font-black" style="background: linear-gradient(135deg, var(--accent), var(--copper)); color: var(--accent-ink)">
              EH
            </span>
            <span class="min-w-0">
              <span class="block leading-tight">EventHub</span>
              <span class="hidden text-xs font-medium sm:block" style="color: var(--ink-muted)">{{ 'appTagline' | t }}</span>
            </span>
          </a>

          <nav class="hidden items-center gap-1 md:flex">
            <a class="btn btn-muted app-link" routerLink="/" routerLinkActive="btn-primary" [routerLinkActiveOptions]="{ exact: true }">
              <app-icon name="calendar"></app-icon>
              {{ 'events' | t }}
            </a>
            <a class="btn btn-muted app-link" routerLink="/tickets" routerLinkActive="btn-primary">
              <app-icon name="ticket"></app-icon>
              {{ 'tickets' | t }}
            </a>
            <a *ngIf="auth.hasRole('organizer') || auth.hasRole('admin')" class="btn btn-muted app-link" routerLink="/organizer" routerLinkActive="btn-primary">
              <app-icon name="userCog"></app-icon>
              {{ 'organizer' | t }}
            </a>
            <a *ngIf="auth.hasRole('admin')" class="btn btn-muted app-link" routerLink="/admin" routerLinkActive="btn-primary">
              <app-icon name="shield"></app-icon>
              {{ 'admin' | t }}
            </a>
          </nav>

          <div class="flex min-w-0 items-center gap-2">
            <button class="btn btn-muted mobile-icon-btn" type="button" (click)="toggleLang()" [attr.aria-label]="i18n.lang === 'it' ? 'English' : 'Italiano'">
              <app-icon name="language"></app-icon>
              <span class="hidden sm:inline">{{ i18n.lang.toUpperCase() }}</span>
            </button>
            <button class="btn btn-muted mobile-icon-btn" type="button" (click)="toggleTheme()" [attr.aria-label]="dark ? ('light' | t) : ('dark' | t)">
              <app-icon *ngIf="!dark" name="moon"></app-icon>
              <app-icon *ngIf="dark" name="sun"></app-icon>
            </button>
            <ng-container *ngIf="auth.session$ | async as session">
              <button *ngIf="!session.authenticated" class="btn btn-muted hidden sm:inline-flex" type="button" (click)="auth.register()">
                <app-icon name="userPlus"></app-icon>
                {{ 'register' | t }}
              </button>
              <button *ngIf="!session.authenticated" class="btn btn-primary" type="button" (click)="auth.login()">
                <app-icon name="login"></app-icon>
                <span class="hidden sm:inline">{{ 'login' | t }}</span>
              </button>
              <a *ngIf="session.authenticated" class="btn btn-muted app-link hidden sm:inline-flex" routerLink="/account" routerLinkActive="btn-primary">
                {{ 'account' | t }}
              </a>
              <button *ngIf="session.authenticated" class="btn btn-muted mobile-icon-btn" type="button" (click)="auth.logout()">
                <app-icon name="logout"></app-icon>
                <span class="hidden sm:inline">{{ 'logout' | t }}</span>
              </button>
            </ng-container>
          </div>
        </div>
        <nav class="flex gap-1 overflow-x-auto border-t px-2 py-2 md:hidden" style="border-color: var(--line)">
          <a class="btn btn-muted app-link flex-1" routerLink="/" routerLinkActive="btn-primary" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-label]="'events' | t">
            <app-icon name="calendar"></app-icon>
            <span class="sr-only">{{ 'events' | t }}</span>
          </a>
          <a class="btn btn-muted app-link flex-1" routerLink="/tickets" routerLinkActive="btn-primary" [attr.aria-label]="'tickets' | t">
            <app-icon name="ticket"></app-icon>
            <span class="sr-only">{{ 'tickets' | t }}</span>
          </a>
          <a *ngIf="auth.hasRole('organizer') || auth.hasRole('admin')" class="btn btn-muted app-link flex-1" routerLink="/organizer" routerLinkActive="btn-primary" [attr.aria-label]="'organizer' | t">
            <app-icon name="userCog"></app-icon>
            <span class="sr-only">{{ 'organizer' | t }}</span>
          </a>
          <a *ngIf="auth.hasRole('admin')" class="btn btn-muted app-link flex-1" routerLink="/admin" routerLinkActive="btn-primary" [attr.aria-label]="'admin' | t">
            <app-icon name="shield"></app-icon>
            <span class="sr-only">{{ 'admin' | t }}</span>
          </a>
        </nav>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AppComponent implements OnDestroy {
  dark = true;
  private banned = false;
  private readonly subscription: Subscription;

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    readonly auth: AuthService,
    readonly i18n: I18nService
  ) {
    document.documentElement.classList.add('dark');

    this.subscription = this.auth.session$.subscribe((session) => {
      if (!session.authenticated) {
        this.banned = false;
        return;
      }

      this.api.profile().subscribe({
        next: (profile) => {
          this.banned = profile.is_banned;
          if (profile.is_banned && this.router.url !== '/banned') {
            void this.router.navigateByUrl('/banned');
          }
        },
        error: (error) => {
          if (error.status === 403) {
            this.banned = true;
            if (this.router.url !== '/banned') {
              void this.router.navigateByUrl('/banned');
            }
          }
        }
      });
    });

    this.subscription.add(this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && this.banned && event.urlAfterRedirects !== '/banned') {
        void this.router.navigateByUrl('/banned');
      }
    }));
  }

  toggleLang() {
    this.i18n.toggle();
  }

  toggleTheme() {
    this.dark = !this.dark;
    document.documentElement.classList.toggle('dark', this.dark);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
