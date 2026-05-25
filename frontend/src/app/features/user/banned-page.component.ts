import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    TranslatePipe
  ],
  template: `
    <section class="mx-auto grid max-w-3xl gap-5">
      <div class="panel overflow-hidden">
        <div class="cover-fallback border-b p-6 md:p-8" style="border-color: var(--line)">
          <span class="badge badge-copper">
            <app-icon name="ban" [size]="14"></app-icon>
            {{ 'bannedPageEyebrow' | t }}
          </span>
          <h1 class="safe-text mt-5 text-3xl font-black leading-tight md:text-5xl">{{ 'bannedPageTitle' | t }}</h1>
          <p class="mt-4 max-w-2xl text-base leading-7 muted">{{ 'bannedPageIntro' | t }}</p>
        </div>

        <div class="grid gap-4 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:p-8">
          <span class="grid size-12 place-items-center rounded-lg" style="background: var(--danger-soft); color: var(--danger)">
            <app-icon name="shield" [size]="22"></app-icon>
          </span>
          <div class="min-w-0">
            <h2 class="text-xl font-semibold">{{ 'bannedPageNoticeTitle' | t }}</h2>
            <p class="mt-2 text-sm leading-6 muted">{{ 'bannedPageNoticeText' | t }}</p>
            <a class="btn btn-muted app-link mt-5" routerLink="/">
              <app-icon name="calendar"></app-icon>
              {{ 'bannedPageAction' | t }}
            </a>
          </div>
        </div>
      </div>
    </section>
  `
})
export class BannedPageComponent {}
