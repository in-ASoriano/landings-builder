import { Injectable } from '@angular/core';

import { SectionSummary } from '../models/landing.models';

@Injectable({ providedIn: 'root' })
export class SectionJsonService {
  public suggestId(component: SectionSummary): string {
    if (this.isUsefulExistingId(component.id)) return component.id;
    return this.componentPattern(component);
  }

  public legacySuggestedId(component: SectionSummary): string {
    const base = component.component.replace(/Group$/, '').toLowerCase();
    const hasImage = component.media.some((media) => media.key.startsWith('image'));
    const hasVideo = component.media.some((media) => media.key.startsWith('video'));

    if (hasVideo) return 'video-full';
    if (hasImage && component.title) return `${base}-image-text`;
    if (hasImage) return `${base}-image`;
    return `${base}-text`;
  }

  public format(value: string): { json: string; error: string } {
    try {
      return {
        json: JSON.stringify(JSON.parse(value), null, 2),
        error: ''
      };
    } catch (error) {
      return {
        json: value,
        error: error instanceof Error ? error.message : 'JSON inválido'
      };
    }
  }

  public parseSection(value: string): { section?: unknown; error: string } {
    try {
      const section = JSON.parse(value);
      if (!section || typeof section !== 'object' || Array.isArray(section)) {
        throw new Error('La sección debe ser un objeto JSON');
      }
      this.normalizeLocalizedDefaults(section);
      return { section, error: '' };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'JSON inválido'
      };
    }
  }

  public hasUnsavedChanges(original: unknown, editedJson: string): boolean {
    if (!original || !editedJson.trim()) return false;

    try {
      return JSON.stringify(JSON.parse(editedJson)) !== JSON.stringify(original);
    } catch {
      return true;
    }
  }

  public sectionJsonFromLanding(rawSections: unknown[] | undefined, index: number): string {
    const section = rawSections?.[index];
    return section ? JSON.stringify(section, null, 2) : '';
  }

  public previewJsonFromLanding(rawSections: unknown[] | undefined, index: number): string {
    const section = rawSections?.[index];
    return section
      ? JSON.stringify(section, null, 2)
      : 'No se ha encontrado la sección origen en el JSON.';
  }

  public normalizeLocalizedDefaults(value: unknown): void {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      value.forEach((item) => this.normalizeLocalizedDefaults(item));
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key of ['title', 'subtitle', 'description', 'label', 'cta']) {
      const item = record[key];
      if (this.hasLanguageValues(item)) {
        (item as Record<string, unknown>)['default'] = null;
      }
    }

    Object.values(record).forEach((item) => this.normalizeLocalizedDefaults(item));
  }

  private hasLanguageValues(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.keys(value as Record<string, unknown>).some((key) => /^[a-z]{2}-[A-Z]{2}$/.test(key));
  }

  private componentPattern(component: SectionSummary): string {
    const base = this.slug(component.component.replace(/Group$/, '')) || 'section';
    const units = component.units?.length ? component.units : [{
      type: base,
      hasImage: component.media.some((media) => media.key.startsWith('image') || media.key.startsWith('poster')),
      hasVideo: component.media.some((media) => media.key.startsWith('video')),
      hasText: Boolean(component.title)
    }];
    const count = units.length;
    const imageCount = units.filter((unit) => unit.hasImage).length;
    const videoCount = units.filter((unit) => unit.hasVideo).length;
    const textCount = units.filter((unit) => unit.hasText && !unit.hasImage && !unit.hasVideo).length;
    const cardCount = units.filter((unit) => this.slug(unit.type) === 'card').length;
    const bannerCount = units.filter((unit) => this.slug(unit.type) === 'banner').length;

    if (base === 'slider') return 'slider-media-cards';
    if (videoCount && count === 1) return 'video-full';
    if (base === 'text') return count > 1 ? 'text-two-columns' : 'text-intro-editorial';
    if (textCount && imageCount === 2 && count <= 3) return 'text-two-images';
    if (textCount && imageCount === 1 && count === 2) return 'image-text-half';
    if (textCount && imageCount >= 2 && count >= 3) return base === 'banner' ? 'banner-split-text' : 'image-collage-text';
    if (videoCount && imageCount) return 'media-collage-text';
    if (cardCount >= 4 && imageCount >= 4) return 'image-grid-numbered-text';
    if (cardCount === 3 && imageCount >= 3) return 'card-image-text';
    if (cardCount === 2 && imageCount >= 2) return 'image-pair-labels';
    if (bannerCount === 1 && imageCount === 1 && count === 1) return 'image-split-two';
    if (cardCount && bannerCount && imageCount >= 2) return 'image-product-card';
    if (imageCount >= 3) return 'image-collage-text';
    if (imageCount === 2) return 'image-pair';
    if (imageCount === 1) {
      if (base === 'card') return 'image-text-split';
      if (base === 'banner') return 'card-single-banner';
      return 'image-text';
    }

    if (component.title) return `${base}-text`;
    return `${base}-section`;
  }

  private isUsefulExistingId(id: string): boolean {
    if (!id) return false;
    if (/^section-\d+$/i.test(id)) return false;
    if (/^(card|banner|text|slider|section)-(image|text|group|section)$/i.test(id)) return false;
    return true;
  }

  private slug(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
