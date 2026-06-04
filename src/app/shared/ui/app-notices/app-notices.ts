
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-notices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-notices.html',
  styleUrls: ['./app-notices.scss']
})
export class AppNoticesComponent implements OnChanges, OnDestroy {
  @Input() error = '';
  @Input() message = '';

  @Output() clearError = new EventEmitter<void>();
  @Output() clearMessage = new EventEmitter<void>();

  public readonly duration = 2500;
  private errorTimer?: ReturnType<typeof setTimeout>;
  private messageTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['error']) this.scheduleErrorClear();
    if (changes['message']) this.scheduleMessageClear();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  public dismissError(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.clearError.emit();
  }

  public dismissMessage(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.clearMessage.emit();
  }

  private scheduleErrorClear(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    if (!this.error) return;
    this.errorTimer = setTimeout(() => this.clearError.emit(), this.duration);
  }

  private scheduleMessageClear(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (!this.message) return;
    this.messageTimer = setTimeout(() => this.clearMessage.emit(), this.duration);
  }

  private clearTimers(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    if (this.messageTimer) clearTimeout(this.messageTimer);
  }
}
