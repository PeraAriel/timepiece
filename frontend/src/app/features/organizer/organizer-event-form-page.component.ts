import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { EventHubEvent, EventInput } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="mx-auto grid max-w-3xl gap-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="eyebrow">{{ 'backstage' | t }}</p>
          <h1 class="mt-1 text-3xl font-black">{{ editingId ? ('editEvent' | t) : ('createEvent' | t) }}</h1>
          <p class="mt-2 text-sm leading-6 muted">{{ 'organizerFormHelp' | t }}</p>
        </div>
        <a class="btn btn-muted" routerLink="/organizer">
          {{ 'backToDashboard' | t }}
        </a>
      </div>

      <form class="panel grid gap-3 p-4 sm:p-5" [formGroup]="eventForm" (ngSubmit)="saveEvent()">
        <label class="grid gap-1 text-sm">
          {{ 'title' | t }}
          <input class="field" formControlName="title">
        </label>
        <label class="grid gap-1 text-sm">
          {{ 'description' | t }}
          <textarea class="field min-h-32" formControlName="description"></textarea>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm">
            {{ 'category' | t }}
            <input class="field" formControlName="category">
          </label>
          <label class="grid gap-1 text-sm">
            {{ 'city' | t }}
            <input class="field" formControlName="city">
          </label>
        </div>
        <label class="grid gap-1 text-sm">
          {{ 'venue' | t }}
          <input class="field" formControlName="venue">
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm sm:col-span-2">
            {{ 'date' | t }}
            <input class="field" type="datetime-local" formControlName="starts_at">
          </label>
          <label class="grid gap-1 text-sm">
            {{ 'capacity' | t }}
            <input class="field" type="number" formControlName="capacity">
          </label>
          <label class="grid gap-1 text-sm">
            {{ 'price' | t }}
            <input class="field" type="number" min="0" step="0.01" formControlName="price_eur">
          </label>
        </div>
        <label class="flex items-center gap-2 rounded-lg border p-3 text-sm" style="border-color: var(--line); background: var(--surface-muted)">
          <input type="checkbox" formControlName="is_featured">
          {{ 'featured' | t }}
        </label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <button class="btn btn-primary flex-1" type="submit" [disabled]="eventForm.invalid">
            <app-icon name="save"></app-icon>
            {{ 'save' | t }}
          </button>
          <a class="btn btn-muted" routerLink="/organizer">{{ 'cancel' | t }}</a>
        </div>
      </form>

      <p *ngIf="message" class="rounded-lg p-3 text-sm muted" style="background: var(--surface-muted)">
        {{ message }}
      </p>
    </section>
  `
})
export class OrganizerEventFormPageComponent implements OnInit {
  editingId: number | null = null;
  message = '';

  readonly eventForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    category: ['workshop', Validators.required],
    starts_at: ['', Validators.required],
    city: ['Milano', Validators.required],
    venue: ['', Validators.required],
    price_eur: [0, Validators.min(0)],
    capacity: [20, Validators.min(1)],
    is_featured: [false]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.editingId = id ? Number(id) : null;
      if (this.editingId) {
        this.loadEvent(this.editingId);
      }
    });
  }

  saveEvent(): void {
    if (this.eventForm.invalid) {
      return;
    }

    const payload = this.toPayload();
    const request = this.editingId
      ? this.api.updateOrganizerEvent(this.editingId, payload)
      : this.api.createOrganizerEvent(payload);

    request.subscribe({
      next: () => {
        this.message = this.editingId ? this.i18n.translate('eventUpdated') : this.i18n.translate('eventCreated');
        void this.router.navigateByUrl('/organizer');
      },
      error: (error) => {
        this.message = error.error?.message ?? this.i18n.translate('operationFailed');
      }
    });
  }

  private loadEvent(id: number): void {
    this.api.organizerEvent(id).subscribe({
      next: (event) => this.patchForm(event),
      error: () => {
        this.message = this.i18n.translate('operationFailed');
      }
    });
  }

  private patchForm(event: EventHubEvent): void {
    this.eventForm.patchValue({
      title: event.title,
      description: event.description,
      category: event.category,
      starts_at: event.starts_at.slice(0, 16),
      city: event.city,
      venue: event.venue,
      price_eur: event.price_cents / 100,
      capacity: event.capacity,
      is_featured: event.is_featured
    });
  }

  private toPayload(): EventInput {
    const value = this.eventForm.getRawValue();
    return {
      title: value.title,
      description: value.description,
      category: value.category,
      starts_at: new Date(value.starts_at).toISOString(),
      city: value.city,
      venue: value.venue,
      price_cents: Math.round(value.price_eur * 100),
      capacity: value.capacity,
      is_featured: value.is_featured
    };
  }
}
