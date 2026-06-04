import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type PreviewSize = 'mobile' | 'tablet' | 'desktop';

interface PreviewDeviceOption {
  label: string;
  value: PreviewSize;
}

interface PreviewPreset {
  label: string;
  width: number;
}

interface PreviewMedia {
  type: 'image' | 'video';
  url: string;
  sources?: Record<'sm' | 'md' | 'lg' | 'xl', string>;
  posters?: Record<'sm' | 'md' | 'lg' | 'xl', string>;
  hasAudio?: boolean;
  attributes?: Record<string, unknown>;
}

type PreviewRole = 'section' | 'group' | 'item';

@Component({
  selector: 'app-landing-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-preview.html',
  styleUrls: ['./landing-preview.scss']
})
export class LandingPreviewComponent implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() sections: unknown[] = [];
  @Input() tplCss = '';
  @Input() themeCss = '';
  @Input() tplPath = '';
  @Input() eyebrow = 'Preview landing';
  @Input() title = 'Inspector responsive';
  @Input() countLabel = '';
  @Input() emptyText = 'La landing aún no tiene secciones para previsualizar.';
  @Input() compact = false;

  public previewMode: PreviewSize = 'mobile';
  public previewWidth = 360;
  public previewSrcdocValue: SafeHtml = this.sanitizer.bypassSecurityTrustHtml('');

  private previewSignature = '';

  public readonly previewModes: PreviewDeviceOption[] = [
    { label: 'Mobile', value: 'mobile' },
    { label: 'Tablet', value: 'tablet' },
    { label: 'Desktop', value: 'desktop' }
  ];

  public readonly previewPresets: Record<PreviewSize, PreviewPreset[]> = {
    mobile: [
      { label: 'Mobile base', width: 360 },
      { label: 'iPhone 12/13/14', width: 390 },
      { label: 'iPhone Plus', width: 414 },
      { label: 'iPhone Pro Max', width: 430 }
    ],
    tablet: [
      { label: 'Tablet base', width: 768 },
      { label: 'iPad Air', width: 820 },
      { label: 'iPad Pro 11"', width: 834 },
      { label: 'iPad Pro 12.9"', width: 1024 }
    ],
    desktop: [
      { label: 'Desktop 1400', width: 1400 },
      { label: 'Desktop 1920', width: 1920 }
    ]
  };

  public readonly defaultPreviewWidths: Record<PreviewSize, number> = {
    mobile: 360,
    tablet: 768,
    desktop: 1400
  };

  public setPreviewMode(mode: PreviewSize): void {
    this.previewMode = mode;
    this.previewWidth = this.defaultPreviewWidths[mode];
    this.rebuildPreviewSrcdoc(true);
  }

  public setPreviewPreset(preset: PreviewPreset): void {
    this.previewWidth = preset.width;
    this.rebuildPreviewSrcdoc(true);
  }

  public ngOnChanges(): void {
    this.rebuildPreviewSrcdoc();
  }

  public activeSize(): PreviewSize {
    return this.previewMode;
  }

  public activeModeLabel(): string {
    return this.previewModes.find((mode) => mode.value === this.previewMode)?.label || 'Mobile';
  }

  public activeModeWidth(): string {
    const preset = this.activePreset();
    return `${preset?.label || this.activeModeLabel()} - ${this.previewWidth}px`;
  }

  public activeWidth(): number {
    return this.previewWidth;
  }

  public activePresets(): PreviewPreset[] {
    return this.previewPresets[this.previewMode];
  }

  public deviceClass(): string {
    return `landing-preview__device landing-preview__device--${this.previewMode} landing-preview__device--size-${this.activeSize()}`;
  }

  public deviceStyles(): Record<string, string> {
    return {
      width: `${this.previewWidth}px`
    };
  }

  public activePreset(): PreviewPreset | undefined {
    return this.activePresets().find((preset) => preset.width === this.previewWidth);
  }

  public displayCountLabel(): string {
    return this.countLabel || `${this.sections.length} secciones`;
  }

  public sectionComponent(section: unknown): string {
    const record = this.asRecord(section);
    return record['component'] as string || record['type'] as string || 'Section';
  }

  public sectionId(section: unknown): string {
    const config = this.asRecord(this.asRecord(section)['config_extra']);
    const properties = this.asRecord(config['custom_properties']);
    return properties['id'] as string || '';
  }

  public childItems(value: unknown): unknown[] {
    const banners = this.asRecord(value)['banners'];
    return Array.isArray(banners) ? banners : [];
  }

  public hasChildren(value: unknown): boolean {
    return this.childItems(value).length > 0;
  }

  public roleFor(value: unknown, level: number): PreviewRole {
    if (level === 0) return 'section';
    return this.hasChildren(value) ? 'group' : 'item';
  }

  public classesFor(value: unknown, level: number): string {
    const role = this.roleFor(value, level);
    const record = this.asRecord(value);
    const component = this.slug(record['component'] as string || record['type'] as string || 'node');
    const customClasses = this.customClasses(value);

    return [
      'landing-preview__node',
      `landing-preview__node--${role}`,
      `landing-preview__node--${component}`,
      this.systemClassFor(value, level),
      ...customClasses
    ].join(' ');
  }

  public hgroupClass(value: unknown): string {
    const unit = this.unitType(value);
    return `landing-preview__text-card st-unit-${unit}__hgroup`;
  }

  public mediaClass(value: unknown): string {
    const unit = this.unitType(value);
    return `landing-preview__media st-unit-${unit}__img`;
  }

  public labelClass(value: unknown): string {
    return `landing-preview__text-label st-unit-${this.unitType(value)}__label`;
  }

  public titleClass(value: unknown): string {
    return `landing-preview__text-title st-unit-${this.unitType(value)}__title`;
  }

  public subtitleClass(value: unknown): string {
    return `landing-preview__text-subtitle st-unit-${this.unitType(value)}__subtitle`;
  }

  public descriptionClass(value: unknown): string {
    return `landing-preview__text-description st-unit-${this.unitType(value)}__description`;
  }

  public ctaClass(value: unknown): string {
    return `landing-preview__text-cta st-unit-${this.unitType(value)}__cta`;
  }

  private rebuildPreviewSrcdoc(force = false): void {
    const signature = JSON.stringify({
      sections: this.sections,
      tplCss: this.tplCss,
      themeCss: this.themeCss,
      previewMode: this.previewMode,
      previewWidth: this.previewWidth
    });

    if (!force && signature === this.previewSignature) return;

    this.previewSignature = signature;
    this.previewSrcdocValue = this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewSrcdoc());
  }

  private buildPreviewSrcdoc(): string {
    const html = this.sections.map((section) => this.renderSection(section)).join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${this.defaultFontCss()}</style>
  <style>${this.previewDocumentCss()}</style>
  <style>${this.themeCss || this.basePreviewCss()}</style>
  <style>${this.tplCss || ''}</style>
  <style>${this.previewVideoCss()}</style>
</head>
<body>
  ${html}
  <script>${this.previewVideoScript()}</script>
</body>
</html>`;
  }

  public scopedTplCss(): string {
    if (!this.tplCss) return '';
    const imports = this.tplCss.match(/@import[^;]+;/g)?.join('\n') || '';
    const withoutImports = this.tplCss.replace(/@import[^;]+;/g, '').trim();
    const mediaStart = withoutImports.indexOf('@media (min-width: 768px)');
    const baseCss = mediaStart >= 0 ? withoutImports.slice(0, mediaStart).trim() : withoutImports;
    const mediaCss = mediaStart >= 0
      ? withoutImports.slice(withoutImports.indexOf('{', mediaStart) + 1, withoutImports.lastIndexOf('}')).trim()
      : '';

    return [
      imports,
      this.prefixCss(this.previewCssValue(baseCss), ['.landing-preview__device']),
      this.prefixCss(this.previewCssValue(mediaCss), ['.landing-preview__device--size-tablet', '.landing-preview__device--size-desktop'])
    ].filter(Boolean).join('\n\n');
  }

  public stylesFor(value: unknown): Record<string, string> {
    const record = this.asRecord(value);
    const styles: Record<string, string> = {};
    const customProperties = this.customProperties(value);

    for (const [key, rawValue] of Object.entries(customProperties)) {
      if (key === 'id' || rawValue === null || rawValue === undefined || rawValue === '') continue;
      const styleValue = this.previewCssValue(String(rawValue));

      if (key.startsWith('--')) {
        styles[key] = styleValue;
        continue;
      }

      if (this.allowedInlineProperty(key)) {
        styles[key] = styleValue;
      }
    }

    const background = record['backgroundcolor'];
    if (typeof background === 'string' && background) styles['background-color'] = background;

    const columns = this.columnsFor(value);
    if (columns > 1) {
      styles['--preview-columns'] = `repeat(${Math.ceil(columns)}, minmax(0, 1fr))`;
    } else {
      styles['--preview-columns'] = 'minmax(0, 1fr)';
    }

    return styles;
  }

  public textStylesFor(value: unknown): Record<string, string> {
    const styles: Record<string, string> = {};
    const customProperties = this.customProperties(value);

    for (const [key, rawValue] of Object.entries(customProperties)) {
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;
      const value = this.previewCssValue(String(rawValue));

      if (key.includes('__font-size--title')) styles['--preview-title-size'] = value;
      if (key.includes('__font-size--subtitle')) styles['--preview-subtitle-size'] = value;
      if (key.includes('__font-size--description')) styles['--preview-description-size'] = value;
      if (key.includes('__font-weight--title')) styles['--preview-title-weight'] = value;
      if (key.includes('__font-weight--subtitle')) styles['--preview-subtitle-weight'] = value;
      if (key.includes('__font-family')) styles['font-family'] = value;
      if (key === 'text-align' || key === 'text-transform' || key === 'line-height') styles[key] = value;
    }

    return styles;
  }

  public mediaFor(banner: unknown, size: PreviewSize): PreviewMedia | undefined {
    const record = this.asRecord(banner);
    const video = this.videoMediaFor(record['video_responsive'], size);
    if (video) return video;

    const image = this.responsiveUrl(record['image_responsive'], 'image', size);
    if (image) return { type: 'image', url: image };

    const poster = this.responsiveUrl(record['poster_responsive'], 'poster', size);
    return poster ? { type: 'image', url: poster } : undefined;
  }

  public titleFor(value: unknown): string {
    const record = this.asRecord(value);
    const title = this.extractText(record['title']);
    const subtitle = this.extractText(record['subtitle']);
    const description = this.extractText(record['description']);
    return [title, subtitle, description].filter(Boolean).join(' - ');
  }

  public headingFor(value: unknown): string {
    return this.extractText(this.asRecord(value)['title']);
  }

  public subtitleFor(value: unknown): string {
    return this.extractText(this.asRecord(value)['subtitle']);
  }

  public descriptionFor(value: unknown): string {
    return this.extractText(this.asRecord(value)['description']);
  }

  public labelFor(value: unknown): string {
    return this.extractText(this.asRecord(value)['label']);
  }

  public ctaFor(value: unknown): string {
    return this.extractText(this.asRecord(value)['cta']);
  }

  public hasText(value: unknown): boolean {
    return Boolean(this.headingFor(value) || this.subtitleFor(value) || this.descriptionFor(value) || this.labelFor(value) || this.ctaFor(value));
  }

  public sectionText(section: unknown): string {
    return this.titleFor(section);
  }

  public trackByMode(_: number, mode: PreviewDeviceOption): string {
    return mode.value;
  }

  public trackByPreset(_: number, preset: PreviewPreset): string {
    return `${this.previewMode}:${preset.width}`;
  }

  public trackBySection(index: number): number {
    return index;
  }

  public trackByBanner(index: number): number {
    return index;
  }

  public trackByChild(index: number): number {
    return index;
  }

  private responsiveUrl(value: unknown, prefix: 'image' | 'video' | 'poster', size: PreviewSize): string {
    if (typeof value === 'string') return value;

    const variant = this.preferredLocale(value);
    const suffix = size === 'mobile' ? 'sm' : size === 'tablet' ? 'md' : 'lg';
    return variant[`${prefix}_${suffix}`] as string
      || variant[`${prefix}_lg`] as string
      || variant[`${prefix}_md`] as string
      || variant[`${prefix}_sm`] as string
      || '';
  }

  private videoMediaFor(value: unknown, size: PreviewSize): PreviewMedia | undefined {
    if (typeof value === 'string' && value) {
      return { type: 'video', url: value };
    }

    const variant = this.preferredLocale(value);
    const sources = this.responsiveSources(variant, 'video');
    const url = this.responsiveUrl(value, 'video', size);
    if (!url) return undefined;

    return {
      type: 'video',
      url,
      sources,
      posters: this.responsiveSources(variant, 'poster'),
      hasAudio: this.booleanValue(variant['hasAudio'], false),
      attributes: this.asRecord(this.asRecord(value)['attributes'])
    };
  }

  private responsiveSources(value: Record<string, unknown>, prefix: 'video' | 'poster'): Record<'sm' | 'md' | 'lg' | 'xl', string> {
    const sm = value[`${prefix}_sm`] as string || '';
    const md = value[`${prefix}_md`] as string || sm;
    const lg = value[`${prefix}_lg`] as string || md || sm;
    const xl = value[`${prefix}_xl`] as string || lg || md || sm;

    return { sm, md, lg, xl };
  }

  private preferredLocale(value: unknown): Record<string, unknown> {
    const record = this.asRecord(value);
    for (const locale of ['es-ES', 'default', 'en-GB', 'en-IE']) {
      const variant = this.asRecord(record[locale]);
      if (Object.keys(variant).length) return variant;
    }

    return record;
  }

  private columnsFor(value: unknown): number {
    const columns = this.asRecord(this.asRecord(value)['columns']);
    const size = this.activeSize();
    const valueForSize = size === 'desktop'
      ? columns['lg'] ?? columns['md'] ?? columns['sm']
      : size === 'tablet'
        ? columns['md'] ?? columns['sm']
        : columns['sm'];

    const numericValue = Number(valueForSize);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
  }

  private customClasses(value: unknown): string[] {
    const config = this.asRecord(this.asRecord(value)['config_extra']);
    const classes = config['custom_classes'];
    if (Array.isArray(classes)) return classes.filter((item): item is string => typeof item === 'string' && item.length > 0);
    return typeof classes === 'string' && classes ? [classes] : [];
  }

  private customProperties(value: unknown): Record<string, unknown> {
    const config = this.asRecord(this.asRecord(value)['config_extra']);
    return this.asRecord(config['custom_properties']);
  }

  private systemClassFor(value: unknown, level: number): string {
    const record = this.asRecord(value);
    if (this.hasChildren(value)) {
      return level === 0 ? 'st-group-section' : 'st-group-banner';
    }

    return `st-unit-${this.unitType(record)}`;
  }

  private unitType(value: unknown): string {
    const type = this.asRecord(value)['type'];
    return typeof type === 'string' && ['banner', 'card', 'text'].includes(type) ? type : 'text';
  }

  private renderSection(section: unknown): string {
    const record = this.asRecord(section);
    const component = record['component'];
    const body = component === 'SliderGroup'
      ? this.renderSlider(record, 'section')
      : `${this.renderGroupHgroup(record, 'section')}<div class="st-group-section__wrapper">${this.childItems(record).map((child) => this.renderChild(child)).join('')}</div>`;

    return `<section${this.idAttr(record)} class="${this.classAttr(['st-group-section', ...this.customClasses(record), record['fullWidth'] ? 'u-full-width' : ''])}" style="${this.styleAttr(record, 'group-section')}">${body}</section>`;
  }

  private renderChild(value: unknown): string {
    const record = this.asRecord(value);
    return record['component'] ? this.renderGroupBanner(record) : this.renderUnit(record);
  }

  private renderGroupBanner(group: unknown): string {
    const record = this.asRecord(group);
    const component = record['component'];
    const body = component === 'SliderGroup'
      ? this.renderSlider(record, 'banner')
      : `${this.renderGroupHgroup(record, 'banner')}<div class="st-group-banner__wrapper">${this.childItems(record).map((child) => this.renderUnit(child)).join('')}</div>`;

    return `<div${this.idAttr(record)} class="${this.classAttr(['st-group-banner', ...this.customClasses(record), record['fullWidth'] ? 'u-full-width' : ''])}" style="${this.styleAttr(record, 'group-banner')}">${body}</div>`;
  }

  private renderSlider(group: unknown, scope: 'section' | 'banner'): string {
    const record = this.asRecord(group);
    const items = this.childItems(record)
      .map((child) => `<li class="c-slider-carousel__item">${this.renderUnit(child)}</li>`)
      .join('');
    const nav = this.renderSliderNav(record);

    return `${this.renderGroupHgroup(record, 'group-banner')}
      <div class="c-slider-carousel js-slider-carousel"${this.sliderDataAttrs(record)} style="${this.sliderStyleAttr(record)}">
        <div class="c-slider-carousel__wrapper">
          <ul class="c-slider-carousel__list">${items}</ul>
        </div>
        ${nav}
      </div>`;
  }

  private renderUnit(value: unknown): string {
    const record = this.asRecord(value);
    const type = this.unitType(record);
    if (type === 'banner') return this.renderBannerUnit(record);
    if (type === 'card') return this.renderCardUnit(record);
    return this.renderTextUnit(record);
  }

  private renderCardUnit(card: unknown): string {
    const media = this.mediaFor(card, this.activeSize());
    const mediaHtml = media ? this.renderMedia(media, 'st-unit-card') : '';
    const label = this.renderTextNode(this.asRecord(card)['label'], 'label', 'unit-card');
    const content = this.renderCardContent(card);

    return `<div${this.idAttr(card)} class="${this.classAttr(['st-unit-card', ...this.customClasses(card)])}" style="${this.styleAttr(card, 'unit-card')}">${label}${mediaHtml}${content}</div>`;
  }

  private renderBannerUnit(banner: unknown): string {
    const media = this.mediaFor(banner, this.activeSize());
    const mediaHtml = media ? this.renderMedia(media, 'st-unit-banner') : '';
    const content = this.renderBannerContent(banner);
    const wrapperClasses = this.bannerWrapperClasses(banner);

    return `<div${this.idAttr(banner)} class="${this.classAttr(['st-unit-banner', media ? 'has-bg-image' : '', ...this.customClasses(banner)])}" style="${this.styleAttr(banner, 'unit-banner')}">
      ${mediaHtml}
      ${content ? `<div class="${wrapperClasses}"><div class="st-unit-banner__content">${content}</div></div>` : ''}
    </div>`;
  }

  private renderTextUnit(text: unknown): string {
    const hgroup = this.renderTitleHgroup(text, 'unit-text');
    const content = [
      this.renderDescriptionNodes(this.asRecord(text)['description'], 'unit-text'),
      this.renderTextNode(this.asRecord(text)['cta'], 'cta', 'unit-text')
    ].filter(Boolean).join('');

    return `<div${this.idAttr(text)} class="${this.classAttr(['st-unit-text', ...this.customClasses(text)])}" style="${this.styleAttr(text, 'unit-text')}">${hgroup}<div class="st-unit-text__content">${content}</div></div>`;
  }

  private renderCardContent(value: unknown): string {
    const hgroup = this.renderTitleHgroup(value, 'unit-card');
    const description = this.renderDescriptionNodes(this.asRecord(value)['description'], 'unit-card');
    const cta = this.renderTextNode(this.asRecord(value)['cta'], 'cta', 'unit-card');
    const content = [hgroup, description, cta].filter(Boolean).join('');
    return content ? `<div class="st-unit-card__content">${content}</div>` : '';
  }

  private renderBannerContent(value: unknown): string {
    const hgroup = this.renderTitleHgroup(value, 'unit-banner');
    const cta = this.renderTextNode(this.asRecord(value)['cta'], 'cta', 'unit-banner');
    return [hgroup, cta].filter(Boolean).join('');
  }

  private renderTitleHgroup(value: unknown, unit: 'unit-card' | 'unit-banner' | 'unit-text'): string {
    const record = this.asRecord(value);
    const title = this.renderTextNode(record['title'], 'title', unit, record);
    const subtitle = this.renderTextNode(record['subtitle'], 'subtitle', unit, record);
    return title || subtitle ? `<div class="st-${unit}__hgroup">${title}${subtitle}</div>` : '';
  }

  private renderDescriptionNodes(value: unknown, unit: 'unit-card' | 'unit-text'): string {
    const text = this.localizedText(value);
    if (!text) return '';

    const parts = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      const config = this.asRecord(this.asRecord(value)['config_extra']);
      return parts
        .map((part) => this.renderTextNode({ default: part, config_extra: config }, 'description', unit))
        .join('');
    }

    return this.renderTextNode(value, 'description', unit);
  }

  private renderGroupHgroup(value: unknown, unit: 'section' | 'banner' | 'group-section' | 'group-banner'): string {
    const record = this.asRecord(value);
    const normalized = unit === 'section' ? 'group-section' : unit === 'banner' ? 'group-banner' : unit;
    const title = this.renderTextNode(record['title'], 'title', normalized, record);
    const subtitle = this.renderTextNode(record['subtitle'], 'subtitle', normalized, record);
    return title || subtitle ? `<div class="st-${normalized}__hgroup">${title}${subtitle}</div>` : '';
  }

  private renderTextNode(value: unknown, type: string, unit: string, parent?: unknown): string {
    const text = this.localizedText(value);
    if (!text) return '';

    const record = this.asRecord(value);
    const config = this.asRecord(record['config_extra']);
    const classes = this.customClasses({ config_extra: config });
    const tag = this.textTag(type, config, parent);
    const content = this.textHtml(text, type !== 'label');

    return `<${tag} class="${this.classAttr([`st-${unit}__${type}`, ...classes])}">${content}</${tag}>`;
  }

  private renderMedia(media: PreviewMedia, unitClass: 'st-unit-card' | 'st-unit-banner'): string {
    const url = this.escapeAttr(media.url);
    if (media.type === 'video') {
      const video = this.renderVideoMedia(media, unitClass);
      if (unitClass === 'st-unit-card' && media.hasAudio) {
        return `<div class="st-unit-card__media-wrapper">${video}${this.renderMuteButton()}</div>`;
      }

      return `${video}${media.hasAudio ? this.renderMuteButton() : ''}`;
    }

    return `<picture class="${unitClass}__img"><img class="${unitClass}__img" src="${url}" alt=""></picture>`;
  }

  private renderVideoMedia(media: PreviewMedia, unitClass: 'st-unit-card' | 'st-unit-banner'): string {
    const classes = this.classAttr([
      `${unitClass}__media`,
      media.sources ? 'js-video-responsive' : ''
    ]);
    const source = media.sources ? '#' : media.url;
    const attrs = [
      'autoplay=""',
      'muted=""',
      'loop=""',
      'playsinline=""',
      `src="${this.escapeAttr(source)}"`,
      `class="${classes}"`,
      this.videoDataAttrs(media),
      this.videoExtraAttrs(media.attributes)
    ].filter(Boolean).join(' ');

    return `<video ${attrs}></video>`;
  }

  private videoDataAttrs(media: PreviewMedia): string {
    const attrs: string[] = [];
    for (const device of ['sm', 'md', 'lg', 'xl'] as const) {
      const source = media.sources?.[device];
      const poster = media.posters?.[device];
      if (source) attrs.push(`data-${device}-src="${this.escapeAttr(source)}"`);
      if (poster) attrs.push(`data-${device}-poster="${this.escapeAttr(poster)}"`);
    }

    return attrs.join(' ');
  }

  private videoExtraAttrs(attributes: Record<string, unknown> | undefined): string {
    if (!attributes) return '';

    return Object.entries(attributes)
      .filter(([key, value]) => key !== 'controls' && value !== null && value !== undefined && value !== false)
      .map(([key, value]) => value === true ? this.escapeAttr(key) : `${this.escapeAttr(key)}="${this.escapeAttr(String(value))}"`)
      .join(' ');
  }

  private renderMuteButton(): string {
    return `<button class="o-btn o-mute-button is-muted js-muteBtn" type="button" aria-label="Activar audio">
      <svg class="o-icon" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path class="o-mute-button__speaker" d="M34.7188 18.6312C34.1859 18.3562 33.6531 18.2359 33.1203 18.2359C32.3125 18.2359 31.5219 18.5109 30.8516 19.0437L15.8984 31.0578H3.74687C1.73594 31.0406 0 32.6562 0 34.7875V53.2125C0 55.2234 1.59844 56.9594 3.74687 56.9594H15.8984L30.8516 68.9734C31.5219 69.5062 32.3125 69.7812 33.1203 69.7812C33.6531 69.7812 34.1859 69.6437 34.7188 69.3859C36.0594 68.7156 36.85 67.5125 36.85 66.0516V21.9656C36.85 20.5047 36.0594 19.3016 34.7188 18.6312Z" fill="var(--mute-button__color)"></path>
        <path class="o-mute-button__unmuted" d="M73.0469 8.07812C82.6547 17.6859 88 30.3875 88 44C88 57.6125 82.6547 70.3141 73.0641 79.9219C72.5312 80.4547 71.8609 80.7297 71.1906 80.7297C70.3828 80.7297 69.7125 80.4547 69.1797 79.9219C68.1141 78.8562 68.1141 77.1203 69.1797 76.0547C77.7219 67.4953 82.5344 56.1516 82.5344 44C82.5344 31.8484 77.8594 20.4875 69.1797 11.9453C68.1141 10.8797 68.1141 9.14374 69.1797 8.07812C70.2453 7.01249 71.9812 7.01249 73.0469 8.07812Z" fill="var(--mute-button__color)"></path>
        <path class="o-mute-button__unmuted" d="M73.7172 44C73.7172 33.9797 69.85 24.6297 63.0266 17.6859C61.9609 16.6203 60.225 16.6203 59.1594 17.6859C58.0937 18.7516 58.0937 20.4875 59.1594 21.5531C64.9 27.4312 68.1141 35.4406 68.1141 43.9828C68.1141 52.525 64.9172 60.5344 58.9016 66.55C57.8359 67.6156 57.8359 69.3516 58.9016 70.4172C59.4344 70.95 60.1047 71.225 60.775 71.225C61.4453 71.225 62.2359 70.95 62.7859 70.4172C69.8328 63.3703 73.7172 54.0203 73.7172 44Z" fill="var(--mute-button__color)"></path>
        <path class="o-mute-button__unmuted" d="M47.4031 27.1734C48.4688 26.1078 50.2047 26.1078 51.2703 27.1734C55.6875 31.5734 58.2141 37.5891 58.0938 44C58.0938 50.4109 55.6875 56.2891 51.2875 60.8266C50.7375 61.3594 49.9469 61.6344 49.2766 61.6344C48.6063 61.6344 47.9359 61.3594 47.4031 60.8266C46.3375 59.7609 46.3375 58.025 47.4031 56.9594C50.875 53.4875 52.7484 48.95 52.7484 44C52.7484 39.05 50.7375 34.5125 47.4031 31.0406C46.3375 29.975 46.3375 28.2391 47.4031 27.1734Z" fill="var(--mute-button__color)"></path>
        <path class="o-mute-button__muted" d="M80.7678 30.2678C81.7441 29.2915 81.7441 27.7085 80.7678 26.7322C79.7915 25.7559 78.2085 25.7559 77.2322 26.7322L63.25 40.7145L49.2678 26.7322C48.2915 25.7559 46.7085 25.7559 45.7322 26.7322C44.7559 27.7085 44.7559 29.2915 45.7322 30.2678L59.7145 44.25L45.7322 58.2322C44.7559 59.2085 44.7559 60.7915 45.7322 61.7678C46.7085 62.7441 48.2915 62.7441 49.2678 61.7678L63.25 47.7855L77.2322 61.7678C78.2085 62.7441 79.7915 62.7441 80.7678 61.7678C81.7441 60.7915 81.7441 58.2322 80.7678 57.2559L66.7855 44.25L80.7678 30.2678Z" fill="var(--mute-button__color)"></path>
      </svg>
    </button>`;
  }

  private styleAttr(value: unknown, prefix: 'group-section' | 'group-banner' | 'unit-card' | 'unit-banner' | 'unit-text'): string {
    const record = this.asRecord(value);
    const styles: string[] = [];
    const properties = this.customProperties(record);

    for (const [key, rawValue] of Object.entries(properties)) {
      if (key === 'id' || key === 'identifier' || rawValue === null || rawValue === undefined || rawValue === '') continue;
      styles.push(`${key}:${String(rawValue)}`);
    }

    const background = record['backgroundcolor'];
    if (typeof background === 'string' && background) styles.push(`--${prefix}__bg-color:${background}`);

    const columns = this.asRecord(record['columns']);
    if (columns['sm'] !== undefined) styles.push(`--${prefix}__columns:${columns['sm']}`);
    if (columns['md'] !== undefined) styles.push(`--${prefix}__columns-sm:${columns['md']}`);
    if (columns['lg'] !== undefined) styles.push(`--${prefix}__columns-md:${columns['lg']}`);
    if (columns['xl'] !== undefined) styles.push(`--${prefix}__columns-lg:${columns['xl']}`);
    if (typeof record['columns'] === 'number') styles.push(`--${prefix}__columns:${record['columns']}`);

    const direction = this.asRecord(record['direction']);
    if (direction['sm'] !== undefined) styles.push(`--${prefix}__direction:${direction['sm']}`);
    if (direction['md'] !== undefined) styles.push(`--${prefix}__direction-sm:${direction['md']}`);
    if (direction['lg'] !== undefined) styles.push(`--${prefix}__direction-md:${direction['lg']}`);
    if (direction['xl'] !== undefined) styles.push(`--${prefix}__direction-lg:${direction['xl']}`);
    if (typeof record['direction'] === 'string') styles.push(`--${prefix}__direction:${record['direction']}`);

    this.addTextAlignmentStyles(styles, record, prefix);

    return this.escapeAttr(styles.join(';'));
  }

  private sliderStyleAttr(value: unknown): string {
    const columns = this.asRecord(this.asRecord(value)['columns']);
    const styles = [
      columns['sm'] ? `--slider__nb--sm:${columns['sm']}` : '',
      columns['md'] ? `--slider__nb--md:${columns['md']}` : '',
      columns['lg'] ? `--slider__nb--lg:${columns['lg']}` : '',
      columns['xl'] ? `--slider__nb--xl:${columns['xl']}` : ''
    ].filter(Boolean).join(';');
    return this.escapeAttr(styles);
  }

  private sliderDataAttrs(value: unknown): string {
    const config = this.asRecord(this.asRecord(value)['config_extra']);
    const sliderAttrs = this.asRecord(config['slider_attr']);
    const attrs = Object.entries(sliderAttrs)
      .filter(([, attrValue]) => attrValue !== null && attrValue !== undefined && attrValue !== '')
      .map(([key, attrValue]) => ` data-${this.escapeAttr(key)}="${this.escapeAttr(String(attrValue))}"`);

    return attrs.join('');
  }

  private renderSliderNav(value: unknown): string {
    const config = this.asRecord(this.asRecord(value)['config_extra']);
    const sliderAttrs = this.asRecord(config['slider_attr']);
    if (sliderAttrs['nav'] !== true && sliderAttrs['nav'] !== 'true') return '';

    const bullets = this.childItems(value)
      .map((_, index) => `<button type="button" class="c-slider-carousel__bullet${index === 0 ? ' is-active' : ''}" aria-label="Carousel page ${index + 1}"></button>`)
      .join('');

    return bullets ? `<div class="c-slider-carousel__nav">${bullets}</div>` : '';
  }

  private bannerWrapperClasses(value: unknown): string {
    const alignment = this.alignmentFor(value);
    return this.classAttr([
      'st-unit-banner__wrapper',
      ...this.alignmentClasses(alignment['horizontal']),
      ...this.alignmentClasses(alignment['vertical']),
      ...this.alignmentClasses(alignment['packing'])
    ]);
  }

  private addTextAlignmentStyles(
    styles: string[],
    value: unknown,
    prefix: 'group-section' | 'group-banner' | 'unit-card' | 'unit-banner' | 'unit-text'
  ): void {
    if (prefix !== 'unit-card' && prefix !== 'unit-text') return;

    const alignment = this.alignmentFor(value);
    this.addResponsiveCssVariable(styles, `--${prefix}__text-align`, alignment['horizontal']);
  }

  private addResponsiveCssVariable(styles: string[], variable: string, value: unknown): void {
    if (typeof value === 'string' && value) {
      styles.push(`${variable}:${value}`);
      return;
    }

    const record = this.asRecord(value);
    if (record['sm'] !== undefined) styles.push(`${variable}:${record['sm']}`);
    if (record['md'] !== undefined) styles.push(`${variable}-sm:${record['md']}`);
    if (record['lg'] !== undefined) styles.push(`${variable}-md:${record['lg']}`);
    if (record['xl'] !== undefined) styles.push(`${variable}-lg:${record['xl']}`);
  }

  private booleanValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
    }

    return fallback;
  }

  private alignmentClasses(value: unknown): string[] {
    if (typeof value === 'string' && value) {
      return [`st-unit-banner__wrapper--${value}`];
    }

    const record = this.asRecord(value);
    return [
      record['sm'] ? `st-unit-banner__wrapper--${record['sm']}` : '',
      record['md'] ? `st-unit-banner__wrapper@sm--${record['md']}` : '',
      record['lg'] ? `st-unit-banner__wrapper@md--${record['lg']}` : ''
    ].filter((className): className is string => Boolean(className));
  }

  private alignmentFor(value: unknown): Record<string, unknown> {
    const record = this.asRecord(value);
    const alignment = this.asRecord(record['config_alignment']);
    if (Object.keys(alignment).length) return alignment;
    return this.asRecord(record['config_aligment']);
  }

  private idAttr(value: unknown): string {
    const id = this.customProperties(value)['id'] || this.customProperties(value)['identifier'];
    return typeof id === 'string' && id ? ` id="${this.escapeAttr(id)}"` : '';
  }

  private classAttr(classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).map((className) => this.escapeAttr(String(className))).join(' ');
  }

  private localizedText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((item) => this.localizedText(item)).find(Boolean) || '';

    const record = this.asRecord(value);
    for (const key of ['es-ES', 'default', 'en-GB', 'en-IE']) {
      const text = this.localizedText(record[key]);
      if (text) return text;
    }

    return '';
  }

  private textTag(type: string, config: Record<string, unknown>, parent?: unknown): string {
    if (type === 'label') return 'span';

    const parentConfig = this.asRecord(this.asRecord(parent)['config_extra']);
    const parentTag = type === 'title'
      ? parentConfig['title_tag']
      : type === 'subtitle'
        ? parentConfig['subtitle_tag']
        : type === 'cta'
          ? parentConfig['cta_tag']
          : undefined;
    const configuredTag = config['html_tag'] ?? parentTag;

    return this.safeTag(this.tagValue(configuredTag) || this.defaultTextTag(type));
  }

  private defaultTextTag(type: string): string {
    if (type === 'title') return 'h2';
    if (type === 'subtitle') return 'h3';
    if (type === 'description') return 'p';
    return 'div';
  }

  private tagValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return this.tagValue(value[0]);
    return '';
  }

  private textHtml(value: string, allowMarkdown: boolean): string {
    const parts = value.split(/\n+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((part) => `<div>${this.textInlineHtml(part, allowMarkdown)}</div>`).join('');
    }

    return this.textInlineHtml(value, allowMarkdown);
  }

  private textInlineHtml(value: string, allowMarkdown: boolean): string {
    const escaped = this.escapeHtml(value.trim());
    if (!allowMarkdown) return escaped;

    return escaped
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s#]+[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\n/g, '<br>');
  }

  private safeTag(value: string): string {
    return /^(h1|h2|h3|h4|h5|h6|p|span|div|strong)$/i.test(value) ? value.toLowerCase() : 'div';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttr(value: string): string {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  }

  private basePreviewCss(): string {
    return `
      * { box-sizing: border-box; }
      html, body { margin: 0; min-width: 0; overflow-x: hidden; background: #fff; color: #111; font-family: var(--font__primary, Azeret, Arial, Helvetica, sans-serif); }
      body { width: 100%; }
      img, video { max-width: 100%; }
      .u-full-width { width: 100%; }
      .u-hidden\\@sm--up { display: initial; }
      .u-hidden\\@sm--down { display: none !important; }
      .st-group-section { width: 100%; max-width: var(--group-section__max-width, 100%); margin: var(--group-section__margin, 0 auto); padding: var(--group-section__padding, 0); background-color: var(--group-section__bg-color); overflow: var(--group-section__overflow, initial); text-align: var(--group-section__text-align); }
      .st-group-section__wrapper { width: var(--group-section__width--wrapper, 100%); max-width: var(--group-section__max-width--wrapper, 100%); margin: var(--group-section__margin--wrapper, 0 auto); padding: var(--group-section__padding--wrapper, 0); overflow: var(--group-section__overflow--wrapper); display: grid; grid-template-columns: var(--group-section__template-columns, repeat(var(--group-section__columns, 1), minmax(0, 1fr))); grid-template-rows: var(--group-section__template-rows, auto); row-gap: var(--group-section__row-gap, 0); column-gap: var(--group-section__column-gap, 0); }
      .st-group-section__hgroup, .st-group-banner__hgroup { display: flex; flex-direction: column; margin: 0; padding: 16px 0; }
      .st-group-banner { width: 100%; max-width: var(--group-banner__max-width, 100%); margin: var(--group-banner__margin, 0); padding: var(--group-banner__padding, 0); background-color: var(--group-banner__bg-color); overflow: var(--group-banner__overflow, initial); display: flex; flex-direction: column; grid-column: var(--group-banner__grid-column); }
      .st-group-banner__wrapper { display: grid; grid-template-columns: var(--group-banner__template-columns, repeat(var(--group-banner__columns, 1), minmax(0, 1fr))); grid-template-rows: var(--group-banner__template-rows, auto); row-gap: var(--group-banner__row-gap, 0); column-gap: var(--group-banner__column-gap, 0); margin: var(--group-banner__margin--wrapper, 0); padding: var(--group-banner__padding--wrapper, 0); }
      .st-unit-card, .st-unit-text { position: relative; width: 100%; max-width: var(--unit-card__max-width, var(--unit-text__max-width, 100%)); margin: var(--unit-card__margin, var(--unit-text__margin, 0 auto)); padding: var(--unit-card__padding, var(--unit-text__padding, 0)); color: var(--unit-card__text-color, var(--unit-text__text-color, #111)); font-family: var(--unit-card__font-family, var(--unit-text__font-family, inherit)); text-align: var(--unit-card__text-align, var(--unit-text__text-align)); display: flex; flex-direction: var(--unit-card__direction, var(--unit-text__direction, column)); grid-column: var(--unit-card__grid-column, var(--unit-text__grid-column)); overflow: var(--unit-card__overflow, visible); }
      .st-unit-banner { position: relative; display: block; width: 100%; height: var(--unit-banner__height, auto); margin: var(--unit-banner__margin, 0 auto); padding: var(--unit-banner__padding, 0); color: var(--unit-banner__text-color, #111); background-color: var(--unit-banner__bg-color, transparent); overflow: var(--unit-banner__overflow, hidden); aspect-ratio: var(--unit-banner__aspect-ratio); grid-column: var(--unit-banner__grid-column); }
      .st-unit-card__img, .st-unit-banner__img { display: block; width: 100%; max-width: var(--unit-card__max-width--img, var(--unit-banner__max-width--img, 100%)); height: var(--unit-card__height--img, var(--unit-banner__height--img, auto)); aspect-ratio: var(--unit-card__aspect-ratio--img, var(--unit-banner__aspect-ratio)); object-fit: cover; margin: var(--unit-card__margin--img, 0 auto); }
      .st-unit-card__media, .st-unit-banner__media { display: block; width: 100%; height: var(--unit-card__height--media, var(--unit-banner__height--media, auto)); object-fit: cover; }
      .has-bg-image .st-unit-banner__img, .has-bg-image .st-unit-banner__media { position: var(--unit-banner__position--img, absolute); inset: 0; height: 100%; }
      .st-unit-card__content, .st-unit-text__content { margin: var(--unit-card__margin--content, var(--unit-text__margin--content)); padding: var(--unit-card__padding--content, var(--unit-text__padding--content, 0)); order: var(--unit-card__order--content, var(--unit-text__order--content)); }
      .st-unit-banner__wrapper { position: absolute; inset: 0; display: flex; justify-content: var(--unit-banner-wrapper__justify-content, center); align-items: var(--unit-banner-wrapper__align-items, center); text-align: var(--unit-banner-wrapper__text-align); z-index: 1; }
      .st-unit-banner__wrapper--left { --unit-banner-wrapper__text-align: left; --unit-banner-wrapper__justify-content: flex-start; }
      .st-unit-banner__wrapper--center { --unit-banner-wrapper__text-align: center; --unit-banner-wrapper__justify-content: center; }
      .st-unit-banner__wrapper--right { --unit-banner-wrapper__text-align: right; --unit-banner-wrapper__justify-content: flex-end; }
      .st-unit-banner__wrapper--top { --unit-banner-wrapper__align-items: flex-start; }
      .st-unit-banner__wrapper--middle { --unit-banner-wrapper__align-items: center; }
      .st-unit-banner__wrapper--bottom { --unit-banner-wrapper__align-items: flex-end; }
      .st-unit-banner__content { padding: var(--unit-banner__padding--content, 16px); margin: var(--unit-banner__margin--content); color: var(--unit-banner__text-color--content, var(--unit-banner__text-color)); display: flex; flex-direction: var(--unit-banner__direction, column); width: var(--unit-banner__width--content); height: var(--unit-banner__height--content); line-height: var(--unit-banner__line-height--content, 1); }
      .st-unit-card__hgroup, .st-unit-text__hgroup, .st-unit-banner__hgroup { padding: var(--unit-card__padding--hgroup, var(--unit-text__padding--hgroup, 0)); display: var(--unit-card__display--hgroup, var(--unit-text__display--hgroup, var(--unit-banner__display--hgroup, block))); }
      .st-unit-card__title, .st-unit-text__title, .st-unit-banner__title { margin: var(--unit-card__margin--title, var(--unit-text__margin--title, var(--unit-banner__margin--title, 0))); padding: var(--unit-card__padding--title, var(--unit-text__padding--title, var(--unit-banner__padding--title, 0))); font-family: var(--unit-card__font-family--title, var(--unit-text__font-family--title, var(--unit-banner__font-family--title, inherit))); font-size: var(--unit-card__font-size--title, var(--unit-text__font-size--title, var(--unit-banner__font-size--title, 1.25rem))); font-weight: var(--unit-card__font-weight--title, var(--unit-text__font-weight--title, var(--unit-banner__font-weight--title, 400))); line-height: var(--unit-card__line-height--title, var(--unit-text__line-height--title, 1.25)); color: var(--unit-card__text-color--title, var(--unit-text__text-color--title, var(--unit-banner__text-color--title, currentColor))); text-align: var(--unit-card__text-align--title, var(--unit-text__text-align--title, var(--unit-banner__text-align--title))); text-transform: var(--unit-card__text-transform--title, var(--unit-text__text-transform--title, var(--unit-banner__text-transform--title))); }
      .st-unit-card__subtitle, .st-unit-text__subtitle, .st-unit-banner__subtitle { margin: var(--unit-card__margin--subtitle, var(--unit-text__margin--subtitle, var(--unit-banner__margin--subtitle, 0))); padding: var(--unit-card__padding--subtitle, var(--unit-text__padding--subtitle, var(--unit-banner__padding--subtitle, 0))); font-size: var(--unit-card__font-size--subtitle, var(--unit-text__font-size--subtitle, var(--unit-banner__font-size--subtitle, 1rem))); font-weight: var(--unit-card__font-weight--subtitle, var(--unit-text__font-weight--subtitle, var(--unit-banner__font-weight--subtitle, 400))); color: var(--unit-card__text-color--subtitle, var(--unit-text__text-color--subtitle, var(--unit-banner__text-color--subtitle, currentColor))); text-align: var(--unit-card__text-align--subtitle, var(--unit-text__text-align--subtitle, var(--unit-banner__text-align--subtitle))); }
      .st-unit-card__description, .st-unit-text__description, .st-unit-banner__description { margin: 0; font-size: var(--unit-card__font-size--description, var(--unit-text__font-size--description, var(--unit-banner__font-size--description, .9rem))); font-weight: var(--unit-card__font-weight--description, var(--unit-text__font-weight--description, var(--unit-banner__font-weight--description, 400))); text-align: var(--unit-card__text-align--description, var(--unit-text__text-align--description, var(--unit-banner__text-align--description))); }
      .st-unit-card__label, .st-unit-text__label, .st-unit-banner__label { display: var(--unit-card__display--label, inline-block); padding: var(--unit-card__padding--label, 0); font-size: var(--unit-card__font-size--label, .8rem); }
      .st-unit-card__cta, .st-unit-text__cta, .st-unit-banner__cta { display: inline-block; margin: var(--unit-card__margin--cta, var(--unit-text__margin--cta, var(--unit-banner__margin--cta))); padding: var(--unit-card__padding--cta, var(--unit-text__padding--cta, var(--unit-banner__padding--cta, 0))); color: var(--unit-card__text-color--cta, var(--unit-text__text-color--cta, var(--unit-banner__text-color--cta, currentColor))); }
      .c-slider-carousel { width: 100%; overflow: hidden; }
      .c-slider-carousel__wrapper { overflow-x: auto; }
      .c-slider-carousel__list { display: flex; gap: var(--slider__gap, 16px); padding: 0; margin: 0; list-style: none; }
      .c-slider-carousel__item { flex: 0 0 calc((100% - (var(--slider__gap, 16px) * (var(--slider__nb--sm, 1) - 1))) / var(--slider__nb--sm, 1)); min-width: 0; }
      .c-slider-carousel__nav { display: flex; justify-content: center; gap: 8px; padding-top: 10px; }
      .c-slider-carousel__bullet { width: 8px; height: 8px; border: 0; border-radius: 50%; background: var(--slider-carousel-bullet__bg-color, #d8d8d8); padding: 0; }
      .c-slider-carousel__bullet.is-active { background: var(--slider-carousel-bullet__bg-color--active, #696969); }
      @media (min-width: 768px) {
        .u-hidden\\@sm--up { display: none !important; }
        .u-hidden\\@sm--down { display: initial !important; }
        .st-group-section { margin: var(--group-section__margin-sm, var(--group-section__margin, 0 auto)); padding: var(--group-section__padding-sm, var(--group-section__padding, 0)); }
        .st-group-section__wrapper { grid-template-columns: var(--group-section__template-columns-sm, var(--group-section__template-columns, repeat(var(--group-section__columns-sm, var(--group-section__columns, 1)), minmax(0, 1fr)))); row-gap: var(--group-section__row-gap-sm, var(--group-section__row-gap, 0)); column-gap: var(--group-section__column-gap-sm, var(--group-section__column-gap, 0)); }
        .st-group-banner__wrapper { grid-template-columns: var(--group-banner__template-columns-sm, var(--group-banner__template-columns, repeat(var(--group-banner__columns-sm, var(--group-banner__columns, 1)), minmax(0, 1fr)))); row-gap: var(--group-banner__row-gap-sm, var(--group-banner__row-gap, 0)); column-gap: var(--group-banner__column-gap-sm, var(--group-banner__column-gap, 0)); }
        .st-unit-card, .st-unit-text { grid-column: var(--unit-card__grid-column-sm, var(--unit-text__grid-column-sm, var(--unit-card__grid-column, var(--unit-text__grid-column)))); padding: var(--unit-card__padding-sm, var(--unit-text__padding-sm, var(--unit-card__padding, var(--unit-text__padding, 0)))); margin: var(--unit-card__margin-sm, var(--unit-text__margin-sm, var(--unit-card__margin, var(--unit-text__margin, 0 auto)))); }
        .st-unit-banner { grid-column: var(--unit-banner__grid-column-sm, var(--unit-banner__grid-column)); }
        .st-unit-card__content, .st-unit-text__content { padding: var(--unit-card__padding-sm--content, var(--unit-text__padding-sm--content, var(--unit-card__padding--content, var(--unit-text__padding--content, 0)))); order: var(--unit-card__order-sm--content, var(--unit-text__order-sm--content, var(--unit-card__order--content, var(--unit-text__order--content)))); }
        .st-unit-card__hgroup, .st-unit-text__hgroup, .st-unit-banner__hgroup { padding: var(--unit-card__padding-sm--hgroup, var(--unit-text__padding-sm--hgroup, var(--unit-banner__padding-sm--hgroup, var(--unit-card__padding--hgroup, var(--unit-text__padding--hgroup, var(--unit-banner__padding--hgroup, 0)))))); }
        .c-slider-carousel__item { flex-basis: calc((100% - (var(--slider__gap, 16px) * (var(--slider__nb--md, var(--slider__nb--sm, 1)) - 1))) / var(--slider__nb--md, var(--slider__nb--sm, 1))); }
      }
      @media (min-width: 1024px) {
        .st-group-section__wrapper { grid-template-columns: var(--group-section__template-columns-md, var(--group-section__template-columns-sm, var(--group-section__template-columns, repeat(var(--group-section__columns-md, var(--group-section__columns-sm, var(--group-section__columns, 1))), minmax(0, 1fr)))); }
        .st-group-banner__wrapper { grid-template-columns: var(--group-banner__template-columns-md, var(--group-banner__template-columns-sm, var(--group-banner__template-columns, repeat(var(--group-banner__columns-md, var(--group-banner__columns-sm, var(--group-banner__columns, 1))), minmax(0, 1fr)))); }
        .c-slider-carousel__item { flex-basis: calc((100% - (var(--slider__gap, 16px) * (var(--slider__nb--lg, var(--slider__nb--md, 1)) - 1))) / var(--slider__nb--lg, var(--slider__nb--md, 1))); }
      }
    `;
  }

  private previewVideoCss(): string {
    return `
      .st-unit-card__media-wrapper {
        position: relative;
      }

      .o-mute-button {
        --mute-button__color: #111;
        position: absolute;
        bottom: var(--mute-button__position-bottom, 0);
        right: var(--mute-button__position-right, 16px);
        z-index: var(--mute-button__z-index, 10);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--mute-button__size, 32px);
        height: var(--mute-button__size, 32px);
        min-width: 32px;
        min-height: 32px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--mute-button__color, #111);
        cursor: pointer;
        pointer-events: auto;
      }

      .o-mute-button::before,
      .o-mute-button::after {
        display: none;
        content: none;
      }

      .o-mute-button .o-icon {
        display: block;
        width: 100%;
        height: 100%;
        flex: none;
        color: currentColor;
        filter: drop-shadow(0 1px 1px rgb(255 255 255 / 45%));
      }

      .o-mute-button .o-icon path {
        fill: currentColor;
      }

      .o-mute-button__muted {
        display: none;
      }

      .o-mute-button.is-muted .o-mute-button__unmuted {
        display: none;
      }

      .o-mute-button.is-muted .o-mute-button__muted {
        display: initial;
      }
    `;
  }

  private previewVideoScript(): string {
    return `
      (function () {
        function deviceForWidth(width) {
          if (width < 768) return 'sm';
          if (width < 1200) return 'md';
          if (width < 2000) return 'lg';
          return 'xl';
        }

        function loadVideo(video) {
          var device = deviceForWidth(window.innerWidth || document.documentElement.clientWidth || 0);
          var videoDevice = video.dataset[device + 'Src'];
          var posterDevice = video.dataset[device + 'Poster'];
          if (posterDevice) video.setAttribute('poster', posterDevice);
          if (videoDevice && !video.classList.contains('is-responsive')) {
            video.setAttribute('src', videoDevice);
            video.classList.add('is-responsive');
            video.load();
          }

          var muteBtn = (video.parentElement && video.parentElement.querySelector('.js-muteBtn')) || video.nextElementSibling;
          if (muteBtn && muteBtn.classList.contains('js-muteBtn') && !muteBtn.classList.contains('is-loaded')) {
            muteBtn.classList.add('is-loaded');
            muteBtn.addEventListener('click', function (event) {
              event.preventDefault();
              event.stopPropagation();
              muteBtn.classList.toggle('is-muted');
              video.muted = !video.muted;
              if (video.paused) video.play().catch(function () {});
            }, false);
          }
        }

        function initVideos() {
          document.querySelectorAll('.js-video-responsive').forEach(loadVideo);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initVideos);
        } else {
          initVideos();
        }
      })();
    `;
  }

  private defaultFontCss(): string {
    return `
      @font-face { font-family: 'Azeret'; font-weight: 300; font-display: swap; src: url('/api/fonts/Azeret-Light.woff2') format('woff2'); }
      @font-face { font-family: 'Azeret'; font-weight: 400; font-display: swap; src: url('/api/fonts/Azeret-Regular.woff2') format('woff2'); }
      @font-face { font-family: 'Azeret'; font-weight: 500; font-display: swap; src: url('/api/fonts/Azeret-Medium.woff2') format('woff2'); }
      @font-face { font-family: 'Azeret'; font-weight: 600; font-display: swap; src: url('/api/fonts/Azeret-SemiBold.woff2') format('woff2'); }
      @font-face { font-family: 'Azeret'; font-weight: 700; font-display: swap; src: url('/api/fonts/Azeret-Bold.woff2') format('woff2'); }
      :root { --font__primary: Azeret, sans-serif; }
    `;
  }

  private previewDocumentCss(): string {
    return `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-width: 0; max-width: 100%; overflow-x: hidden; background: #fff; color: #111; font-family: var(--font__primary, Azeret, Arial, Helvetica, sans-serif); }
      body { width: 100%; }
      section, div, article, picture, img, video, ul, li { max-width: 100%; }
      img, video { display: block; height: auto; }
      picture { display: block; }
      ul { padding: 0; margin: 0; }
    `;
  }

  private allowedInlineProperty(property: string): boolean {
    return [
      'align-items',
      'align-self',
      'border-bottom',
      'display',
      'flex-direction',
      'font-family',
      'font-weight',
      'grid-column',
      'grid-row',
      'justify-content',
      'line-height',
      'order',
      'text-align',
      'text-transform'
    ].includes(property);
  }

  private previewCssValue(value: string): string {
    const viewportWidth = this.previewWidth;

    return value.replace(/(-?\d*\.?\d+)vw/g, (_, amount: string) => {
      const px = Number(amount) * viewportWidth / 100;
      return `${Number(px.toFixed(2))}px`;
    });
  }

  private prefixCss(css: string, prefixes: string[]): string {
    if (!css) return '';

    return css.replace(/(^|})(\s*)([^@{}][^{}]*)\{/g, (match, close: string, space: string, selectors: string) => {
      const prefixedSelectors = selectors
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean)
        .flatMap((selector) => prefixes.map((prefix) => `${prefix} ${selector}`))
        .join(', ');

      return `${close}${space}${prefixedSelectors} {`;
    });
  }

  private slug(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  private extractText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (Array.isArray(value)) return value.map((item) => this.extractText(item)).find(Boolean) || '';

    const record = this.asRecord(value);
    for (const key of ['es-ES', 'default', 'en-GB', 'title', 'subtitle', 'description', 'label']) {
      const text = this.extractText(record[key]);
      if (text) return text;
    }

    for (const item of Object.values(record)) {
      const text = this.extractText(item);
      if (text) return text;
    }

    return '';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
