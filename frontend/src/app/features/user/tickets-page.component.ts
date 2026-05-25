import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { Ticket } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside class="panel h-fit min-w-0 p-5 lg:sticky lg:top-28">
        <div class="mb-5 flex min-w-0 items-center gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-lg" style="background: var(--accent-soft); color: var(--accent-strong)">
            <app-icon name="userRound" [size]="20"></app-icon>
          </span>
          <div class="min-w-0">
            <h1 class="text-xl font-semibold">{{ 'profile' | t }}</h1>
            <p class="safe-text text-sm muted">{{ email }}</p>
          </div>
        </div>
        <p class="mb-4 text-sm leading-6 muted">{{ 'profileHelp' | t }}</p>
        <form class="grid gap-3" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <label class="grid gap-1 text-sm">
            {{ 'name' | t }}
            <input class="field" formControlName="display_name">
          </label>
          <label class="grid gap-1 text-sm">
            {{ 'city' | t }}
            <input class="field" formControlName="city">
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="profileForm.invalid">
            <app-icon name="save"></app-icon>
            {{ 'save' | t }}
          </button>
        </form>
        <p *ngIf="message" class="mt-3 rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
          {{ message }}
        </p>
      </aside>

      <div class="min-w-0 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <p class="eyebrow">{{ 'personalPasses' | t }}</p>
            <h2 class="mt-1 text-3xl font-black">{{ 'tickets' | t }}</h2>
            <p class="text-sm muted">{{ 'ticketsIntro' | t }}</p>
          </div>
          <button class="btn btn-muted" type="button" (click)="load()">
            <app-icon name="refresh"></app-icon>
            {{ 'refresh' | t }}
          </button>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <article *ngFor="let ticket of tickets" class="panel grid min-w-0 gap-4 p-4 sm:grid-cols-[132px_minmax(0,1fr)]">
            <div class="grid place-items-center rounded-lg p-3" style="background: var(--surface-muted)">
              <img class="size-28 rounded-md border" style="border-color: var(--line)" [src]="ticket.qr_code_data_url" [alt]="ticket.event.title">
            </div>
            <div class="min-w-0 space-y-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <span class="badge badge-accent">
                    <app-icon name="ticketCheck" [size]="14"></app-icon>
                    #{{ ticket.id }}
                  </span>
                  <h3 class="safe-text mt-2 text-lg font-black leading-snug">{{ ticket.event.title }}</h3>
                </div>
                <button class="btn btn-danger shrink-0" type="button" (click)="cancel(ticket)">{{ 'cancel' | t }}</button>
              </div>
              <dl class="grid gap-2 text-sm muted">
                <div class="flex justify-between gap-4 border-b pb-2" style="border-color: var(--line)"><span>{{ 'date' | t }}</span><strong class="safe-text text-right">{{ ticket.event.starts_at | date:'medium':undefined:i18n.locale }}</strong></div>
                <div class="flex justify-between gap-4 border-b pb-2" style="border-color: var(--line)"><span>{{ 'city' | t }}</span><strong class="safe-text text-right">{{ ticket.event.city }}</strong></div>
                <div class="grid gap-1">
                  <span>{{ 'qrPayload' | t }}</span>
                  <code class="safe-text rounded-md px-2 py-1 text-xs" style="background: var(--surface-muted); color: var(--ink)">{{ ticket.qr_payload }}</code>
                </div>
              </dl>
            </div>
          </article>

          <div *ngIf="tickets.length === 0" class="empty-state xl:col-span-2">
            <span class="badge badge-accent"><app-icon name="ticket" [size]="14"></app-icon> {{ 'emptyTicketArchive' | t }}</span>
            <h3 class="font-semibold">{{ 'noActiveTickets' | t }}</h3>
            <p class="max-w-xl text-sm muted">{{ 'noActiveTicketsText' | t }}</p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class TicketsPageComponent implements OnInit {
  tickets: Ticket[] = [];
  email = '';
  message = '';

  readonly profileForm = this.fb.nonNullable.group({
    display_name: ['', Validators.required],
    city: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.profile().subscribe((profile) => {
      this.email = profile.email;
      this.profileForm.patchValue({
        display_name: profile.display_name,
        city: profile.city ?? ''
      });
    });
    this.api.tickets().subscribe((response) => {
      this.tickets = response.items;
    });
  }

  saveProfile(): void {
    this.api.updateProfile(this.profileForm.getRawValue()).subscribe(() => {
      this.message = this.i18n.translate('profileUpdated');
    });
  }

  cancel(ticket: Ticket): void {
    this.api.unregister(ticket.event.id).subscribe(() => {
      this.message = this.i18n.translate('registrationCancelled');
      this.load();
    });
  }
}
