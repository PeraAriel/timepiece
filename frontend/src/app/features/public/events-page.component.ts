import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { EventHubEvent } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="grid gap-6">
      <div class="min-w-0 space-y-5">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] lg:items-end">
          <div class="min-w-0">
            <p class="eyebrow">{{ 'eventsEyebrow' | t }}</p>
            <h1 class="mt-2 max-w-3xl text-3xl font-black leading-tight text-balance md:text-5xl">{{ 'eventsHeadline' | t }}</h1>
            <p class="mt-3 max-w-2xl leading-7 muted">
              {{ 'eventsIntro' | t }}
            </p>
          </div>
          <form class="panel grid min-w-0 gap-2 p-3 sm:grid-cols-2" [formGroup]="filters" (ngSubmit)="loadEvents()">
            <label>
              <span class="sr-only">{{ 'search' | t }}</span>
              <input class="field" formControlName="q" [placeholder]="'search' | t">
            </label>
            <label>
              <span class="sr-only">{{ 'category' | t }}</span>
              <input class="field" formControlName="category" [placeholder]="'category' | t">
            </label>
            <label>
              <span class="sr-only">{{ 'city' | t }}</span>
              <input class="field" formControlName="city" [placeholder]="'city' | t">
            </label>
            <label>
              <span class="sr-only">{{ 'maxPrice' | t }}</span>
              <input class="field" type="number" min="0" formControlName="price_max" [placeholder]="'maxPrice' | t">
            </label>
            <button class="btn btn-primary sm:col-span-2" type="submit">
              <app-icon name="search"></app-icon>
              <span>{{ 'search' | t }}</span>
            </button>
          </form>
        </div>

        <div *ngIf="events.length === 0" class="empty-state">
          <span class="badge badge-accent"><app-icon name="calendar" [size]="14"></app-icon> {{ 'noEventResultsBadge' | t }}</span>
          <h2 class="text-xl font-semibold">{{ 'noEventResultsTitle' | t }}</h2>
          <p class="max-w-xl text-sm leading-6 muted">{{ 'noEventResultsText' | t }}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <article
            *ngFor="let event of events"
            class="panel min-w-0 overflow-hidden transition hover:-translate-y-0.5"
          >
            <a class="block h-full w-full text-left" [routerLink]="['/events', event.id]">
              <div class="relative aspect-[4/3] overflow-hidden border-b cover-fallback" style="border-color: var(--line)">
                <img
                  *ngIf="event.cover_url"
                  class="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
                  [src]="apiBase + event.cover_url"
                  [alt]="event.title"
                >
                <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4" style="background: linear-gradient(180deg, transparent, oklch(18% 0.03 74 / 0.72))">
                  <span class="badge" style="background: color-mix(in oklch, var(--surface-raised), transparent 8%); color: var(--ink)">{{ event.category }}</span>
                  <span *ngIf="event.is_featured" class="badge badge-copper">
                    <app-icon name="star" [size]="14"></app-icon>
                    {{ 'featured' | t }}
                  </span>
                </div>
              </div>
              <div class="grid min-h-[17rem] content-between gap-4 p-4">
                <div class="min-w-0 space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <h2 class="safe-text text-xl font-black leading-snug">{{ event.title }}</h2>
                    <span class="shrink-0 font-semibold">{{ formatPrice(event.price_cents) }}</span>
                  </div>
                  <p class="line-clamp-3 text-sm leading-6 muted">{{ event.description }}</p>
                </div>
                <div class="grid gap-3">
                  <dl class="grid gap-2 text-sm muted">
                    <div class="flex min-w-0 items-center gap-2">
                      <app-icon name="clock" [size]="16"></app-icon>
                      <span class="safe-text">{{ event.starts_at | date:'mediumDate':undefined:i18n.locale }} · {{ event.starts_at | date:'shortTime':undefined:i18n.locale }}</span>
                    </div>
                    <div class="flex min-w-0 items-center gap-2">
                      <app-icon name="map" [size]="16"></app-icon>
                      <span class="safe-text">{{ event.city }}, {{ event.venue }}</span>
                    </div>
                  </dl>
                  <div class="flex items-center justify-between gap-3">
                    <span class="badge">{{ event.available_seats }} {{ 'available' | t }}</span>
                    <span class="btn btn-muted pointer-events-none">
                      {{ 'eventDetails' | t }}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          </article>
        </div>
      </div>
    </section>
  `
})
export class EventsPageComponent implements OnInit {
  readonly apiBase = environment.apiBaseUrl.replace(/\/api$/, '');
  events: EventHubEvent[] = [];

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    category: [''],
    city: [''],
    price_max: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    const raw = this.filters.getRawValue();
    const priceMax = raw.price_max ? Number(raw.price_max) * 100 : '';
    this.api.events({ ...raw, price_max: priceMax }).subscribe((response) => {
      this.events = response.items;
    });
  }

  formatPrice(cents: number): string {
    if (cents === 0) {
      return this.i18n.translate('free');
    }
    const locale = this.i18n.lang === 'it' ? 'it-IT' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
}
