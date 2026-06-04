import { Injectable } from '@angular/core';

import { AppTheme, AppThemeOption } from '../models/landing.models';

const THEME_STORAGE_KEY = 'landing-builder-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  public readonly options: AppThemeOption[] = [
    { label: 'Claro', value: 'light' },
    { label: 'Oscuro', value: 'dark' },
    { label: 'Bosque', value: 'forest' },
    { label: 'Oceano', value: 'ocean' },
    { label: 'Cyberpunk', value: 'cyberpunk' },
    { label: 'Eye care', value: 'eye-care' }
  ];

  public initialTheme(): AppTheme {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return this.isTheme(stored) ? stored : 'light';
  }

  public storeTheme(theme: AppTheme): void {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  public workspaceClass(theme: AppTheme): string {
    return `workspace--${theme}`;
  }

  private isTheme(value: string | null): value is AppTheme {
    return this.options.some((option) => option.value === value);
  }
}
