import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';
import { ApiList, EventHubEvent, EventInput, EventStats, Profile, Review, Ticket } from './types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  events(filters: Record<string, string | number | boolean | null | undefined> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiList<EventHubEvent>>(`${this.baseUrl}/events`, { params });
  }

  event(id: number) {
    return this.http.get<EventHubEvent>(`${this.baseUrl}/events/${id}`);
  }

  register(eventId: number) {
    return this.http.post<Ticket>(`${this.baseUrl}/events/${eventId}/register`, {});
  }

  unregister(eventId: number) {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}/register`);
  }

  reviews(eventId: number) {
    return this.http.get<ApiList<Review>>(`${this.baseUrl}/events/${eventId}/reviews`);
  }

  createReview(eventId: number, rating: number, comment: string) {
    return this.http.post<Review>(`${this.baseUrl}/events/${eventId}/reviews`, { rating, comment });
  }

  profile() {
    return this.http.get<Profile>(`${this.baseUrl}/me/profile`);
  }

  updateProfile(payload: Pick<Profile, 'display_name' | 'city'>) {
    return this.http.patch<Profile>(`${this.baseUrl}/me/profile`, payload);
  }

  tickets() {
    return this.http.get<ApiList<Ticket>>(`${this.baseUrl}/me/tickets`);
  }

  organizerEvents() {
    return this.http.get<ApiList<EventHubEvent>>(`${this.baseUrl}/organizer/events`);
  }

  organizerEvent(id: number) {
    return this.http.get<EventHubEvent>(`${this.baseUrl}/organizer/events/${id}`);
  }

  createOrganizerEvent(payload: EventInput) {
    return this.http.post<EventHubEvent>(`${this.baseUrl}/organizer/events`, payload);
  }

  updateOrganizerEvent(id: number, payload: EventInput) {
    return this.http.put<EventHubEvent>(`${this.baseUrl}/organizer/events/${id}`, payload);
  }

  deleteOrganizerEvent(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/organizer/events/${id}`);
  }

  uploadCover(id: number, file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<EventHubEvent>(`${this.baseUrl}/organizer/events/${id}/cover`, form);
  }

  eventStats(id: number) {
    return this.http.get<EventStats>(`${this.baseUrl}/organizer/events/${id}/stats`);
  }

  attendeesCsvUrl(id: number) {
    return `${this.baseUrl}/organizer/events/${id}/attendees.csv`;
  }

  attendeesCsv(id: number) {
    return this.http.get(`${this.baseUrl}/organizer/events/${id}/attendees.csv`, {
      responseType: 'blob'
    });
  }

  adminUsers() {
    return this.http.get<ApiList<Profile>>(`${this.baseUrl}/admin/users`);
  }

  updateAdminUser(id: number, payload: Partial<Profile> & { promote_to_organizer?: boolean }) {
    return this.http.patch<Profile>(`${this.baseUrl}/admin/users/${id}`, payload);
  }

  adminReviews() {
    return this.http.get<ApiList<Review>>(`${this.baseUrl}/admin/reviews`);
  }

  moderateReview(id: number, moderation_status: 'visible' | 'hidden', is_reported = false) {
    return this.http.patch<Review>(`${this.baseUrl}/admin/reviews/${id}`, {
      moderation_status,
      is_reported
    });
  }
}
