import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { EventHubEvent, EventStats } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    RouterLink,
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="grid gap-6">
      <div class="min-w-0 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">{{ 'schedule' | t }}</p>
            <h2 class="mt-1 text-3xl font-black">{{ 'organizer' | t }}</h2>
            <p class="text-sm muted">{{ 'organizerIntro' | t }}</p>
          </div>
          <a class="btn btn-primary" routerLink="/organizer/new">
            <app-icon name="calendar"></app-icon>
            {{ 'createEvent' | t }}
          </a>
        </div>

        <p *ngIf="message" class="rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
          {{ message }}
        </p>

        <div *ngIf="events.length === 0" class="empty-state">
          <span class="badge badge-accent"><app-icon name="calendar" [size]="14"></app-icon> {{ 'noOrganizerEventsBadge' | t }}</span>
          <h3 class="font-semibold">{{ 'noOrganizerEventsTitle' | t }}</h3>
          <p class="max-w-xl text-sm muted">{{ 'noOrganizerEventsText' | t }}</p>
        </div>

        <article *ngFor="let event of events" class="panel grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div class="min-w-0 space-y-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap gap-2">
                  <span class="badge badge-accent">{{ event.category }}</span>
                  <span *ngIf="event.is_featured" class="badge badge-copper"><app-icon name="star" [size]="14"></app-icon>{{ 'featured' | t }}</span>
                </div>
                <h3 class="safe-text mt-2 text-xl font-black leading-snug">{{ event.title }}</h3>
                <p class="safe-text mt-1 text-sm muted">{{ event.city }}, {{ event.venue }}</p>
              </div>
              <div class="flex shrink-0 gap-2">
                <a class="btn btn-muted" [routerLink]="['/organizer', event.id, 'edit']">
                  <app-icon name="pencil"></app-icon>
                  <span class="sr-only">{{ 'edit' | t }}</span>
                </a>
                <button class="btn btn-danger" type="button" (click)="remove(event)">
                  <app-icon name="trash"></app-icon>
                  <span class="sr-only">{{ 'delete' | t }}</span>
                </button>
              </div>
            </div>
            <p class="safe-text text-sm leading-6 muted">{{ event.description }}</p>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'registrations' | t }}</span>
                <strong class="block text-xl">{{ stats[event.id]?.registrations ?? event.capacity - event.available_seats }}</strong>
              </div>
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'revenue' | t }}</span>
                <strong class="block text-xl">{{ formatPrice(stats[event.id]?.estimated_revenue_cents ?? 0) }}</strong>
              </div>
              <div class="stat-cell">
                <span class="text-sm muted">{{ 'rating' | t }}</span>
                <strong class="block text-xl">{{ stats[event.id]?.average_rating ?? event.average_rating ?? ('notAvailable' | t) }}</strong>
              </div>
            </div>
          </div>

          <div class="grid content-start gap-3">
            <div class="rounded-lg border p-3 text-sm" style="border-color: var(--line); background: var(--surface-muted)">
              <strong class="safe-text block">{{ event.starts_at | date:'medium':undefined:i18n.locale }}</strong>
              <p class="mt-1 muted">{{ event.available_seats }} {{ 'available' | t }} {{ 'seatsOf' | t }} {{ event.capacity }}</p>
            </div>
            <button class="btn btn-muted" type="button" (click)="loadStats(event)">
              <app-icon name="chart"></app-icon>
              {{ 'stats' | t }}
            </button>
            <button class="btn btn-muted" type="button" (click)="downloadCsv(event)">
              <app-icon name="download"></app-icon>
              CSV
            </button>
            <label class="btn btn-muted cursor-pointer">
              <app-icon name="image"></app-icon>
              {{ 'cover' | t }}
              <input class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadCover(event, $event)">
            </label>
          </div>
        </article>
      </div>
    </section>
  `
})
export class OrganizerPageComponent implements OnInit {
  events: EventHubEvent[] = [];
  stats: Partial<Record<number, EventStats>> = {};
  message = '';

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.api.organizerEvents().subscribe((response) => {
      this.events = response.items;
      this.events.forEach((event) => this.loadStats(event));
    });
  }

  remove(event: EventHubEvent): void {
    this.api.deleteOrganizerEvent(event.id).subscribe(() => {
      this.message = this.i18n.translate('eventDeleted');
      this.loadEvents();
    });
  }

  uploadCover(event: EventHubEvent, domEvent: Event): void {
    const input = domEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.api.uploadCover(event.id, file).subscribe(() => {
      this.message = this.i18n.translate('coverUpdated');
      input.value = '';
      this.loadEvents();
    });
  }

  loadStats(event: EventHubEvent): void {
    this.api.eventStats(event.id).subscribe((stats) => {
      this.stats = { ...this.stats, [event.id]: stats };
    });
  }

  downloadCsv(event: EventHubEvent): void {
    this.api.attendeesCsv(event.id).subscribe((blob) => {
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `event-${event.id}-attendees.csv`;
      link.click();
      URL.revokeObjectURL(href);
    });
  }

  formatPrice(cents: number): string {
    const locale = this.i18n.lang === 'it' ? 'it-IT' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
}
