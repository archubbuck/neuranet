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
    <div class="search-wrap">
      <span class="search-icon"><app-icon name="search" [size]="14" color="#475569" /></span>
      <input
        class="search-input"
        type="search"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .search-wrap {
        position: relative;
        width: 240px;
        flex-shrink: 0;
      }
      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
      }
      .search-input {
        width: 100%;
        box-sizing: border-box;
        background: var(--c-bg-elevated, #0f1828);
        border: 1px solid var(--c-border-def, rgba(255, 255, 255, 0.09));
        border-radius: 0;
        color: var(--c-fg1, #f1f5f9);
        font-family: inherit;
        font-size: 13px;
        padding: 8px 10px 8px 32px;
        outline: none;
      }
      .search-input:focus {
        border-color: var(--c-border-accent, rgba(251, 191, 36, 0.35));
      }
      .search-input::placeholder {
        color: var(--c-fg3, #475569);
      }
    `,
  ],
})
export class SearchInputComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Search…');
}
