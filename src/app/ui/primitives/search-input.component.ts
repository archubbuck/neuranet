import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';

/**
 * Search/filter input with a leading icon. Two-way bindable:
 *
 *   <app-search-input [(value)]="filter" placeholder="Filter categories…" />
 */
@Component({
  selector: 'app-search-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="relative w-[240px] shrink-0">
      <span class="absolute left-[10px] top-1/2 -translate-y-1/2 flex pointer-events-none"
        ><app-icon name="search" [size]="14" color="#475569"
      /></span>
      <input
        type="search"
        class="w-full bg-bg-elevated border border-border-def rounded-none text-fg-1 font-inherit text-[13px] px-[10px] py-2 pl-[32px] outline-none placeholder:text-fg-3"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
      />
    </div>
  `,
  styles: ':host { display: block; }',
})
export class SearchInputComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Search…');
}
