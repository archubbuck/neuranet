import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Message shape for the chat UI primitive. Defined locally to avoid data/ imports. */
export interface ChatMessageShape {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/**
 * Single chat message bubble. Presentational only — no data imports.
 * Used by the inspector panel's embedded chat interface.
 */
@Component({
  selector: 'app-chat-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex mb-3"
      [class.justify-end]="message().role === 'user'"
      [class.justify-start]="message().role === 'assistant'"
    >
      <div
        class="max-w-[85%] px-3 py-2 text-[13px] leading-relaxed"
        [class.bg-amber]="message().role === 'user'"
        [class.text-[#1a1208]="message().role === 'user'"
        [class.bg-bg-elevated]="message().role === 'assistant'"
        [class.text-fg-1]="message().role === 'assistant'"
        [class.border]="message().role === 'assistant'"
        [class.border-border-subtle]="message().role === 'assistant'"
      >
        @if (isStreaming()) {
          {{ message().content }}<span class="animate-pulse">▌</span>
        } @else {
          {{ message().content }}
        }
      </div>
    </div>
  `,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessageShape>();
  readonly isStreaming = input(false);
}
