import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';

import { I18nService } from '../core/i18n.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private readonly i18n: I18nService,
    changeDetector: ChangeDetectorRef
  ) {
    this.subscription = this.i18n.lang$.subscribe(() => changeDetector.markForCheck());
  }

  transform(key: string): string {
    return this.i18n.translate(key);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

