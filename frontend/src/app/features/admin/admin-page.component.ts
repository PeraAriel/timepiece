import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { Profile, Review } from '../../core/types';
import { IconComponent } from '../../shared/icon.component';
import { TranslatePipe } from '../../shared/t.pipe';

@Component({
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    TranslatePipe,
    IconComponent
  ],
  template: `
    <section class="space-y-6">
      <div>
        <p class="eyebrow">{{ 'moderation' | t }}</p>
        <h1 class="mt-1 text-3xl font-black">{{ 'admin' | t }}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 muted">{{ 'adminIntro' | t }}</p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section class="panel overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b p-4" style="border-color: var(--line)">
            <h2 class="font-semibold">{{ 'users' | t }}</h2>
            <span class="badge">{{ filteredUsers.length }} / {{ users.length }}</span>
          </div>
          <div class="grid gap-3 border-b p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px]" style="border-color: var(--line)">
            <label class="grid gap-1 text-sm">
              {{ 'userSearch' | t }}
              <input class="field" [(ngModel)]="userSearch" [placeholder]="'userSearchPlaceholder' | t">
            </label>
            <label class="grid gap-1 text-sm">
              {{ 'status' | t }}
              <select class="field" [(ngModel)]="statusFilter">
                <option value="all">{{ 'allStatuses' | t }}</option>
                <option value="active">{{ 'active' | t }}</option>
                <option value="banned">{{ 'banned' | t }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">
              {{ 'role' | t }}
              <select class="field" [(ngModel)]="roleFilter">
                <option value="all">{{ 'allRoles' | t }}</option>
                <option value="user">{{ 'roleUser' | t }}</option>
                <option value="organizer">{{ 'organizer' | t }}</option>
                <option value="admin">{{ 'admin' | t }}</option>
              </select>
            </label>
          </div>
          <div class="table-shell">
            <table class="w-full min-w-[840px] text-left text-sm">
              <thead style="background: var(--surface-muted); color: var(--ink-muted)">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Email</th>
                  <th class="px-4 py-3">{{ 'name' | t }}</th>
                  <th class="px-4 py-3">{{ 'status' | t }}</th>
                  <th class="px-4 py-3">{{ 'role' | t }}</th>
                  <th class="px-4 py-3 text-right">{{ 'actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of filteredUsers" class="border-t" style="border-color: var(--line)">
                  <td class="px-4 py-3 font-medium">{{ user.id }}</td>
                  <td class="safe-text max-w-[18rem] px-4 py-3">{{ user.email }}</td>
                  <td class="safe-text max-w-[14rem] px-4 py-3">
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                      <span>{{ user.display_name }}</span>
                      <span *ngIf="user.id === currentUserId" class="badge badge-accent">{{ 'you' | t }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="badge" [class.badge-copper]="user.is_banned" [class.badge-accent]="!user.is_banned">{{ user.is_banned ? ('banned' | t) : ('active' | t) }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1.5">
                      <span *ngFor="let role of displayRoles(user)" class="badge">{{ roleLabel(role) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-muted" type="button" (click)="promote(user)">
                        <app-icon name="userRoundCog"></app-icon>
                        {{ 'promote' | t }}
                      </button>
                      <button class="btn" [class.btn-danger]="!user.is_banned" [class.btn-muted]="user.is_banned" type="button" (click)="toggleBan(user)">
                        <app-icon name="ban"></app-icon>
                        {{ user.is_banned ? ('unban' | t) : ('ban' | t) }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="users.length === 0" class="empty-state m-4">
            <h3 class="font-semibold">{{ 'noLocalUsers' | t }}</h3>
            <p class="text-sm muted">{{ 'noLocalUsersText' | t }}</p>
          </div>
          <div *ngIf="users.length > 0 && filteredUsers.length === 0" class="empty-state m-4">
            <h3 class="font-semibold">{{ 'noFilteredUsers' | t }}</h3>
            <p class="text-sm muted">{{ 'noFilteredUsersText' | t }}</p>
          </div>
        </section>

        <section class="panel overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b p-4" style="border-color: var(--line)">
            <h2 class="font-semibold">{{ 'reviews' | t }}</h2>
            <span class="badge">{{ reviews.length }}</span>
          </div>
          <div class="divide-y" style="border-color: var(--line)">
            <article *ngFor="let review of reviews" class="space-y-3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <span class="badge badge-accent">{{ review.rating }}/5</span>
                  <p class="safe-text mt-2 text-sm leading-6 muted">{{ review.comment }}</p>
                </div>
                <span class="badge">{{ review.moderation_status }}</span>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row">
                <button class="btn btn-muted" type="button" (click)="moderate(review, 'visible')">
                  <app-icon name="check"></app-icon>
                  {{ 'visible' | t }}
                </button>
                <button class="btn btn-danger" type="button" (click)="moderate(review, 'hidden')">
                  <app-icon name="shieldCheck"></app-icon>
                  {{ 'hide' | t }}
                </button>
              </div>
            </article>
            <div *ngIf="reviews.length === 0" class="empty-state m-4">
              <span class="badge badge-accent"><app-icon name="shieldCheck" [size]="14"></app-icon> {{ 'cleanQueue' | t }}</span>
              <h3 class="font-semibold">{{ 'noReportedReviews' | t }}</h3>
              <p class="text-sm muted">{{ 'noReportedReviewsText' | t }}</p>
            </div>
          </div>
        </section>
      </div>

      <p *ngIf="message" class="panel p-3 text-sm muted">{{ message }}</p>
    </section>
  `
})
export class AdminPageComponent implements OnInit {
  users: Profile[] = [];
  reviews: Review[] = [];
  currentUserId: number | null = null;
  userSearch = '';
  statusFilter: 'all' | 'active' | 'banned' = 'all';
  roleFilter: 'all' | 'user' | 'organizer' | 'admin' = 'all';
  message = '';

  constructor(
    private readonly api: ApiService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.profile().subscribe((profile) => {
      this.currentUserId = profile.id;
    });
    this.api.adminUsers().subscribe((response) => {
      this.users = response.items;
    });
    this.api.adminReviews().subscribe((response) => {
      this.reviews = response.items;
    });
  }

  get filteredUsers(): Profile[] {
    const query = this.userSearch.trim().toLowerCase();
    return this.users.filter((user) => {
      const matchesQuery = !query
        || user.display_name.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query);
      const matchesStatus = this.statusFilter === 'all'
        || (this.statusFilter === 'active' && !user.is_banned)
        || (this.statusFilter === 'banned' && user.is_banned);
      const roles = this.normalizedRoles(user);
      const matchesRole = this.roleFilter === 'all'
        || (this.roleFilter === 'user' && !roles.includes('admin') && !roles.includes('organizer'))
        || roles.includes(this.roleFilter);

      return matchesQuery && matchesStatus && matchesRole;
    });
  }

  displayRoles(user: Profile): string[] {
    const roles = this.normalizedRoles(user).filter((role) => role === 'admin' || role === 'organizer');
    return roles.length > 0 ? roles : ['user'];
  }

  roleLabel(role: string): string {
    if (role === 'admin') {
      return this.i18n.translate('admin');
    }
    if (role === 'organizer') {
      return this.i18n.translate('organizer');
    }
    return this.i18n.translate('roleUser');
  }

  private normalizedRoles(user: Profile): string[] {
    return (user.roles ?? []).map((role) => role.toLowerCase());
  }

  toggleBan(user: Profile): void {
    this.api.updateAdminUser(user.id, { is_banned: !user.is_banned }).subscribe(() => {
      this.message = this.i18n.translate('userUpdated');
      this.load();
    });
  }

  promote(user: Profile): void {
    this.api.updateAdminUser(user.id, { promote_to_organizer: true }).subscribe((updated) => {
      this.message = updated.promotion_status === 'assigned_in_keycloak'
        ? this.i18n.translate('organizerAssigned')
        : this.i18n.translate('keycloakAdminNeeded');
      this.load();
    });
  }

  moderate(review: Review, status: 'visible' | 'hidden'): void {
    this.api.moderateReview(review.id, status).subscribe(() => {
      this.message = this.i18n.translate('reviewUpdated');
      this.load();
    });
  }
}
