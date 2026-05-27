import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

type AuthMode = 'login' | 'register';

@Component({
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IconComponent, TranslatePipe],
  template: `
    <section class="grid min-h-[calc(100vh-10rem)] items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,460px)]">
      <div class="min-w-0">
        <p class="eyebrow">{{ 'authEyebrow' | t }}</p>
        <h1 class="mt-2 max-w-2xl text-3xl font-black leading-tight text-balance md:text-5xl">
          {{ mode === 'login' ? ('authLoginTitle' | t) : ('authRegisterTitle' | t) }}
        </h1>
        <p class="mt-3 max-w-2xl leading-7 muted">
          {{ 'authIntro' | t }}
        </p>
      </div>

      <div class="panel min-w-0 p-4 sm:p-5">
        <div class="grid grid-cols-2 gap-2 rounded-lg border p-1" style="border-color: var(--line); background: var(--surface-muted)">
          <button class="btn" [class.btn-primary]="mode === 'login'" [class.btn-muted]="mode !== 'login'" type="button" (click)="setMode('login')">
            <app-icon name="login"></app-icon>
            {{ 'login' | t }}
          </button>
          <button class="btn" [class.btn-primary]="mode === 'register'" [class.btn-muted]="mode !== 'register'" type="button" (click)="setMode('register')">
            <app-icon name="userPlus"></app-icon>
            {{ 'register' | t }}
          </button>
        </div>

        <form *ngIf="mode === 'login'" class="mt-5 grid gap-3" [formGroup]="loginForm" (ngSubmit)="submitLogin()">
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'email' | t }}</span>
            <input class="field" type="email" autocomplete="email" formControlName="email">
          </label>
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'password' | t }}</span>
            <input class="field" type="password" autocomplete="current-password" formControlName="password">
          </label>
          <button class="btn btn-primary mt-2 w-full" type="submit" [disabled]="submitting || loginForm.invalid">
            <app-icon name="login"></app-icon>
            {{ 'login' | t }}
          </button>
        </form>

        <form *ngIf="mode === 'register'" class="mt-5 grid gap-3" [formGroup]="registerForm" (ngSubmit)="submitRegister()">
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'displayName' | t }}</span>
            <input class="field" autocomplete="name" formControlName="displayName">
          </label>
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'email' | t }}</span>
            <input class="field" type="email" autocomplete="email" formControlName="email">
          </label>
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'password' | t }}</span>
            <input class="field" type="password" autocomplete="new-password" formControlName="password">
          </label>
          <label class="grid gap-1">
            <span class="text-sm font-semibold">{{ 'confirmPassword' | t }}</span>
            <input class="field" type="password" autocomplete="new-password" formControlName="confirmPassword">
          </label>
          <button class="btn btn-primary mt-2 w-full" type="submit" [disabled]="submitting || registerForm.invalid">
            <app-icon name="userPlus"></app-icon>
            {{ 'register' | t }}
          </button>
        </form>

        <p *ngIf="message" class="mt-4 rounded-lg p-3 text-sm" style="background: var(--surface-muted); color: var(--danger)">
          {{ message }}
        </p>
      </div>
    </section>
  `
})
export class AuthPageComponent implements OnInit {
  mode: AuthMode = 'login';
  returnUrl = '/';
  submitting = false;
  message = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.mode = params.get('mode') === 'register' ? 'register' : 'login';
      this.returnUrl = params.get('returnUrl') || '/';
      this.message = '';
    });
  }

  setMode(mode: AuthMode): void {
    void this.router.navigate(['/auth'], {
      queryParams: { mode, returnUrl: this.returnUrl }
    });
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    const value = this.loginForm.getRawValue();
    await this.submit(() => this.auth.signIn(value.email, value.password));
  }

  async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }
    const value = this.registerForm.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.message = this.i18n.translate('passwordsMismatch');
      return;
    }
    await this.submit(() => this.auth.signUp(value.email, value.password, value.displayName));
  }

  private async submit(action: () => Promise<void>): Promise<void> {
    this.submitting = true;
    this.message = '';
    try {
      await action();
      await this.router.navigateByUrl(this.safeReturnUrl());
    } catch (error: any) {
      this.message = error?.message ?? this.i18n.translate('authFailed');
    } finally {
      this.submitting = false;
    }
  }

  private safeReturnUrl(): string {
    return this.returnUrl.startsWith('/') && !this.returnUrl.startsWith('//') ? this.returnUrl : '/';
  }
}
