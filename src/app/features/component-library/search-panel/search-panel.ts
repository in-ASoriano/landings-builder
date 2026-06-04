import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LandingPreviewComponent } from '../../preview/landing-preview/landing-preview';
import { AppendIdChange, SectionSummary } from '../../../models';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LandingPreviewComponent],
  templateUrl: './search-panel.html',
  styleUrls: ['./search-panel.scss']
})
export class SearchPanelComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() showSearch = true;
  @Input() compact = false;
  @Input() eyebrow = 'Biblioteca reutilizable';
  @Input() title = 'Busca componentes ya hechos';
  @Input() emptyMessage = 'No hay resultados para esa busqueda.';
  @Input() query = '';
  @Input() searchPlaceholder = '';
  @Input() components: SectionSummary[] = [];
  @Input() previewComponent?: SectionSummary;
  @Input() previewJson = '';
  @Input() previewTplCss = '';
  @Input() previewThemeCss = '';
  @Input() previewTplPath = '';
  @Input() appendIds: Record<string, string> = {};
  @Input() selectedFile = '';
  @Input() loading = false;
  @Input() previewLoading = false;
  @Input() autocompleteSuggestion = '';

  @Output() queryChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() liveSearch = new EventEmitter<string>();
  @Output() applySuggestion = new EventEmitter<string>();
  @Output() previewComponentChange = new EventEmitter<SectionSummary>();
  @Output() appendComponent = new EventEmitter<SectionSummary>();
  @Output() appendIdChange = new EventEmitter<AppendIdChange>();

  public dropdownOpen = false;
  public libraryFilter = '';
  public libraryDropdownOpen = false;

  @HostListener('document:click', ['$event'])
  public closeDropdownsFromDocument(event: MouseEvent): void {
    if (this.elementRef.nativeElement.contains(event.target as Node)) return;
    this.dropdownOpen = false;
    this.libraryDropdownOpen = false;
  }

  public updateQuery(value: string): void {
    this.queryChange.emit(value);
    this.liveSearch.emit(value);
    this.dropdownOpen = Boolean(value.trim());
  }

  public requestSearch(): void {
    this.dropdownOpen = Boolean(this.query.trim()) || this.components.length > 0;
    this.search.emit();
  }

  public completeWithTab(event: Event): void {
    if (!this.autocompleteSuggestion) return;
    event.preventDefault();
    this.applySuggestion.emit(this.autocompleteSuggestion);
  }

  public closeDropdown(): void {
    this.dropdownOpen = false;
  }

  public shouldShowDropdown(): boolean {
    return this.dropdownOpen && (Boolean(this.query.trim()) || this.components.length > 0);
  }

  public selectPreview(component: SectionSummary): void {
    this.previewComponentChange.emit(component);
    this.dropdownOpen = false;
  }

  public updateLibraryFilter(value: string): void {
    this.libraryFilter = value;
    this.libraryDropdownOpen = true;
  }

  public clearLibraryFilter(): void {
    this.libraryFilter = '';
    this.libraryDropdownOpen = false;
  }

  public openLibraryDropdown(): void {
    this.libraryDropdownOpen = true;
  }

  public closeLibraryDropdown(): void {
    this.libraryDropdownOpen = false;
  }

  public toggleLibraryDropdown(event: Event): void {
    event.stopPropagation();
    this.libraryDropdownOpen = !this.libraryDropdownOpen;
  }

  public selectLibraryComponent(component: SectionSummary): void {
    this.libraryFilter = component.id || component.component;
    this.selectPreview(component);
    this.libraryDropdownOpen = false;
  }

  public selectFirstLibraryComponent(event: Event): void {
    const [first] = this.filteredLibraryComponents();
    if (!first) return;
    event.preventDefault();
    this.selectLibraryComponent(first);
  }

  public filteredLibraryComponents(): SectionSummary[] {
    const terms = this.libraryFilter
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (!terms.length) return this.components;

    return this.components.filter((component) => {
      const haystack = [
        component.id,
        component.component,
        component.file,
        component.title,
        ...component.classes,
        ...component.media.map((media) => `${media.key} ${media.url} ${this.assetFileName(media.url)}`)
      ].join(' ').toLowerCase();

      return terms.every((term) => haystack.includes(term));
    });
  }

  public assetSummary(component: SectionSummary): string {
    const media = component.media.find((item) => item.url);
    if (!media) return '';

    const type = media.key.startsWith('video') ? 'video' : media.key.startsWith('poster') ? 'poster' : 'imagen';
    return `${type}: ${this.assetFileName(media.url)}`;
  }

  public visibleLibraryComponents(): SectionSummary[] {
    return this.filteredLibraryComponents().slice(0, 40);
  }

  public libraryResultText(): string {
    const visible = this.filteredLibraryComponents().length;
    return this.libraryFilter.trim()
      ? `${visible} de ${this.components.length}`
      : `${this.components.length} componentes disponibles`;
  }

  public librarySelectPlaceholder(): string {
    return this.previewComponent
      ? this.previewComponent.id || this.previewComponent.component
      : 'Selecciona o busca por ID, landing, texto, imagen/video o clase...';
  }

  public libraryEmptyText(): string {
    return this.components.length ? 'No hay componentes para ese filtro.' : this.emptyMessage;
  }

  public previewSections(): unknown[] {
    if (this.previewLoading || !this.previewJson.trim()) return [];

    try {
      const section = JSON.parse(this.previewJson);
      if (!section || typeof section !== 'object') return [];
      return Array.isArray(section) ? section : [section];
    } catch {
      return [];
    }
  }

  public isSelected(component: SectionSummary): boolean {
    const preview = this.previewComponent;
    return preview ? this.key(component) === this.key(preview) : false;
  }

  public key(component: SectionSummary): string {
    return component.file + ':' + component.sectionIndex;
  }

  public idValue(component: SectionSummary): string {
    return this.appendIds[this.key(component)] || '';
  }

  public shortText(value = '', max = 130): string {
    if (!value) return 'Sin texto detectado';
    return value.length > max ? value.slice(0, max).trim() + '...' : value;
  }

  private assetFileName(url: string): string {
    try {
      const cleanUrl = new URL(url);
      return cleanUrl.pathname.split('/').filter(Boolean).pop() || url;
    } catch {
      return url.split(/[?#]/)[0].split('/').filter(Boolean).pop() || url;
    }
  }

  public trackBySection(_: number, section: SectionSummary): string {
    return section.file + ':' + section.sectionIndex + ':' + section.id;
  }
}
