import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { EventHubEvent, Review } from '../../core/types';
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
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
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
            class="panel min-w-0 overflow-hidden transition"
            [class.ring-2]="selected?.id === event.id"
            style="--tw-ring-color: var(--accent)"
          >
            <button class="block h-full w-full text-left" type="button" (click)="select(event)">
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
                    <span class="text-sm font-semibold" style="color: var(--accent-strong)">{{ 'eventDetails' | t }}</span>
                  </div>
                </div>
              </div>
            </button>
          </article>
        </div>
      </div>

      <aside class="panel h-fit min-w-0 p-5 xl:sticky xl:top-28" *ngIf="selected as event">
        <div class="space-y-5">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-accent">{{ event.category }}</span>
              <span class="badge">{{ event.starts_at | date:'mediumDate':undefined:i18n.locale }}</span>
            </div>
            <h2 class="safe-text mt-4 text-2xl font-black leading-tight">{{ event.title }}</h2>
            <p class="mt-3 text-sm leading-6 muted">{{ event.description }}</p>
          </div>
          <div class="grid gap-2 text-sm">
            <div class="flex justify-between gap-4 border-b py-2" style="border-color: var(--line)"><span class="muted">{{ 'city' | t }}</span><strong class="safe-text text-right">{{ event.city }}</strong></div>
            <div class="flex justify-between gap-4 border-b py-2" style="border-color: var(--line)"><span class="muted">{{ 'venue' | t }}</span><strong class="safe-text text-right">{{ event.venue }}</strong></div>
            <div class="flex justify-between gap-4 border-b py-2" style="border-color: var(--line)"><span class="muted">{{ 'price' | t }}</span><strong>{{ formatPrice(event.price_cents) }}</strong></div>
            <div class="flex justify-between gap-4 py-2"><span class="muted">{{ 'rating' | t }}</span><strong>{{ event.average_rating ?? ('notAvailable' | t) }}</strong></div>
          </div>
          <button class="btn btn-primary w-full" type="button" (click)="reserve(event)">
            <app-icon name="ticketPlus" [size]="18"></app-icon>
            {{ 'reserve' | t }}
          </button>
          <p *ngIf="message" class="rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
            {{ message }}
          </p>

          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">{{ 'reviews' | t }}</h3>
              <span class="badge">{{ reviews.length }}</span>
            </div>
            <form class="grid gap-2" [formGroup]="reviewForm" (ngSubmit)="submitReview(event)">
              <select class="field" formControlName="rating" [attr.aria-label]="'rating' | t">
                <option [ngValue]="5">5</option>
                <option [ngValue]="4">4</option>
                <option [ngValue]="3">3</option>
                <option [ngValue]="2">2</option>
                <option [ngValue]="1">1</option>
              </select>
              <textarea class="field min-h-24" formControlName="comment" [placeholder]="'comment' | t"></textarea>
              <button class="btn btn-muted" type="submit">{{ 'save' | t }}</button>
            </form>
            <article *ngFor="let review of reviews" class="rounded-lg border p-3 text-sm" style="border-color: var(--line)">
              <strong>{{ review.rating }}/5</strong>
              <p class="safe-text mt-1 muted">{{ review.comment }}</p>
            </article>
            <div *ngIf="reviews.length === 0" class="empty-state p-4">
              <p class="text-sm muted">{{ 'noReviewsText' | t }}</p>
            </div>
          </section>
        </div>
      </aside>
    </section>
  `
})
export class EventsPageComponent implements OnInit {
  readonly apiBase = environment.apiBaseUrl.replace(/\/api$/, '');
  events: EventHubEvent[] = [];
  selected: EventHubEvent | null = null;
  reviews: Review[] = [];
  message = '';

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    category: [''],
    city: [''],
    price_max: ['']
  });

  readonly reviewForm = this.fb.nonNullable.group({
    rating: [5],
    comment: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    readonly auth: AuthService,
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
      this.selected = this.selected ?? this.events[0] ?? null;
      if (this.selected) {
        this.loadReviews(this.selected.id);
      }
    });
  }

  select(event: EventHubEvent): void {
    this.selected = event;
    this.message = '';
    this.loadReviews(event.id);
  }

  reserve(event: EventHubEvent): void {
    if (!this.auth.authenticated) {
      void this.auth.login();
      return;
    }
    this.api.profile().subscribe({
      next: (profile) => {
        if (profile.is_banned) {
          this.message = this.i18n.translate('bannedReserveMessage');
          void this.router.navigateByUrl('/banned');
          return;
        }

        this.api.register(event.id).subscribe({
          next: () => {
            this.message = this.i18n.translate('eventRegistered');
            this.loadEvents();
          },
          error: (error) => {
            this.message = error.error?.message ?? this.i18n.translate('operationFailed');
          }
        });
      },
      error: (error) => {
        if (error.status === 403) {
          this.message = this.i18n.translate('bannedReserveMessage');
          void this.router.navigateByUrl('/banned');
          return;
        }
        this.message = this.i18n.translate('operationFailed');
      }
    });
  }

  submitReview(event: EventHubEvent): void {
    const value = this.reviewForm.getRawValue();
    this.api.createReview(event.id, value.rating, value.comment).subscribe({
      next: () => {
        this.message = this.i18n.translate('reviewSaved');
        this.loadReviews(event.id);
      },
      error: (error) => {
        this.message = error.error?.message ?? this.i18n.translate('reviewFailed');
      }
    });
  }

  loadReviews(eventId: number): void {
    this.api.reviews(eventId).subscribe((response) => {
      this.reviews = response.items;
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
