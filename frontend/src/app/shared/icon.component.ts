import { NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Ban,
  CalendarClock,
  CalendarDays,
  ChartBar,
  Check,
  Download,
  IdCard,
  ImageUp,
  Languages,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Sun,
  Ticket,
  TicketCheck,
  TicketPlus,
  Trash2,
  UserCog,
  UserPlus,
  UserRound,
  UserRoundCog,
  type IconNode
} from 'lucide';

const icons: Record<string, IconNode> = {
  ban: Ban,
  calendar: CalendarDays,
  clock: CalendarClock,
  chart: ChartBar,
  check: Check,
  download: Download,
  id: IdCard,
  image: ImageUp,
  language: Languages,
  login: LogIn,
  logout: LogOut,
  map: MapPin,
  moon: Moon,
  pencil: Pencil,
  refresh: RefreshCw,
  save: Save,
  search: Search,
  shield: Shield,
  shieldCheck: ShieldCheck,
  star: Star,
  sun: Sun,
  ticket: Ticket,
  ticketCheck: TicketCheck,
  ticketPlus: TicketPlus,
  trash: Trash2,
  userCog: UserCog,
  userPlus: UserPlus,
  userRound: UserRound,
  userRoundCog: UserRoundCog
};

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [NgIf],
  template: `
    <svg
      *ngIf="content"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      [innerHTML]="content"
    ></svg>
  `
})
export class IconComponent implements OnChanges {
  @Input({ required: true }) name = '';
  @Input() size = 17;

  content: SafeHtml | null = null;

  constructor(private readonly sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const node = icons[this.name];
    this.content = node ? this.sanitizer.bypassSecurityTrustHtml(renderIcon(node)) : null;
  }
}

function renderIcon(node: IconNode): string {
  return node.map(([tag, attrs]) => {
    const attrText = Object.entries(attrs)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
      .join(' ');
    return `<${tag} ${attrText}></${tag}>`;
  }).join('');
}

