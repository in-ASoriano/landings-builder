import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppTheme, AppThemeOption } from '../../models';

@Component({
  selector: 'app-landing-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-toolbar.html',
  styleUrls: ['./landing-toolbar.scss']
})
export class LandingToolbarComponent {
  @Input() selectedFile = '';
  @Input() activeTheme: AppTheme = 'light';
  @Input() themeOptions: AppThemeOption[] = [];
  @Input() loading = false;
  @Input() deletingLanding = false;
  @Input() importingLanding = false;

  @Output() themeChange = new EventEmitter<AppTheme>();
  @Output() refreshLandings = new EventEmitter<void>();
  @Output() downloadLanding = new EventEmitter<void>();
  @Output() importLanding = new EventEmitter<File>();
  @Output() deleteLanding = new EventEmitter<void>();

  public emitTheme(value: string): void {
    this.themeChange.emit(value as AppTheme);
  }

  public trackByTheme(_: number, theme: AppThemeOption): AppTheme {
    return theme.value;
  }

  public emitImport(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.importLanding.emit(file);
    input.value = '';
  }
}
