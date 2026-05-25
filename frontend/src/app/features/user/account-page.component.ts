import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    IconComponent,
    TranslatePipe
  ],
  template: `
    <section class="mx-auto grid max-w-3xl gap-5">
      <div>
        <p class="eyebrow">{{ 'accountEyebrow' | t }}</p>
        <h1 class="mt-1 text-3xl font-black">{{ 'account' | t }}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 muted">{{ 'accountIntro' | t }}</p>
      </div>

      <div class="panel grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
        <div class="min-w-0">
          <span class="grid size-12 place-items-center rounded-lg" style="background: var(--accent-soft); color: var(--accent-strong)">
            <app-icon name="userRound" [size]="22"></app-icon>
          </span>
          <h2 class="mt-4 text-xl font-semibold">{{ 'profile' | t }}</h2>
          <p class="safe-text mt-2 text-sm muted">{{ email }}</p>
        </div>

        <form class="grid min-w-0 gap-3" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <label class="grid gap-1 text-sm">
            {{ 'name' | t }}
            <input class="field" formControlName="display_name">
          </label>
          <label class="grid gap-1 text-sm">
            {{ 'city' | t }}
            <input class="field" formControlName="city">
          </label>
          <button class="btn btn-primary w-fit" type="submit" [disabled]="profileForm.invalid">
            <app-icon name="save"></app-icon>
            {{ 'save' | t }}
          </button>
          <p *ngIf="message" class="rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
            {{ message }}
          </p>
        </form>
      </div>
    </section>
  `
})
export class AccountPageComponent implements OnInit {
  email = '';
  message = '';

  readonly profileForm = this.fb.nonNullable.group({
    display_name: ['', Validators.required],
    city: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.api.profile().subscribe((profile) => {
      this.email = profile.email;
      this.profileForm.patchValue({
        display_name: profile.display_name,
        city: profile.city ?? ''
      });
    });
  }

  saveProfile(): void {
    this.api.updateProfile(this.profileForm.getRawValue()).subscribe(() => {
      this.message = this.i18n.translate('profileUpdated');
    });
  }
}
