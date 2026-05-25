export interface ApiList<T> {
  items: T[];
}

export interface EventHubEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  starts_at: string;
  city: string;
  venue: string;
  price_cents: number;
  capacity: number;
  cover_image?: string | null;
  cover_url?: string;
  is_featured: boolean;
  organizer_id?: number | null;
  available_seats: number;
  average_rating?: number | null;
}

export interface Profile {
  id: number;
  keycloak_sub: string;
  email: string;
  display_name: string;
  city?: string | null;
  is_banned: boolean;
  roles?: string[];
  promotion_status?: string;
}

export interface Ticket {
  id: number;
  status: string;
  qr_payload: string;
  qr_code_data_url: string;
  event: EventHubEvent;
  created_at: string;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  is_reported: boolean;
  moderation_status: 'visible' | 'hidden';
  user_id: number;
  event_id: number;
  created_at: string;
}

export interface EventStats {
  event_id: number;
  registrations: number;
  estimated_revenue_cents: number;
  average_rating: number | null;
}

export interface EventInput {
  title: string;
  description: string;
  category: string;
  starts_at: string;
  city: string;
  venue: string;
  price_cents: number;
  capacity: number;
  is_featured: boolean;
}
