import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { EventHubEvent, Review } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

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
    <section class="grid gap-5" *ngIf="event as event">
      <div>
        <a class="btn btn-muted" routerLink="/">
          {{ 'backToEvents' | t }}
        </a>
      </div>

      <article class="panel min-w-0 overflow-hidden">
        <div class="cover-fallback relative aspect-[16/9] max-h-[34rem] overflow-hidden border-b" style="border-color: var(--line)">
          <img
            *ngIf="event.cover_url"
            class="h-full w-full object-cover"
            [src]="apiBase + event.cover_url"
            [alt]="event.title"
          >
          <div class="absolute inset-x-0 bottom-0 p-4 sm:p-6" style="background: linear-gradient(180deg, transparent, oklch(18% 0.03 74 / 0.78))">
            <div class="flex flex-wrap gap-2">
              <span class="badge" style="background: color-mix(in oklch, var(--surface-raised), transparent 8%); color: var(--ink)">{{ event.category }}</span>
              <span *ngIf="event.is_featured" class="badge badge-copper">
                <app-icon name="star" [size]="14"></app-icon>
                {{ 'featured' | t }}
              </span>
            </div>
            <h1 class="safe-text mt-3 max-w-5xl text-3xl font-black leading-tight text-white md:text-5xl">{{ event.title }}</h1>
          </div>
        </div>

        <div class="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div class="min-w-0 space-y-6">
            <dl class="grid gap-3 sm:grid-cols-2">
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'date' | t }}</span>
                <strong class="safe-text block">{{ event.starts_at | date:'medium':undefined:i18n.locale }}</strong>
              </div>
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'venue' | t }}</span>
                <strong class="safe-text block">{{ event.city }}, {{ event.venue }}</strong>
              </div>
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'price' | t }}</span>
                <strong class="block">{{ formatPrice(event.price_cents) }}</strong>
              </div>
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'rating' | t }}</span>
                <strong class="block">{{ event.average_rating ?? ('notAvailable' | t) }}</strong>
              </div>
            </dl>

            <div class="min-w-0">
              <h2 class="text-xl font-black">{{ 'description' | t }}</h2>
              <p class="safe-text mt-3 leading-7 muted">{{ event.description }}</p>
            </div>

            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-black">{{ 'reviews' | t }}</h2>
                <span class="badge">{{ reviews.length }}</span>
              </div>
              <form class="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]" [formGroup]="reviewForm" (ngSubmit)="submitReview(event)">
                <select class="field" formControlName="rating" [attr.aria-label]="'rating' | t">
                  <option [ngValue]="5">5</option>
                  <option [ngValue]="4">4</option>
                  <option [ngValue]="3">3</option>
                  <option [ngValue]="2">2</option>
                  <option [ngValue]="1">1</option>
                </select>
                <textarea class="field min-h-24 sm:min-h-0" formControlName="comment" [placeholder]="'comment' | t"></textarea>
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

          <aside class="grid content-start gap-4">
            <div class="rounded-lg border p-4" style="border-color: var(--line); background: var(--surface-muted)">
              <span class="text-sm muted">{{ 'available' | t }}</span>
              <strong class="mt-1 block text-3xl">{{ event.available_seats }}</strong>
              <p class="mt-1 text-sm muted">{{ 'seatsOf' | t }} {{ event.capacity }}</p>
            </div>
            <button class="btn btn-primary w-full" type="button" (click)="reserve(event)">
              <app-icon name="ticketPlus" [size]="18"></app-icon>
              {{ 'reserve' | t }}
            </button>
            <p *ngIf="message" class="rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
              {{ message }}
            </p>
          </aside>
        </div>
      </article>
    </section>
  `
})
export class EventDetailPageComponent implements OnInit {
  readonly apiBase = environment.apiBaseUrl.replace(/\/api$/, '');
  event: EventHubEvent | null = null;
  reviews: Review[] = [];
  message = '';

  readonly reviewForm = this.fb.nonNullable.group({
    rating: [5],
    comment: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id)) {
        void this.router.navigateByUrl('/');
        return;
      }
      this.loadEvent(id);
      this.loadReviews(id);
    });
  }

  reserve(event: EventHubEvent): void {
    if (!this.auth.authenticated) {
      void this.auth.login(`/events/${event.id}`);
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
            this.loadEvent(event.id);
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
        this.reviewForm.patchValue({ comment: '' });
        this.loadReviews(event.id);
        this.loadEvent(event.id);
      },
      error: (error) => {
        this.message = error.error?.message ?? this.i18n.translate('reviewFailed');
      }
    });
  }

  loadEvent(eventId: number): void {
    this.api.event(eventId).subscribe({
      next: (event) => {
        this.event = event;
      },
      error: () => {
        void this.router.navigateByUrl('/');
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
