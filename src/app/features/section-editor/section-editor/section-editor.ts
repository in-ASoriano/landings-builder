import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SectionSummary } from '../../../models';
import { LandingApiService } from '../../../core/services/landing-api.service';

type JsonPathSegment = string | number;
type VisualFieldKind = 'string' | 'number' | 'boolean' | 'json' | 'list' | 'localized' | 'select' | 'properties';
type EditorPanel = 'fields' | 'json';
type VisualFieldCategory = 'all' | 'text' | 'media' | 'links' | 'layout' | 'advanced';
type BannerUnitType = 'text' | 'card' | 'banner';
type ResponsiveRootKey = 'direction' | 'columns' | 'horizontal' | 'vertical' | 'packing';
type ResponsiveBreakpoint = 'sm' | 'md' | 'lg';

interface VisualCategoryOption {
  id: VisualFieldCategory;
  label: string;
  description: string;
}

interface VisualLocaleField {
  key: string;
  label: string;
  path: JsonPathSegment[];
  value: string;
  multiline: boolean;
  options?: string[];
}

interface VisualField {
  id: string;
  label: string;
  path: JsonPathSegment[];
  pathLabel: string;
  value: string;
  kind: VisualFieldKind;
  multiline: boolean;
  category: VisualFieldCategory;
  hint: string;
  locales?: VisualLocaleField[];
  options?: string[];
  htmlTagField?: VisualField;
}

interface PropertyItem {
  key: string;
  value: string;
}

interface NodeBreadcrumbItem {
  label: string;
  value: string;
}

interface ResponsiveBreakpointOption {
  root: ResponsiveRootKey;
  breakpoint: ResponsiveBreakpoint;
  label: string;
}

interface VisualGroup {
  id: string;
  path: JsonPathSegment[];
  bannerIndex?: number;
  title: string;
  subtitle: string;
  selectorLabel: string;
  component: string;
  summary: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | '';
  hasChildren: boolean;
  fields: VisualField[];
}

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './section-editor.html',
  styleUrls: ['./section-editor.scss']
})
export class SectionEditorComponent implements OnInit, OnDestroy {
  private readonly api = inject(LandingApiService);

  @Input() current?: SectionSummary;
  @Input() selectedSectionIndex = 0;
  @Input() selectedSectionJson = '';
  @Input() landingSectionIds: string[] = [];
  @Input() sectionJsonError = '';
  @Input() savingSection = false;
  @Input() deletingSection = false;
  @Input() duplicatingSection = false;
  @Input() addingBanner = false;

  @Output() selectedSectionJsonChange = new EventEmitter<string>();
  @Output() formatSection = new EventEmitter<void>();
  @Output() saveSection = new EventEmitter<void>();
  @Output() duplicateSection = new EventEmitter<void>();
  @Output() addBanner = new EventEmitter<void>();
  @Output() deleteSection = new EventEmitter<void>();

  public visualFormError = '';
  public expandedLanguageFields: Record<string, boolean> = {};
  public activeLanguageTabs: Record<string, string> = {};
  public activePanel: EditorPanel = 'fields';
  public activeFieldCategory: VisualFieldCategory = 'all';
  public activeVisualGroupId = '';
  public jsonCopied = false;
  public draggingBannerId = '';
  public dropTargetBannerId = '';
  public pendingDeleteBannerId = '';
  public newBannerMenuOpen = false;
  public utilityClasses: string[] = [];
  public unitCustomProperties: Record<'text' | 'card' | 'banner', string[]> = {
    text: [],
    card: [],
    banner: []
  };
  public classInputValues: Record<string, string> = {};
  public propertyKeyInputValues: Record<string, string> = {};
  public activeUtilitySuggestionIndexes: Record<string, number> = {};
  public activePropertySuggestionIndexes: Record<string, number> = {};
  private jsonCopiedTimeout?: ReturnType<typeof setTimeout>;
  private parsedJsonCache = '';
  private parsedSectionCache: unknown;
  private visualGroupsJsonCache = '';
  private visualGroupsCache: VisualGroup[] = [];
  private visibleGroupsCacheKey = '';
  private visibleGroupsCache: VisualGroup[] = [];

  public readonly fieldCategories: VisualCategoryOption[] = [
    { id: 'all', label: 'Todo', description: 'Todos los campos editables' },
    { id: 'text', label: 'Textos', description: 'Títulos, descripciones, labels y CTA' },
    { id: 'media', label: 'Media', description: 'Imágenes, videos y posters responsive' },
    { id: 'links', label: 'Links', description: 'Ecom links y navegación' },
    { id: 'layout', label: 'Layout', description: 'Columnas, dirección, color y alineación' },
    { id: 'advanced', label: 'Avanzado', description: 'Clases y custom properties' }
  ];

  public setActivePanel(panel: EditorPanel): void {
    this.activePanel = panel;
  }

  public handleJsonTextareaKeydown(event: KeyboardEvent, textarea: HTMLTextAreaElement): void {
    if (event.key !== 'Tab') return;

    event.preventDefault();

    const indent = '  ';
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const selectionEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const lineEnd = value.indexOf('\n', selectionEnd);
    const blockEnd = lineEnd === -1 ? value.length : lineEnd;
    const before = value.slice(0, lineStart);
    const block = value.slice(lineStart, blockEnd);
    const after = value.slice(blockEnd);

    if (!event.shiftKey) {
      if (start === end) {
        this.updateJsonTextarea(textarea, value.slice(0, start) + indent + value.slice(end), start + indent.length, start + indent.length);
        return;
      }

      const indented = block.split('\n').map((line) => indent + line).join('\n');
      const added = indented.length - block.length;
      this.updateJsonTextarea(textarea, before + indented + after, start + indent.length, end + added);
      return;
    }

    const lines = block.split('\n');
    let removedBeforeStart = 0;
    let removedTotal = 0;
    const outdented = lines.map((line, index) => {
      const removed = line.startsWith(indent) ? indent.length : line.startsWith(' ') ? 1 : 0;
      if (lineStart + lines.slice(0, index).join('\n').length + index < start) removedBeforeStart += removed;
      removedTotal += removed;
      return line.slice(removed);
    }).join('\n');

    this.updateJsonTextarea(textarea, before + outdented + after, Math.max(lineStart, start - removedBeforeStart), Math.max(lineStart, end - removedTotal));
  }

  public ngOnInit(): void {
    this.api.getUtilityClasses().subscribe({
      next: ({ classes }) => {
        this.utilityClasses = classes;
      },
      error: () => {
        this.utilityClasses = [];
      }
    });

    this.api.getUnitCustomProperties().subscribe({
      next: ({ properties }) => {
        this.unitCustomProperties = {
          text: properties.text || [],
          card: properties.card || [],
          banner: properties.banner || []
        };
      },
      error: () => {
        this.unitCustomProperties = { text: [], card: [], banner: [] };
      }
    });
  }

  public ngOnDestroy(): void {
    if (this.jsonCopiedTimeout) clearTimeout(this.jsonCopiedTimeout);
  }

  public copySectionJson(): void {
    this.copyText(this.selectedSectionJson)
      .then(() => {
        this.jsonCopied = true;
        if (this.jsonCopiedTimeout) clearTimeout(this.jsonCopiedTimeout);
        this.jsonCopiedTimeout = setTimeout(() => {
          this.jsonCopied = false;
        }, 1800);
      })
      .catch(() => {
        this.visualFormError = 'No se ha podido copiar el JSON.';
      });
  }

  public setActiveFieldCategory(category: VisualFieldCategory): void {
    this.activeFieldCategory = category;
  }

  public selectVisualGroup(group: VisualGroup): void {
    if (this.activeVisualGroupId !== group.id) {
      this.pendingDeleteBannerId = '';
      this.newBannerMenuOpen = false;
    }
    this.activeVisualGroupId = group.id;
    if (this.countFieldsInGroups(this.activeFieldCategory, [group]) === 0) {
      this.activeFieldCategory = 'all';
    }
  }

  public shortText(value = '', max = 130): string {
    if (!value) return 'Sin texto detectado';
    return value.length > max ? value.slice(0, max).trim() + '...' : value;
  }

  public visualGroups(): VisualGroup[] {
    if (this.visualGroupsJsonCache === this.selectedSectionJson) {
      return this.visualGroupsCache;
    }

    const section = this.parseSectionJson();
    if (!section) {
      this.visualGroupsJsonCache = this.selectedSectionJson;
      this.visualGroupsCache = [];
      return this.visualGroupsCache;
    }

    const groups: VisualGroup[] = [];
    this.collectGroups(section, [], 'Sección', groups);
    this.visualGroupsJsonCache = this.selectedSectionJson;
    this.visualGroupsCache = groups.filter((group) => group.fields.length);
    return this.visualGroupsCache;
  }

  public visibleVisualGroups(): VisualGroup[] {
    const cacheKey = `${this.selectedSectionJson}::${this.selectedVisualGroupId()}::${this.activeFieldCategory}`;
    if (this.visibleGroupsCacheKey === cacheKey) {
      return this.visibleGroupsCache;
    }

    this.visibleGroupsCacheKey = cacheKey;
    this.visibleGroupsCache = this.selectedVisualGroups()
      .map((group) => ({
        ...group,
        fields: group.fields.filter((field) => this.activeFieldCategory === 'all' || field.category === this.activeFieldCategory)
      }))
      .filter((group) => group.fields.length);

    return this.visibleGroupsCache;
  }

  public categoryCount(category: VisualFieldCategory): number {
    return this.countFieldsInGroups(category, this.selectedVisualGroups());
  }

  public visualGroupOptions(): VisualGroup[] {
    return this.visualGroups();
  }

  public selectedVisualGroupId(): string {
    const groups = this.visualGroups();
    if (!groups.length) return '';
    if (this.activeVisualGroupId && groups.some((group) => group.id === this.activeVisualGroupId)) {
      return this.activeVisualGroupId;
    }
    return groups.find((group) => group.id.includes('banners.'))?.id || groups[0].id;
  }

  public selectedVisualGroups(): VisualGroup[] {
    const groups = this.visualGroups();
    const selectedId = this.selectedVisualGroupId();
    return groups.filter((group) => group.id === selectedId);
  }

  public selectedVisualGroup(): VisualGroup | undefined {
    const selectedId = this.selectedVisualGroupId();
    return this.visualGroups().find((group) => group.id === selectedId);
  }

  public selectedBannerGroup(): VisualGroup | undefined {
    const group = this.selectedVisualGroup();
    return group && this.isBannerGroup(group) ? group : undefined;
  }

  public canMoveSelectedBanner(direction: -1 | 1): boolean {
    const group = this.selectedBannerGroup();
    if (!group || group.bannerIndex === undefined) return false;

    const targetIndex = group.bannerIndex + direction;
    const siblings = this.bannerSiblingsForGroup(group);
    return targetIndex >= 0 && targetIndex < siblings.length;
  }

  public moveSelectedBanner(direction: -1 | 1): void {
    const group = this.selectedBannerGroup();
    if (!group || group.bannerIndex === undefined || !this.canMoveSelectedBanner(direction)) return;

    this.moveBannerByGroup(group, group.bannerIndex + direction);
  }

  public duplicateSelectedBanner(): void {
    const group = this.selectedBannerGroup();
    if (!group) return;

    this.duplicateBannerByGroup(group);
  }

  public toggleNewBannerMenu(): void {
    this.newBannerMenuOpen = !this.newBannerMenuOpen;
    this.pendingDeleteBannerId = '';
  }

  public createDifferentBannerAfterSelected(type: BannerUnitType): void {
    const group = this.selectedBannerGroup();
    if (!group) return;

    this.createBannerByGroup(group, type);
  }

  public requestDeleteSelectedBanner(): void {
    const group = this.selectedBannerGroup();
    if (!group) return;

    if (this.pendingDeleteBannerId !== group.id) {
      this.pendingDeleteBannerId = group.id;
      this.newBannerMenuOpen = false;
      return;
    }

    this.deleteBannerByGroup(group);
  }

  public isDeleteSelectedBannerPending(group: VisualGroup): boolean {
    return this.pendingDeleteBannerId === group.id;
  }

  public isBannerGroup(group: VisualGroup): boolean {
    return group.bannerIndex !== undefined;
  }

  public isDraggingBanner(group: VisualGroup): boolean {
    return this.draggingBannerId === group.id;
  }

  public isDropTargetBanner(group: VisualGroup): boolean {
    return this.dropTargetBannerId === group.id && this.draggingBannerId !== group.id;
  }

  public startBannerDrag(event: DragEvent, group: VisualGroup): void {
    if (!this.isBannerGroup(group)) return;

    this.draggingBannerId = group.id;
    event.dataTransfer?.setData('text/plain', group.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  public dragOverBanner(event: DragEvent, group: VisualGroup): void {
    if (!this.draggingBannerId || !this.isBannerGroup(group)) return;

    const draggingGroup = this.visualGroups().find((item) => item.id === this.draggingBannerId);
    if (!draggingGroup || !this.areSiblingBanners(draggingGroup, group)) return;

    event.preventDefault();
    this.dropTargetBannerId = group.id;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  public dropBanner(event: DragEvent, group: VisualGroup): void {
    if (!this.draggingBannerId || !this.isBannerGroup(group)) return;

    event.preventDefault();
    const draggingGroup = this.visualGroups().find((item) => item.id === this.draggingBannerId);
    if (draggingGroup && this.areSiblingBanners(draggingGroup, group) && group.bannerIndex !== undefined) {
      this.moveBannerByGroup(draggingGroup, group.bannerIndex);
    }

    this.endBannerDrag();
  }

  public endBannerDrag(): void {
    this.draggingBannerId = '';
    this.dropTargetBannerId = '';
  }

  public selectedNodeBreadcrumb(): NodeBreadcrumbItem[] {
    const group = this.selectedVisualGroup();
    if (!group) return [];

    const items: NodeBreadcrumbItem[] = [
      {
        label: 'Seccion',
        value: String(this.selectedSectionIndex + 1)
      }
    ];

    if (!group.path.length) {
      items.push({
        label: 'Nodo',
        value: group.component
      });
      return items;
    }

    for (let index = 0; index < group.path.length; index += 1) {
      const part = group.path[index];
      const previous = group.path[index - 1];
      if (previous === 'banners' && typeof part === 'number') {
        items.push({
          label: 'Banner',
          value: String(part + 1)
        });
      }
    }

    items.push({
      label: 'Tipo',
      value: group.component
    });

    return items;
  }

  public currentNodeId(): string {
    const section = this.parseSectionJson();
    if (!section) return '';

    return this.nodeId(section);
  }

  public suggestedNodeId(): string {
    const section = this.parseSectionJson();
    if (!section) return '';

    const currentId = this.nodeId(section);
    const base = this.suggestSectionIdBase(section);
    return this.uniqueNodeId(section, base, currentId);
  }

  public applySuggestedNodeId(): void {
    const group = this.selectedVisualGroup();
    const section = this.parseSectionJson();
    const suggestedId = this.suggestedNodeId();
    if (!group || !section || !suggestedId) return;

    this.setNodeId(section, [], suggestedId);
    this.visualFormError = '';
    this.commitSectionJson(section);
  }

  public updateCurrentNodeId(value: string): void {
    const section = this.parseSectionJson();
    if (!section) return;

    this.setNodeId(section, [], value.trim());
    this.visualFormError = '';
    this.commitSectionJson(section);
  }

  public clearCurrentNodeId(): void {
    const section = this.parseSectionJson();
    if (!section) return;

    this.setNodeId(section, [], '');
    this.visualFormError = '';
    this.commitSectionJson(section);
  }

  private countFieldsInGroups(category: VisualFieldCategory, groups: VisualGroup[]): number {
    return groups.reduce((total, group) => {
      if (category === 'all') return total + group.fields.length;
      return total + group.fields.filter((field) => field.category === category).length;
    }, 0);
  }

  public inputType(field: VisualField): string {
    if (this.isCompactField(field)) return 'text';
    if (field.kind === 'number') return 'number';
    if (this.isUrlPath(field.path)) return 'url';
    return 'text';
  }

  public numericInputMode(field: VisualField): string | null {
    return this.isCompactField(field) ? 'numeric' : null;
  }

  public handleNumericFieldKeydown(event: KeyboardEvent, field: VisualField): void {
    if (!this.isCompactField(field)) return;

    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (/^\d$/.test(event.key)) return;

    event.preventDefault();
  }

  public handleNumericFieldPaste(event: ClipboardEvent, field: VisualField): void {
    if (!this.isCompactField(field)) return;

    const text = event.clipboardData?.getData('text') || '';
    if (/^\d+$/.test(text.trim())) return;

    event.preventDefault();
  }

  public mediaFieldKind(field: VisualField): 'image' | 'video' | '' {
    if (!field.value || !/^https?:\/\//i.test(field.value)) return '';
    const path = field.path.map((part) => String(part)).join('.');
    if (path.includes('video_responsive')) return 'video';
    if (path.includes('image_responsive') || path.includes('poster_responsive')) return 'image';
    return '';
  }

  public isCompactField(field: VisualField): boolean {
    return field.kind === 'number' && field.path.some((part) => String(part) === 'columns');
  }

  public isResponsiveField(field: VisualField): boolean {
    return Boolean(this.responsiveFieldRoot(field));
  }

  public responsiveFieldRoot(field: VisualField): string {
    const root = String(field.path[field.path.length - 2] || '');
    return ['direction', 'columns', 'horizontal', 'vertical', 'packing'].includes(root) ? root : '';
  }

  public isAlignmentResponsiveField(field: VisualField): boolean {
    return this.isAlignmentRoot(this.responsiveFieldRoot(field));
  }

  public isWideField(field: VisualField): boolean {
    return field.multiline || field.kind === 'json' || field.kind === 'localized' || field.kind === 'list' || field.category === 'media';
  }

  public groupHasResponsiveFields(group: VisualGroup): boolean {
    return group.fields.some((field) => this.isResponsiveField(field));
  }

  public startsAfterResponsiveFields(group: VisualGroup, field: VisualField): boolean {
    const index = group.fields.findIndex((item) => item.id === field.id);
    if (index < 1 || this.isResponsiveField(field)) return false;

    return this.isResponsiveField(group.fields[index - 1]);
  }

  public isAfterResponsiveFields(group: VisualGroup, field: VisualField): boolean {
    const index = group.fields.findIndex((item) => item.id === field.id);
    let lastResponsiveIndex = -1;

    group.fields.forEach((item, itemIndex) => {
      if (this.isResponsiveField(item)) lastResponsiveIndex = itemIndex;
    });

    return index > lastResponsiveIndex && lastResponsiveIndex >= 0;
  }

  public isFirstResponsiveField(group: VisualGroup, field: VisualField, root: ResponsiveRootKey): boolean {
    if (this.responsiveFieldRoot(field) !== root) return false;
    return group.fields.find((item) => this.responsiveFieldRoot(item) === root)?.id === field.id;
  }

  public displayFieldLabel(field: VisualField): string {
    const responsiveLabel = this.responsiveFieldBreakpointLabel(field);
    return responsiveLabel || this.compactFieldLabel(field) || field.label;
  }

  public displayFieldTitle(field: VisualField): string {
    const hint = this.displayFieldHint(field);
    return hint ? `${field.label} (${hint})` : field.label;
  }

  public displayFieldHint(field: VisualField): string {
    const responsiveLabel = this.responsiveFieldBreakpointLabel(field);
    if (!responsiveLabel) return field.hint || field.pathLabel;

    const root = String(field.path[field.path.length - 2] || field.path[0] || '');
    const breakpoint = String(field.path[field.path.length - 1] || '');
    return `${root} / ${breakpoint}`;
  }

  private compactFieldLabel(field: VisualField): string {
    const root = String(field.path.find((part) => typeof part === 'string' && this.editableRootKeys().includes(part)) || '');
    const key = this.lastMeaningfulPathKey(field.path);

    if (root === 'ecom_link') {
      return this.ecomLinkFieldLabel(key);
    }

    if (root === 'config_alignment' || root === 'config_aligment') {
      const axis = this.alignmentAxisLabel(field.path);
      const breakpoint = this.breakpointLabelFromPath(field.path);
      return [axis, breakpoint].filter(Boolean).join(' ');
    }

    if (root === 'image_responsive' || root === 'video_responsive' || root === 'poster_responsive') {
      return this.mediaFieldLabel(field.path, root);
    }

    return '';
  }

  private ecomLinkFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      type: 'Type',
      identifier: 'Identifier',
      url: 'URL',
      anchor: 'Anchor',
      obfuscated: 'Obfuscated',
      custom_class: 'Custom class'
    };

    return labels[key] || this.humanize(key);
  }

  private mediaFieldLabel(path: JsonPathSegment[], root: string): string {
    const prefix = root === 'image_responsive' ? 'Image' : root === 'video_responsive' ? 'Video' : 'Poster';
    const key = this.lastMeaningfulPathKey(path);
    const size = key.split('_').pop() || '';

    return `${prefix} ${size.toUpperCase()}`;
  }

  private alignmentAxisLabel(path: JsonPathSegment[]): string {
    const axis = path.find((part) => part === 'horizontal' || part === 'vertical');
    return axis ? this.humanize(String(axis)) : 'Alignment';
  }

  private breakpointLabelFromPath(path: JsonPathSegment[]): string {
    const breakpoint = [...path].reverse().find((part) => ['sm', 'md', 'lg', 'xl'].includes(String(part)));
    return breakpoint ? this.breakpointLabel(String(breakpoint)) : '';
  }

  private lastMeaningfulPathKey(path: JsonPathSegment[]): string {
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const part = String(path[index]);
      if (part === 'default' || this.isLocaleKey(part) || /^(sm|md|lg|xl)$/.test(part)) continue;
      if (/^\d+$/.test(part)) continue;
      return part;
    }

    return String(path[path.length - 1] || '');
  }

  public responsiveBreakpointOptions(group: VisualGroup): ResponsiveBreakpointOption[] {
    const section = this.parseSectionJson();
    const node = section ? this.asRecord(this.nodeAtPath(section, group.path)) : {};
    const options: ResponsiveBreakpointOption[] = [];

    for (const root of ['direction', 'columns'] as ResponsiveRootKey[]) {
      if (!(root in node)) continue;

      const current = this.responsiveRootRecord(node[root]);
      for (const breakpoint of ['md', 'lg'] as ResponsiveBreakpoint[]) {
        if (current[breakpoint] !== undefined && current[breakpoint] !== null) continue;
        options.push({
          root,
          breakpoint,
          label: `Añadir ${this.humanize(root)} ${this.breakpointLabel(breakpoint)}`
        });
      }
    }

    if (this.isBannerChildPath(group.path)) {
      const alignment = this.asRecord(node['config_alignment'] ?? node['config_aligment']);
      for (const root of this.alignmentRootKeysForNode(node)) {
        const current = this.responsiveRootRecord(alignment[root]);
        const breakpoints: ResponsiveBreakpoint[] = current['sm'] === undefined || current['sm'] === null
          ? ['sm']
          : ['md', 'lg'];

        for (const breakpoint of breakpoints) {
          if (current[breakpoint] !== undefined && current[breakpoint] !== null) continue;
          options.push({
            root,
            breakpoint,
            label: `Añadir ${this.humanize(root)} ${this.breakpointLabel(breakpoint)}`
          });
        }
      }
    }

    return options;
  }

  public addResponsiveBreakpoint(group: VisualGroup, root: ResponsiveRootKey, breakpoint: ResponsiveBreakpoint): void {
    const section = this.parseSectionJson();
    if (!section) return;

    const node = this.asRecord(this.nodeAtPath(section, group.path));
    if (!Object.keys(node).length) return;

    const alignmentKey = this.configAlignmentKey(node);
    const isAlignmentRoot = this.isAlignmentRoot(root);
    const parent = isAlignmentRoot ? this.asRecord(node[alignmentKey]) : node;
    const current = this.responsiveRootRecord(parent[root]);

    current[breakpoint] = this.defaultResponsiveBreakpointValue(root, current, breakpoint);
    parent[root] = current;
    if (isAlignmentRoot) node[alignmentKey] = parent;

    this.visualFormError = '';
    this.commitSectionJson(section);
  }

  public canRemoveResponsiveBreakpoint(field: VisualField): boolean {
    const root = this.responsiveFieldRoot(field);
    const breakpoint = String(field.path[field.path.length - 1] || '');
    if (this.isAlignmentRoot(root)) return ['sm', 'md', 'lg'].includes(breakpoint);
    return ['direction', 'columns'].includes(root) && ['md', 'lg'].includes(breakpoint);
  }

  public removeResponsiveBreakpoint(field: VisualField): void {
    if (!this.canRemoveResponsiveBreakpoint(field)) return;

    const section = this.parseSectionJson();
    if (!section) return;

    const parentPath = field.path.slice(0, -1);
    const parent = this.asRecord(this.nodeAtPath(section, parentPath));
    const breakpoint = String(field.path[field.path.length - 1] || '');
    delete parent[breakpoint];
    if (this.isAlignmentRoot(this.responsiveFieldRoot(field)) && !Object.keys(parent).length) {
      const grandParent = this.asRecord(this.nodeAtPath(section, parentPath.slice(0, -1)));
      delete grandParent[String(parentPath[parentPath.length - 1])];
    }
    this.visualFormError = '';
    this.commitSectionJson(section);
  }

  public listItems(field: VisualField): string[] {
    return field.value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  public addListItem(field: VisualField, value: string): void {
    const nextItems = value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!nextItems.length) return;

    const uniqueItems = [...new Set([...this.listItems(field), ...nextItems])];
    this.updateVisualField(field, uniqueItems.join(', '));
    this.classInputValues[field.id] = '';
  }

  public handleListInputKeydown(event: KeyboardEvent, field: VisualField, input: HTMLInputElement): void {
    const value = this.classInputValue(field) || input.value;
    const suggestions = this.utilityClassSuggestions(field, value);
    const suggestion = this.firstUtilityClassSuggestion(field, value);

    if (this.handleUtilitySuggestionKeys(event, field, input, suggestions)) return;

    if ((event.key === 'Tab' || event.key === 'Enter') && suggestion) {
      event.preventDefault();
      this.addListItem(field, suggestion);
      input.value = '';
      this.activeUtilitySuggestionIndexes[field.id] = -1;
      return;
    }

    if (event.key !== 'Enter' && event.key !== ',') return;

    event.preventDefault();
    this.addListItem(field, value);
    input.value = '';
    this.activeUtilitySuggestionIndexes[field.id] = -1;
  }

  public handleUtilitySuggestionKeydown(event: KeyboardEvent, field: VisualField, input: HTMLInputElement, className: string): void {
    if (this.handleSuggestionButtonNavigation(event, 'utility', field, input)) return;

    const suggestions = this.utilityClassSuggestions(field, this.classInputValue(field));
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSuggestedUtilityClass(field, className, input);
      return;
    }

    if (this.handleUtilitySuggestionKeys(event, field, input, suggestions)) return;
  }

  public isActiveUtilitySuggestion(field: VisualField, index: number): boolean {
    return this.activeUtilitySuggestionIndexes[field.id] === index;
  }

  public classInputValue(field: VisualField): string {
    return this.classInputValues[field.id] || '';
  }

  public updateClassInput(field: VisualField, value: string): void {
    this.classInputValues[field.id] = value;
    this.activeUtilitySuggestionIndexes[field.id] = -1;
  }

  public utilityClassSuggestions(field: VisualField, value: string): string[] {
    const query = value.trim().toLowerCase();
    if (!query.startsWith('u-')) return [];

    const currentItems = new Set(this.listItems(field));
    return this.utilityClasses
      .filter((className) => !currentItems.has(className) && className.toLowerCase().startsWith(query))
      .slice(0, 10);
  }

  public firstUtilityClassSuggestion(field: VisualField, value: string): string {
    return this.utilityClassSuggestions(field, value)[0] || '';
  }

  public addSuggestedUtilityClass(field: VisualField, className: string, input: HTMLInputElement): void {
    this.addListItem(field, className);
    input.value = '';
    this.classInputValues[field.id] = '';
    this.activeUtilitySuggestionIndexes[field.id] = -1;
    input.focus();
  }

  public shouldShowUtilityHelp(field: VisualField): boolean {
    return this.classInputValue(field).trim().toLowerCase().startsWith('u-');
  }

  public utilityHelpText(field: VisualField): string {
    if (!this.shouldShowUtilityHelp(field)) return '';
    if (!this.utilityClasses.length) return 'Cargando utilities...';
    return this.utilityClassSuggestions(field, this.classInputValue(field)).length
      ? ''
      : 'Sin coincidencias en utilities.';
  }

  public removeListItem(field: VisualField, index: number): void {
    const items = this.listItems(field);
    items.splice(index, 1);
    this.updateVisualField(field, items.join(', '));
  }

  public propertyItems(field: VisualField): PropertyItem[] {
    const properties = this.propertiesObject(field);
    return Object.entries(properties).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '' : String(value)
    }));
  }

  public addProperty(field: VisualField, key: string, value: string): void {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;

    const properties = this.propertiesObject(field);
    properties[normalizedKey] = value;
    this.updatePropertiesField(field, properties);
    this.propertyKeyInputValues[field.id] = '';
  }

  public updatePropertyKey(field: VisualField, previousKey: string, nextKey: string): void {
    const normalizedKey = nextKey.trim();
    if (!normalizedKey || normalizedKey === previousKey) return;

    const properties = this.propertiesObject(field);
    const nextProperties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (key === previousKey) {
        nextProperties[normalizedKey] = value;
      } else if (key !== normalizedKey) {
        nextProperties[key] = value;
      }
    }

    this.updatePropertiesField(field, nextProperties);
  }

  public updatePropertyValue(field: VisualField, key: string, value: string): void {
    const properties = this.propertiesObject(field);
    properties[key] = value;
    this.updatePropertiesField(field, properties);
  }

  public removeProperty(field: VisualField, key: string): void {
    const properties = this.propertiesObject(field);
    delete properties[key];
    this.updatePropertiesField(field, properties);
  }

  public handlePropertyAddKeydown(event: KeyboardEvent, field: VisualField, keyInput: HTMLInputElement, valueInput: HTMLInputElement): void {
    const value = this.propertyKeyInputValue(field) || keyInput.value;
    const suggestions = this.customPropertySuggestions(field, value);
    const suggestion = this.firstCustomPropertySuggestion(field, this.propertyKeyInputValue(field) || keyInput.value);

    if (this.handlePropertySuggestionKeys(event, field, keyInput, valueInput, suggestions)) return;

    if (event.key === 'Tab' && suggestion) {
      event.preventDefault();
      this.updatePropertyKeyInput(field, suggestion);
      keyInput.value = suggestion;
      valueInput.focus();
      return;
    }

    if (event.key !== 'Enter') return;

    event.preventDefault();
    this.addPropertyFromInputs(field, keyInput, valueInput);
  }

  public addPropertyFromInputs(field: VisualField, keyInput: HTMLInputElement, valueInput: HTMLInputElement): void {
    const key = keyInput.value || this.propertyKeyInputValue(field);
    this.addProperty(field, key, valueInput.value);
    this.clearPropertyInputs(field, keyInput, valueInput);
  }

  public handlePropertySuggestionKeydown(
    event: KeyboardEvent,
    field: VisualField,
    property: string,
    keyInput: HTMLInputElement,
    valueInput: HTMLInputElement
  ): void {
    if (this.handleSuggestionButtonNavigation(event, 'property', field, keyInput)) return;

    const suggestions = this.customPropertySuggestions(field, this.propertyKeyInputValue(field));
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSuggestedCustomProperty(field, property, keyInput, valueInput);
      return;
    }

    if (this.handlePropertySuggestionKeys(event, field, keyInput, valueInput, suggestions)) return;
  }

  public isActivePropertySuggestion(field: VisualField, index: number): boolean {
    return this.activePropertySuggestionIndexes[field.id] === index;
  }

  public propertyKeyInputValue(field: VisualField): string {
    return this.propertyKeyInputValues[field.id] || '';
  }

  public updatePropertyKeyInput(field: VisualField, value: string): void {
    this.propertyKeyInputValues[field.id] = value;
    this.activePropertySuggestionIndexes[field.id] = -1;
  }

  public clearPropertyInputs(field: VisualField, keyInput: HTMLInputElement, valueInput: HTMLInputElement): void {
    this.propertyKeyInputValues[field.id] = '';
    this.activePropertySuggestionIndexes[field.id] = -1;
    keyInput.value = '';
    valueInput.value = '';
    keyInput.focus();
  }

  public customPropertySuggestions(field: VisualField, value: string): string[] {
    const query = value.trim().toLowerCase();
    const scope = this.customPropertyScope(field);
    if (!scope || !query.startsWith('--')) return [];

    const currentKeys = new Set(this.propertyItems(field).map((item) => item.key));
    return this.unitCustomProperties[scope]
      .filter((property) => property.toLowerCase().includes(query))
      .filter((property) => !currentKeys.has(property))
      .slice(0, 8);
  }

  public firstCustomPropertySuggestion(field: VisualField, value: string): string {
    return this.customPropertySuggestions(field, value)[0] || '';
  }

  public addSuggestedCustomProperty(field: VisualField, property: string, keyInput: HTMLInputElement, valueInput: HTMLInputElement): void {
    this.updatePropertyKeyInput(field, property);
    this.activePropertySuggestionIndexes[field.id] = -1;
    keyInput.value = property;
    valueInput.focus();
  }

  public customPropertyHelpText(field: VisualField): string {
    const value = this.propertyKeyInputValue(field);
    if (!value.trim().startsWith('--')) return '';
    if (!this.customPropertyScope(field)) return 'Este nodo no tiene variables de unidad.';
    return this.customPropertySuggestions(field, value).length
      ? 'Tab para completar la primera sugerencia.'
      : 'Sin coincidencias para este tipo.';
  }

  public customPropertyKeyPlaceholder(field: VisualField): string {
    const scope = this.customPropertyScope(field);
    if (!scope) return '--custom-property';

    const preferred = this.unitCustomProperties[scope].find((property) => property.includes('__height'))
      || this.unitCustomProperties[scope][0];
    if (preferred) return preferred;

    return {
      text: '--unit-text__font-size--title',
      card: '--unit-card__font-weight--title',
      banner: '--unit-banner__height'
    }[scope];
  }

  public customPropertyValuePlaceholder(field: VisualField): string {
    const property = (this.propertyKeyInputValue(field) || this.customPropertyKeyPlaceholder(field)).trim().toLowerCase();
    if (!property) return '';

    if (this.propertyNameIncludes(property, ['color', 'background', 'bg'])) return '#ffffff';
    if (this.propertyNameIncludes(property, ['opacity'])) return '0.8';
    if (this.propertyNameIncludes(property, ['font-weight', 'weight'])) return '600';
    if (this.propertyNameIncludes(property, ['z-index'])) return '2';
    if (this.propertyNameIncludes(property, ['gap', 'height', 'width', 'size', 'margin', 'padding', 'top', 'right', 'bottom', 'left', 'radius'])) return '24px';
    if (this.propertyNameIncludes(property, ['duration', 'delay'])) return '200ms';
    if (this.propertyNameIncludes(property, ['align', 'justify'])) return 'center';
    if (this.propertyNameIncludes(property, ['display'])) return 'flex';
    if (this.propertyNameIncludes(property, ['transform'])) return 'translateY(0)';

    return '';
  }

  private customPropertyScope(field: VisualField): 'text' | 'card' | 'banner' | '' {
    if (!field.path.slice(-2).every((part, index) => String(part) === ['config_extra', 'custom_properties'][index])) {
      return '';
    }

    const section = this.parseSectionJson();
    if (!section) return '';

    const node = this.asRecord(this.nodeAtPath(section, field.path.slice(0, -2)));
    const type = node['type'];
    return type === 'text' || type === 'card' || type === 'banner' ? type : '';
  }

  private propertyNameIncludes(property: string, tokens: string[]): boolean {
    return tokens.some((token) => property.includes(token));
  }

  private handleUtilitySuggestionKeys(
    event: KeyboardEvent,
    field: VisualField,
    input: HTMLInputElement,
    suggestions: string[]
  ): boolean {
    const fromInput = event.target === input;
    const handledKeys = fromInput
      ? ['ArrowDown', 'ArrowUp', 'Escape']
      : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
    if (!suggestions.length || !handledKeys.includes(event.key)) return false;

    event.preventDefault();

    if (event.key === 'Escape') {
      this.activeUtilitySuggestionIndexes[field.id] = -1;
      input.focus();
      return true;
    }

    const current = this.activeUtilitySuggestionIndexes[field.id] ?? -1;
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? suggestions.length - 1
        : current < 0
      ? (direction > 0 ? 0 : suggestions.length - 1)
      : (current + direction + suggestions.length) % suggestions.length;

    this.activeUtilitySuggestionIndexes[field.id] = next;
    this.focusSuggestion('utility', field.id, next);
    return true;
  }

  private handlePropertySuggestionKeys(
    event: KeyboardEvent,
    field: VisualField,
    keyInput: HTMLInputElement,
    valueInput: HTMLInputElement,
    suggestions: string[]
  ): boolean {
    const fromInput = event.target === keyInput || event.target === valueInput;
    const handledKeys = fromInput
      ? ['ArrowDown', 'ArrowUp', 'Escape']
      : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
    if (!suggestions.length || !handledKeys.includes(event.key)) return false;

    event.preventDefault();

    if (event.key === 'Escape') {
      this.activePropertySuggestionIndexes[field.id] = -1;
      keyInput.focus();
      return true;
    }

    const current = this.activePropertySuggestionIndexes[field.id] ?? -1;
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? suggestions.length - 1
        : current < 0
      ? (direction > 0 ? 0 : suggestions.length - 1)
      : (current + direction + suggestions.length) % suggestions.length;

    this.activePropertySuggestionIndexes[field.id] = next;
    this.focusSuggestion('property', field.id, next);
    return true;
  }

  private focusSuggestion(kind: 'utility' | 'property', fieldId: string, index: number): void {
    window.setTimeout(() => {
      const selector = `[data-suggestion-kind="${kind}"][data-field-id="${this.selectorValue(fieldId)}"][data-index="${index}"]`;
      const button = document.querySelector<HTMLButtonElement>(selector);
      button?.focus();
    });
  }

  private handleSuggestionButtonNavigation(
    event: KeyboardEvent,
    kind: 'utility' | 'property',
    field: VisualField,
    returnFocus: HTMLElement
  ): boolean {
    const handledKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
    if (!handledKeys.includes(event.key)) return false;

    event.preventDefault();

    if (event.key === 'Escape') {
      this.setActiveSuggestionIndex(kind, field.id, -1);
      returnFocus.focus();
      return true;
    }

    const currentButton = event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null;
    const list = currentButton?.closest('.section-editor__class-suggestions, .section-editor__property-suggestions');
    const buttons = Array.from(list?.querySelectorAll<HTMLButtonElement>('button') || []);
    if (!currentButton || !buttons.length) return true;

    const currentIndex = Math.max(0, buttons.indexOf(currentButton));
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + direction + buttons.length) % buttons.length;

    this.setActiveSuggestionIndex(kind, field.id, nextIndex);
    buttons[nextIndex]?.focus();
    return true;
  }

  private setActiveSuggestionIndex(kind: 'utility' | 'property', fieldId: string, index: number): void {
    if (kind === 'utility') {
      this.activeUtilitySuggestionIndexes[fieldId] = index;
      return;
    }

    this.activePropertySuggestionIndexes[fieldId] = index;
  }

  private selectorValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  public updateVisualField(field: VisualField, value: string): void {
    const section = this.parseSectionJson();
    if (!section) return;

    try {
      const nextValue = this.fieldValueFromInput(field, value);
      this.ensureEcomLinkRoot(section, field.path);
      this.setPathValue(section, field.path, nextValue);
      this.visualFormError = '';
      this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
    } catch (error) {
      this.visualFormError = error instanceof Error ? error.message : 'Valor inválido';
    }
  }

  public updateLocalizedField(field: VisualField, locale: VisualLocaleField, value: string): void {
    if (this.isDefaultLocaleLocked(field, locale)) return;

    const section = this.parseSectionJson();
    if (!section) return;

    try {
      const shouldRemoveLocale = this.canManageLocales(field) && locale.key !== 'default' && value.trim() === '';
      if (shouldRemoveLocale) {
        this.deletePathValue(section, locale.path);
      } else {
        this.setPathValue(section, locale.path, value);
      }

      const defaultEntry = this.defaultLocale(field);
      if (locale.key !== 'default' && defaultEntry && this.isDefaultLocaleLocked(field, defaultEntry)) {
        this.setPathValue(section, defaultEntry.path, null);
        defaultEntry.value = '';
        field.value = '';
      }
      this.visualFormError = '';
      this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
      field.value = locale.key === 'default' ? value : field.value;
      locale.value = value;
    } catch (error) {
      this.visualFormError = error instanceof Error ? error.message : 'Valor inválido';
    }
  }

  public toggleLanguageField(field: VisualField): void {
    const isOpen = this.isLanguageFieldOpen(field);
    this.expandedLanguageFields[field.id] = !isOpen;

    if (!isOpen && !this.activeLanguageTabs[field.id]) {
      this.activeLanguageTabs[field.id] = this.nonDefaultLocales(field)[0]?.key || '';
    }
  }

  public isLanguageFieldOpen(field: VisualField): boolean {
    return Boolean(this.expandedLanguageFields[field.id]);
  }

  public defaultLocale(field: VisualField): VisualLocaleField | undefined {
    return field.locales?.find((locale) => locale.key === 'default') || field.locales?.[0];
  }

  public nonDefaultLocales(field: VisualField): VisualLocaleField[] {
    return field.locales?.filter((locale) => locale.key !== 'default') || [];
  }

  public activeLanguageEntry(field: VisualField): VisualLocaleField | undefined {
    const locales = this.nonDefaultLocales(field);
    if (!locales.length) return undefined;

    const activeKey = this.activeLanguageTabs[field.id] || locales[0].key;
    return locales.find((locale) => locale.key === activeKey) || locales[0];
  }

  public setActiveLanguageTab(field: VisualField, locale: VisualLocaleField): void {
    this.activeLanguageTabs[field.id] = locale.key;
  }

  public canManageLocales(field: VisualField): boolean {
    return this.isEcomLinkLocalizablePath(field.path);
  }

  public availableLocaleKeys(field: VisualField): string[] {
    const used = new Set((field.locales || []).map((locale) => locale.key));
    return this.supportedLocaleKeys().filter((key) => !used.has(key));
  }

  public addLocaleToField(field: VisualField, localeKey: string): void {
    if (!this.canManageLocales(field) || !this.isLocaleKey(localeKey)) return;

    const section = this.parseSectionJson();
    if (!section) return;

    const defaultValue = this.defaultLocale(field)?.value || '';
    this.setPathValue(section, [...field.path, localeKey], defaultValue);
    this.activeLanguageTabs[field.id] = localeKey;
    this.expandedLanguageFields[field.id] = true;
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  public removeLocaleFromField(field: VisualField, locale: VisualLocaleField): void {
    if (!this.canManageLocales(field) || locale.key === 'default') return;

    const section = this.parseSectionJson();
    if (!section) return;

    this.deletePathValue(section, locale.path);
    const nextLocale = this.nonDefaultLocales(field).find((item) => item.key !== locale.key);
    this.activeLanguageTabs[field.id] = nextLocale?.key || '';
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  public localeSummary(field: VisualField): string {
    const locales = this.nonDefaultLocales(field);
    if (!locales.length) return 'Sin idiomas';
    const filled = locales.filter((locale) => this.hasLocaleValue(locale)).length;
    return `${filled}/${locales.length} completos`;
  }

  public sourceLocale(field: VisualField): VisualLocaleField | undefined {
    const locales = field.locales || [];
    return locales.find((locale) => locale.key === 'es-ES' && this.hasLocaleValue(locale))
      || locales.find((locale) => locale.key !== 'default' && this.hasLocaleValue(locale))
      || locales.find((locale) => locale.key === 'default' && this.hasLocaleValue(locale));
  }

  public canCopyToEmptyLocales(field: VisualField): boolean {
    const source = this.sourceLocale(field);
    return Boolean(source && this.nonDefaultLocales(field).some((locale) => locale.key !== source.key && !this.hasLocaleValue(locale)));
  }

  public copySourceToEmptyLocales(field: VisualField): void {
    const source = this.sourceLocale(field);
    if (!source) return;

    const section = this.parseSectionJson();
    if (!section) return;

    for (const locale of this.nonDefaultLocales(field)) {
      if (locale.key !== source.key && !this.hasLocaleValue(locale)) {
        this.setPathValue(section, locale.path, source.value);
      }
    }

    const defaultEntry = this.defaultLocale(field);
    if (defaultEntry && this.isDefaultLocaleLocked(field, defaultEntry)) {
      this.setPathValue(section, defaultEntry.path, null);
    }

    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  public clearLanguageLocale(field: VisualField, locale: VisualLocaleField): void {
    const section = this.parseSectionJson();
    if (!section) return;

    if (this.canManageLocales(field) && locale.key !== 'default') {
      this.deletePathValue(section, locale.path);
    } else {
      this.setPathValue(section, locale.path, '');
    }

    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  public hasLocaleValue(locale: VisualLocaleField): boolean {
    return locale.value.trim().length > 0;
  }

  public isDefaultLocaleLocked(field: VisualField, locale: VisualLocaleField): boolean {
    if (this.canManageLocales(field)) return false;
    return locale.key === 'default' && this.nonDefaultLocales(field).length > 0;
  }

  public localeDisplayValue(field: VisualField, locale: VisualLocaleField): string {
    return this.isDefaultLocaleLocked(field, locale) ? '' : locale.value;
  }

  public trackByGroup(_: number, group: VisualGroup): string {
    return group.id;
  }

  public trackByField(_: number, field: VisualField): string {
    return field.id;
  }

  public trackByProperty(_: number, property: PropertyItem): string {
    return property.key;
  }

  public trackByBreadcrumb(_: number, item: NodeBreadcrumbItem): string {
    return `${item.label}:${item.value}`;
  }

  private nodeId(value: unknown): string {
    const config = this.asRecord(this.asRecord(value)['config_extra']);
    const properties = this.asRecord(config['custom_properties']);
    const id = properties['id'];
    return typeof id === 'string' ? id : '';
  }

  private setNodeId(target: unknown, path: JsonPathSegment[], id: string): void {
    const node = this.nodeAtPath(target, path);
    const record = this.asRecord(node);
    if (!Object.keys(record).length) return;

    if (!record['config_extra'] || typeof record['config_extra'] !== 'object' || Array.isArray(record['config_extra'])) {
      record['config_extra'] = {};
    }

    const config = record['config_extra'] as Record<string, unknown>;
    if (!config['custom_properties'] || typeof config['custom_properties'] !== 'object' || Array.isArray(config['custom_properties'])) {
      config['custom_properties'] = {};
    }

    const properties = config['custom_properties'] as Record<string, unknown>;
    if (id) {
      properties['id'] = id;
    } else {
      delete properties['id'];
    }
  }

  private suggestSectionIdBase(section: unknown): string {
    const record = this.asRecord(section);
    return this.sectionPattern(record);
  }

  private sectionPattern(record: Record<string, unknown>): string {
    const units = this.sectionUnits(record);
    const component = this.slugify(this.valueLabel(record['component']).replace(/Group$/, '')) || 'section';
    const dominantType = this.dominantUnitType(units) || component;
    const hasText = units.some((unit) => Boolean(this.nodeTextSeed(unit)));
    const hasImage = units.some((unit) => Boolean(this.firstResponsiveUrl(unit['image_responsive'], 'image') || this.firstResponsiveUrl(unit['poster_responsive'], 'poster')));
    const hasVideo = units.some((unit) => Boolean(this.firstResponsiveUrl(unit['video_responsive'], 'video')));
    const direction = this.responsiveValue(record['direction']) || this.responsiveValue(units[0]?.['direction']);
    const flexDirection = String(this.asRecord(this.asRecord(record['config_extra'])['custom_properties'])['flex-direction'] || '').toLowerCase();
    const isRow = direction.toLowerCase().includes('row') || flexDirection.includes('row');
    const isFull = record['fullWidth'] === true || units.some((unit) => unit['fullWidth'] === true);
    const textOnlyCount = units.filter((unit) => Boolean(this.nodeTextSeed(unit)) && !this.firstResponsiveUrl(unit['image_responsive'], 'image') && !this.firstResponsiveUrl(unit['poster_responsive'], 'poster') && !this.firstResponsiveUrl(unit['video_responsive'], 'video')).length;
    const imageCount = units.filter((unit) => Boolean(this.firstResponsiveUrl(unit['image_responsive'], 'image') || this.firstResponsiveUrl(unit['poster_responsive'], 'poster'))).length;
    const videoCount = units.filter((unit) => Boolean(this.firstResponsiveUrl(unit['video_responsive'], 'video'))).length;
    const cardCount = units.filter((unit) => this.slugify(this.valueLabel(unit['type'])) === 'card').length;
    const bannerCount = units.filter((unit) => this.slugify(this.valueLabel(unit['type'])) === 'banner').length;

    if (component === 'slider') return 'slider-media-cards';
    if (hasVideo && (isFull || units.length === 1)) return 'video-full';
    if (component === 'text') return units.length > 1 ? 'text-two-columns' : 'text-intro-editorial';
    if (textOnlyCount && imageCount === 2 && units.length <= 3) return 'text-two-images';
    if (textOnlyCount && imageCount === 1 && units.length === 2) return 'image-text-half';
    if (textOnlyCount && imageCount >= 2 && units.length >= 3) return component === 'banner' ? 'banner-split-text' : 'image-collage-text';
    if (videoCount && imageCount) return 'media-collage-text';
    if (cardCount >= 4 && imageCount >= 4) return 'image-grid-numbered-text';
    if (cardCount === 3 && imageCount >= 3) return 'card-image-text';
    if (cardCount === 2 && imageCount >= 2) return 'image-pair-labels';
    if (bannerCount === 1 && imageCount === 1 && units.length === 1) return 'image-split-two';
    if (cardCount && bannerCount && imageCount >= 2) return 'image-product-card';

    if (units.length > 1) {
      if (dominantType === 'card') return imageCount >= 2 ? 'image-pair' : 'cards';
      if (dominantType === 'banner') return imageCount >= 2 ? 'banner-split-text' : 'banners';
      if (dominantType === 'text') return 'text-blocks';
      return `${dominantType}-group`;
    }

    if (hasImage && hasText) return isRow ? 'split-text' : 'image-text';
    if (hasImage) return `${dominantType}-image`;
    if (hasText) return `${dominantType}-text`;
    return `${component}-section`;
  }

  private sectionUnits(record: Record<string, unknown>): Record<string, unknown>[] {
    const banners = record['banners'];
    if (Array.isArray(banners) && banners.length) {
      return banners.map((item) => this.asRecord(item)).filter((item) => Object.keys(item).length);
    }

    return [record];
  }

  private dominantUnitType(units: Record<string, unknown>[]): string {
    const counts = new Map<string, number>();
    for (const unit of units) {
      const type = this.slugify(this.valueLabel(unit['type']).replace(/Group$/, ''));
      if (!type || type === 'section') continue;
      counts.set(type, (counts.get(type) || 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
  }

  private sectionTextSeed(record: Record<string, unknown>): string {
    const ownText = this.nodeTextSeed(record);
    if (ownText) return ownText;

    return this.sectionUnits(record)
      .map((unit) => this.nodeTextSeed(unit))
      .find(Boolean) || '';
  }

  private sectionEcomSeed(record: Record<string, unknown>): string {
    return this.sectionUnits(record)
      .map((unit) => this.extractPlainText(this.asRecord(unit['ecom_link'])['identifier']))
      .find(Boolean) || '';
  }

  private sectionMediaSeed(record: Record<string, unknown>): string {
    const url = this.sectionUnits(record)
      .map((unit) => this.firstResponsiveUrl(unit['video_responsive'], 'video')
        || this.firstResponsiveUrl(unit['image_responsive'], 'image')
        || this.firstResponsiveUrl(unit['poster_responsive'], 'poster'))
      .find(Boolean) || '';

    return this.mediaNameFromUrl(url);
  }

  private mediaNameFromUrl(url: string): string {
    const clean = decodeURIComponent(url.split('?')[0] || '');
    const file = clean.split('/').pop() || '';
    return file.replace(/\.[a-z0-9]+$/i, '').replace(/(^|[_-])(sm|md|lg|xs|xl|desktop|mobile)([_-]|$)/gi, '-');
  }

  private nodeTextSeed(record: Record<string, unknown>): string {
    for (const key of ['label', 'title', 'subtitle', 'description', 'cta']) {
      const text = this.extractPlainText(record[key]);
      if (text) return text;
    }

    return '';
  }

  private compactTextSlug(value: string): string {
    const ignoredWords = ['the', 'and', 'for', 'with', 'para', 'por', 'con', 'los', 'las', 'una', 'uno', 'nuevo', 'nueva'];
    const words = this.slugify(value)
      .split('-')
      .filter((word) => word.length > 1 && !ignoredWords.includes(word));

    return words.slice(0, 4).join('-');
  }

  private responsiveValue(value: unknown): string {
    if (typeof value === 'string') return value;
    const record = this.asRecord(value);
    return String(record['sm'] || record['default'] || record['md'] || record['lg'] || '');
  }

  private responsiveFieldBreakpointLabel(field: VisualField): string {
    const root = String(field.path[field.path.length - 2] || '');
    const breakpoint = String(field.path[field.path.length - 1] || '');
    if (!['direction', 'columns', 'horizontal', 'vertical', 'packing'].includes(root)) return '';

    const labels: Record<string, string> = {
      sm: 'Mobile',
      md: 'Tablet',
      lg: 'Desktop'
    };

    return labels[breakpoint] || '';
  }

  private responsiveRootRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }

    return value === undefined || value === null ? {} : { sm: value };
  }

  private defaultResponsiveBreakpointValue(
    root: ResponsiveRootKey,
    current: Record<string, unknown>,
    breakpoint: ResponsiveBreakpoint
  ): string | number {
    const fallback = breakpoint === 'lg'
      ? current['md'] ?? current['sm'] ?? current['default']
      : current['sm'] ?? current['default'];

    if (root === 'columns') {
      const numeric = Number(fallback);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
    }

    if (root === 'horizontal') return typeof fallback === 'string' && fallback ? fallback : 'left';
    if (root === 'vertical') return typeof fallback === 'string' && fallback ? fallback : 'top';
    if (root === 'packing') return typeof fallback === 'string' && fallback ? fallback : 'spaced';

    return typeof fallback === 'string' && fallback ? fallback : 'column';
  }

  private breakpointLabel(breakpoint: ResponsiveBreakpoint | string): string {
    const labels: Record<string, string> = {
      sm: 'Mobile',
      md: 'Tablet',
      lg: 'Desktop',
      xl: 'Desktop XL'
    };

    return labels[breakpoint] || String(breakpoint);
  }

  private uniqueNodeId(section: unknown, baseId: string, currentId = ''): string {
    const base = this.slugify(baseId) || 'section';
    const existingIds = [...new Set([...this.landingSectionIds, ...this.collectNodeIds(section)])].filter((id) => id !== currentId);
    if (!existingIds.includes(base)) return base;

    let index = 2;
    let candidate = `${base}-${index}`;
    while (existingIds.includes(candidate)) {
      index += 1;
      candidate = `${base}-${index}`;
    }
    return candidate;
  }

  private collectNodeIds(value: unknown, output: string[] = []): string[] {
    const id = this.nodeId(value);
    if (id) output.push(id);

    if (Array.isArray(value)) {
      value.forEach((item) => this.collectNodeIds(item, output));
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach((item) => this.collectNodeIds(item, output));
    }

    return output;
  }

  private slugify(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private bannerIndexFromPath(path: JsonPathSegment[]): number | undefined {
    const last = path[path.length - 1];
    return path.includes('banners') && typeof last === 'number' ? last : undefined;
  }

  private bannerSiblingsForGroup(group: VisualGroup): unknown[] {
    const section = this.parseSectionJson();
    if (!section || group.bannerIndex === undefined) return [];

    const siblings = this.nodeAtPath(section, group.path.slice(0, -1));
    return Array.isArray(siblings) ? siblings : [];
  }

  private areSiblingBanners(left: VisualGroup, right: VisualGroup): boolean {
    if (!this.isBannerGroup(left) || !this.isBannerGroup(right)) return false;
    return this.pathId(left.path.slice(0, -1)) === this.pathId(right.path.slice(0, -1));
  }

  private moveBannerByGroup(group: VisualGroup, toIndex: number): void {
    const section = this.parseSectionJson();
    if (!section || group.bannerIndex === undefined) return;

    const parentPath = group.path.slice(0, -1);
    const siblings = this.nodeAtPath(section, parentPath);
    if (!Array.isArray(siblings)) return;

    const fromIndex = group.bannerIndex;
    if (toIndex < 0 || toIndex >= siblings.length || toIndex === fromIndex) return;

    const [banner] = siblings.splice(fromIndex, 1);
    siblings.splice(toIndex, 0, banner);

    this.activeVisualGroupId = this.pathId([...parentPath, toIndex]);
    this.pendingDeleteBannerId = '';
    this.newBannerMenuOpen = false;
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  private duplicateBannerByGroup(group: VisualGroup): void {
    const section = this.parseSectionJson();
    if (!section || group.bannerIndex === undefined) return;

    const parentPath = group.path.slice(0, -1);
    const siblings = this.nodeAtPath(section, parentPath);
    if (!Array.isArray(siblings)) return;

    const clone = this.clone(siblings[group.bannerIndex]);
    this.ensureUniqueBannerId(clone, siblings);

    const targetIndex = group.bannerIndex + 1;
    siblings.splice(targetIndex, 0, clone);

    this.activeVisualGroupId = this.pathId([...parentPath, targetIndex]);
    this.pendingDeleteBannerId = '';
    this.newBannerMenuOpen = false;
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  private createBannerByGroup(group: VisualGroup, type: BannerUnitType): void {
    const section = this.parseSectionJson();
    if (!section || group.bannerIndex === undefined) return;

    const parentPath = group.path.slice(0, -1);
    const siblings = this.nodeAtPath(section, parentPath);
    if (!Array.isArray(siblings)) return;

    const targetIndex = group.bannerIndex + 1;
    siblings.splice(targetIndex, 0, this.blankBannerUnit(type));

    this.activeVisualGroupId = this.pathId([...parentPath, targetIndex]);
    this.pendingDeleteBannerId = '';
    this.newBannerMenuOpen = false;
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  private deleteBannerByGroup(group: VisualGroup): void {
    const section = this.parseSectionJson();
    if (!section || group.bannerIndex === undefined) return;

    const parentPath = group.path.slice(0, -1);
    const siblings = this.nodeAtPath(section, parentPath);
    if (!Array.isArray(siblings)) return;

    siblings.splice(group.bannerIndex, 1);

    if (siblings.length) {
      const targetIndex = Math.min(group.bannerIndex, siblings.length - 1);
      this.activeVisualGroupId = this.pathId([...parentPath, targetIndex]);
    } else {
      const ownerPath = parentPath.slice(0, -1);
      this.activeVisualGroupId = this.pathId(ownerPath) || 'section';
    }

    this.pendingDeleteBannerId = '';
    this.newBannerMenuOpen = false;
    this.visualFormError = '';
    this.selectedSectionJsonChange.emit(JSON.stringify(section, null, 2));
  }

  private blankBannerUnit(type: BannerUnitType): Record<string, unknown> {
    const base = {
      fullWidth: false,
      subtitle: null,
      description: null,
      cta: null,
      direction: {
        sm: 'column'
      },
      config_extra: {
        custom_properties: {},
        lazy: true,
        custom_classes: []
      },
      config_alignment: {
        horizontal: {
          sm: 'center'
        }
      },
      video_responsive: null
    };

    if (type === 'text') {
      return {
        ...base,
        type: 'text',
        title: {
          default: 'Nuevo texto'
        },
        ecom_link: null,
        image_responsive: null
      };
    }

    return {
      ...base,
      type,
      title: {
        default: type === 'card' ? 'Nueva card' : 'Nuevo banner'
      },
      label: type === 'card' ? null : undefined,
      ecom_link: {
        type: {
          default: ''
        },
        identifier: {
          default: ''
        },
        url: 'null',
        anchor: null,
        obfuscated: false,
        custom_class: null,
        config_extra: {}
      },
      image_responsive: {
        default: {
          image_sm: '',
          image_md: '',
          image_lg: ''
        }
      }
    };
  }

  private ensureUniqueBannerId(banner: unknown, siblings: unknown[]): void {
    const bannerRecord = this.asRecord(banner);
    const config = this.asRecord(bannerRecord['config_extra']);
    const properties = this.asRecord(config['custom_properties']);
    const id = properties['id'];
    if (typeof id !== 'string' || !id.trim()) return;

    const siblingIds = new Set(
      siblings
        .map((item) => this.asRecord(this.asRecord(this.asRecord(item)['config_extra'])['custom_properties'])['id'])
        .filter((value): value is string => typeof value === 'string')
    );

    const baseId = `${id}-copy`;
    let nextId = baseId;
    let index = 2;
    while (siblingIds.has(nextId)) {
      nextId = `${baseId}-${index}`;
      index += 1;
    }

    if (!bannerRecord['config_extra'] || typeof bannerRecord['config_extra'] !== 'object' || Array.isArray(bannerRecord['config_extra'])) {
      bannerRecord['config_extra'] = {};
    }

    const nextConfig = bannerRecord['config_extra'] as Record<string, unknown>;
    if (!nextConfig['custom_properties'] || typeof nextConfig['custom_properties'] !== 'object' || Array.isArray(nextConfig['custom_properties'])) {
      nextConfig['custom_properties'] = {};
    }

    (nextConfig['custom_properties'] as Record<string, unknown>)['id'] = nextId;
  }

  private nodeAtPath(target: unknown, path: JsonPathSegment[]): unknown {
    return path.reduce<unknown>((cursor, key) => {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') return undefined;
      return (cursor as Record<string, unknown> | unknown[])[key as never];
    }, target);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private collectGroups(value: unknown, path: JsonPathSegment[], label: string, groups: VisualGroup[]): void {
    const record = this.asRecord(value);
    if (!Object.keys(record).length) return;

    const component = this.valueLabel(record['component'] || record['type'] || label);
    const fields: VisualField[] = [];

    for (const key of this.editableRootKeys()) {
      if (key === 'ecom_link') {
        if (key in record || this.canHaveEcomLink(record)) {
          this.collectEditableFields(
            record[key] ?? this.emptyEcomLink(),
            [...path, key],
            this.humanize(key),
            fields,
            key
          );
        }
        continue;
      }

      if ((key === 'config_alignment' || key === 'config_aligment') && !this.isBannerChildPath(path)) {
        continue;
      }

      if (key in record && record[key] !== null && record[key] !== undefined) {
        const value = key === 'config_alignment' || key === 'config_aligment'
          ? this.visibleAlignmentValue(record, record[key])
          : record[key];

        this.collectEditableFields(value, [...path, key], this.humanize(key), fields, key);
      }
    }

    const config = this.asRecord(record['config_extra']);
    if (Object.keys(config).length) {
      if ('custom_properties' in config) {
        this.addJsonField(
          fields,
          [...path, 'config_extra', 'custom_properties'],
          'Custom properties',
          config['custom_properties'] || {}
        );
      }

      if ('custom_classes' in config) {
        this.addListField(
          fields,
          [...path, 'config_extra', 'custom_classes'],
          'Custom classes',
          config['custom_classes']
        );
      }
    }

    groups.push({
      id: this.pathId(path) || 'section',
      path,
      bannerIndex: this.bannerIndexFromPath(path),
      title: `${label} - ${component}`,
      subtitle: path.length ? this.pathId(path) : 'Raíz de la sección',
      selectorLabel: label,
      component,
      summary: this.nodeSummary(record),
      ...this.nodeMedia(record),
      hasChildren: Array.isArray(record['banners']) && record['banners'].length > 0,
      fields
    });

    const banners = record['banners'];
    if (Array.isArray(banners)) {
      banners.forEach((banner, index) => {
        this.collectGroups(banner, [...path, 'banners', index], `Banner ${index + 1}`, groups);
      });
    }
  }

  private collectEditableFields(
    value: unknown,
    path: JsonPathSegment[],
    label: string,
    fields: VisualField[],
    rootKey: string
  ): void {
    if (value === null || value === undefined) return;

    const lastPathPart = path[path.length - 1];
    if (lastPathPart === 'custom_properties') {
      this.addJsonField(fields, path, label, value);
      return;
    }

    if (lastPathPart === 'custom_classes') {
      this.addListField(fields, path, label, value);
      return;
    }

    if (typeof value === 'object' && this.isLocalizableField(rootKey, path) && this.isLocalizedTextObject(value)) {
      this.addLocalizedField(fields, path, label, value, this.localizedFieldRootKey(rootKey, path));
      const htmlTagField = this.textHtmlTagField(path, label, value, rootKey);
      if (htmlTagField) {
        fields[fields.length - 1].htmlTagField = htmlTagField;
      }

      Object.entries(this.asRecord(value)).forEach(([key, item]) => {
        if (item === null || item === undefined || key === 'default' || this.isLocaleKey(key)) return;
        this.collectEditableFields(item, [...path, key], `${label} - ${this.humanize(key)}`, fields, rootKey);
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.collectEditableFields(item, [...path, index], `${label} ${index + 1}`, fields, rootKey);
      });
      return;
    }

    if (typeof value === 'object') {
      this.orderedObjectEntries(this.asRecord(value), rootKey).forEach(([key, item]) => {
        if (item === null || item === undefined) return;
        const childLabel = key === 'default' || this.isLocaleKey(key)
          ? `${label} - ${key}`
          : `${label} - ${this.humanize(key)}`;

        if (key === 'custom_properties') {
          this.addJsonField(fields, [...path, key], childLabel, item);
          return;
        }

        if (key === 'custom_classes') {
          this.addListField(fields, [...path, key], childLabel, item);
          return;
        }

        if (key === 'html_tag' && this.isHtmlTagPath([...path, key])) {
          return;
        }

        this.collectEditableFields(item, [...path, key], childLabel, fields, rootKey);
      });
      return;
    }

    fields.push({
      id: this.pathId(path),
      label,
      path,
      pathLabel: this.pathLabel(path),
      value: String(value),
      kind: this.fieldKind(path, value),
      multiline: this.shouldUseMultilineField(rootKey, path, String(value)),
      category: this.fieldCategory(rootKey, path),
      hint: this.fieldHint(rootKey, path),
      options: this.fieldOptions(path)
    });
  }

  private orderedObjectEntries(record: Record<string, unknown>, rootKey: string): [string, unknown][] {
    const entries = Object.entries(record);
    if (rootKey === 'config_alignment' || rootKey === 'config_aligment') {
      const order: Record<string, number> = { horizontal: 0, vertical: 1, packing: 2 };
      return entries.sort(([left], [right]) => (order[left] ?? 99) - (order[right] ?? 99));
    }

    if (!['direction', 'columns', 'horizontal', 'vertical', 'packing'].includes(rootKey)) return entries;

    const order: Record<string, number> = { sm: 0, md: 1, lg: 2 };
    return entries.sort(([left], [right]) => (order[left] ?? 99) - (order[right] ?? 99));
  }

  private addLocalizedField(
    fields: VisualField[],
    path: JsonPathSegment[],
    label: string,
    value: unknown,
    rootKey: string
  ): void {
    const record = this.asRecord(value);
    const localeKeys = Object.keys(record)
      .filter((key) => key === 'default' || this.isLocaleKey(key))
      .sort((left, right) => this.compareLocaleKeys(left, right));

    if (!localeKeys.includes('default')) {
      localeKeys.unshift('default');
    }

    const locales = localeKeys.map((key) => {
      const localeValue = record[key];
      const stringValue = localeValue === null || localeValue === undefined ? '' : String(localeValue);

      return {
        key,
        label: key === 'default' ? this.defaultLocaleLabel(rootKey) : this.localeLabel(key),
        path: [...path, key],
        value: stringValue,
        multiline: rootKey === 'description' || stringValue.length > 90,
        options: this.fieldOptions([...path, key])
      };
    });

    const defaultValue = locales.find((locale) => locale.key === 'default')?.value || '';

    fields.push({
      id: this.pathId(path),
      label,
      path,
      pathLabel: this.pathLabel(path),
      value: defaultValue,
      kind: 'localized',
      multiline: rootKey === 'description' || defaultValue.length > 90,
      category: this.fieldCategory(rootKey, path),
      hint: this.fieldHint(rootKey, path),
      options: this.fieldOptions([...path, 'default']),
      locales
    });
  }

  private shouldUseMultilineField(rootKey: string, path: JsonPathSegment[], value: string): boolean {
    if (rootKey === 'description') return true;
    if (this.isUrlPath(path)) return false;

    const pathText = path.map((part) => String(part)).join('.');
    if (pathText.includes('image_responsive') || pathText.includes('video_responsive') || pathText.includes('poster_responsive')) {
      return false;
    }

    return value.length > 90;
  }

  private isUrlPath(path: JsonPathSegment[]): boolean {
    return path.some((part) => ['url', 'image_sm', 'image_md', 'image_lg', 'video_sm', 'video_md', 'video_lg', 'poster_sm', 'poster_md', 'poster_lg'].includes(String(part)));
  }

  private addJsonField(fields: VisualField[], path: JsonPathSegment[], label: string, value: unknown): void {
    const isCustomProperties = path.map((part) => String(part)).includes('custom_properties');

    fields.push({
      id: this.pathId(path),
      label,
      path,
      pathLabel: this.pathLabel(path),
      value: JSON.stringify(value || {}, null, 2),
      kind: isCustomProperties ? 'properties' : 'json',
      multiline: true,
      category: this.fieldCategory(String(path[0] || ''), path),
      hint: this.fieldHint(String(path[0] || ''), path)
    });
  }

  private addListField(fields: VisualField[], path: JsonPathSegment[], label: string, value: unknown): void {
    const classes = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : typeof value === 'string'
        ? value.split(/\s+/).filter(Boolean)
        : [];

    fields.push({
      id: this.pathId(path),
      label,
      path,
      pathLabel: this.pathLabel(path),
      value: classes.join(', '),
      kind: 'list',
      multiline: classes.length > 4,
      category: 'advanced',
      hint: 'Separadas por coma o salto de linea'
    });
  }

  private textHtmlTagField(
    path: JsonPathSegment[],
    label: string,
    value: unknown,
    rootKey: string
  ): VisualField | undefined {
    if (!['title', 'subtitle', 'description'].includes(rootKey)) return undefined;

    const config = this.asRecord(this.asRecord(value)['config_extra']);
    const configuredTag = this.htmlTagValue(config['html_tag']);
    const fallbackTag = this.defaultHtmlTag(rootKey);

    return {
      id: this.pathId([...path, 'config_extra', 'html_tag']),
      label: 'Etiqueta HTML',
      path: [...path, 'config_extra', 'html_tag'],
      pathLabel: this.pathLabel([...path, 'config_extra', 'html_tag']),
      value: configuredTag || fallbackTag,
      kind: 'select',
      multiline: false,
      category: 'text',
      hint: `${label}. Por defecto: ${fallbackTag}`,
      options: this.htmlTagOptions()
    };
  }

  private fieldValueFromInput(field: VisualField, value: string): unknown {
    if (field.kind === 'json' || field.kind === 'properties') {
      return value.trim() ? JSON.parse(value) : {};
    }

    if (field.kind === 'list') {
      return value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (field.kind === 'number') {
      if (!/^\d+$/.test(value.trim())) throw new Error(`${field.label} debe contener solo numeros`);
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) throw new Error(`${field.label} debe ser numerico`);
      return numericValue;
    }

    if (field.kind === 'boolean') {
      return value === 'true';
    }

    return value;
  }

  private propertiesObject(field: VisualField): Record<string, unknown> {
    try {
      const value = JSON.parse(field.value || '{}');
      return value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value as Record<string, unknown> }
        : {};
    } catch {
      return {};
    }
  }

  private updatePropertiesField(field: VisualField, properties: Record<string, unknown>): void {
    this.updateVisualField(field, JSON.stringify(properties, null, 2));
  }

  private fieldKind(path: JsonPathSegment[], value: unknown): VisualFieldKind {
    if (this.isHtmlTagPath(path)) return 'select';
    if (this.isEcomLinkTypeDefault(path)) return 'select';
    if (this.fieldOptions(path)?.length) return 'select';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  private isEcomLinkTypeDefault(path: JsonPathSegment[]): boolean {
    const parts = path.map((part) => String(part));
    const index = parts.lastIndexOf('ecom_link');

    return index >= 0 && parts[index + 1] === 'type' && (parts[index + 2] === 'default' || this.isLocaleKey(parts[index + 2] || ''));
  }

  private fieldOptions(path: JsonPathSegment[]): string[] | undefined {
    if (this.isHtmlTagPath(path)) return this.htmlTagOptions();
    if (this.isEcomLinkTypeDefault(path)) return ['category', 'product'];

    const root = String(path[path.length - 2] || '');
    if (root === 'horizontal') return ['left', 'center', 'right'];
    if (root === 'vertical') return ['top', 'middle', 'bottom'];
    if (root === 'packing') return ['spaced', 'half'];

    return undefined;
  }

  private isHtmlTagPath(path: JsonPathSegment[]): boolean {
    return path.slice(-2).map((part) => String(part)).join('.') === 'config_extra.html_tag';
  }

  private htmlTagOptions(): string[] {
    return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'strong'];
  }

  private defaultHtmlTag(rootKey: string): string {
    if (rootKey === 'title') return 'h2';
    if (rootKey === 'subtitle') return 'h3';
    if (rootKey === 'description') return 'p';
    return 'div';
  }

  private htmlTagValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return this.htmlTagValue(value[0]);
    return '';
  }

  private setPathValue(target: unknown, path: JsonPathSegment[], value: unknown): void {
    let cursor = target as Record<string, unknown> | unknown[];

    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      const nextKey = path[index + 1];
      const container = cursor as Record<string, unknown> | unknown[];
      const nextValue = container[key as never];

      if (!nextValue || typeof nextValue !== 'object') {
        container[key as never] = (typeof nextKey === 'number' ? [] : {}) as never;
      }

      cursor = container[key as never] as Record<string, unknown> | unknown[];
    }

    (cursor as Record<string, unknown> | unknown[])[path[path.length - 1] as never] = value as never;
  }

  private deletePathValue(target: unknown, path: JsonPathSegment[]): void {
    if (!path.length) return;

    let cursor = target as Record<string, unknown> | unknown[];

    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      const next = (cursor as Record<string, unknown> | unknown[])[key as never];
      if (!next || typeof next !== 'object') return;
      cursor = next as Record<string, unknown> | unknown[];
    }

    const key = path[path.length - 1];
    if (Array.isArray(cursor) && typeof key === 'number') {
      cursor.splice(key, 1);
      return;
    }

    delete (cursor as Record<string, unknown>)[String(key)];
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  private updateJsonTextarea(textarea: HTMLTextAreaElement, value: string, selectionStart: number, selectionEnd: number): void {
    textarea.value = value;
    this.selectedSectionJsonChange.emit(value);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  private ensureEcomLinkRoot(target: unknown, path: JsonPathSegment[]): void {
    const ecomIndex = path.indexOf('ecom_link');
    if (ecomIndex < 0) return;

    let parent = target as Record<string, unknown> | unknown[];
    for (let index = 0; index < ecomIndex; index += 1) {
      parent = parent[path[index] as never] as Record<string, unknown> | unknown[];
    }

    const parentRecord = parent as Record<string, unknown>;
    const current = this.asRecord(parentRecord['ecom_link']);
    const defaults = this.emptyEcomLink();
    parentRecord['ecom_link'] = {
      ...defaults,
      ...current,
      type: Object.keys(this.asRecord(current['type'])).length ? current['type'] : defaults['type'],
      identifier: Object.keys(this.asRecord(current['identifier'])).length ? current['identifier'] : defaults['identifier']
    };
  }

  private parseSectionJson(): unknown {
    if (this.parsedJsonCache === this.selectedSectionJson) {
      return this.parsedSectionCache;
    }

    try {
      this.visualFormError = '';
      this.parsedJsonCache = this.selectedSectionJson;
      this.parsedSectionCache = JSON.parse(this.selectedSectionJson);
      return this.parsedSectionCache;
    } catch {
      this.parsedJsonCache = this.selectedSectionJson;
      this.parsedSectionCache = undefined;
      return undefined;
    }
  }

  private commitSectionJson(section: unknown): void {
    const json = JSON.stringify(section, null, 2);
    this.selectedSectionJson = json;
    this.parsedJsonCache = json;
    this.parsedSectionCache = section;
    this.visualGroupsJsonCache = '';
    this.visibleGroupsCacheKey = '';
    this.selectedSectionJsonChange.emit(json);
  }

  private editableRootKeys(): string[] {
    return [
      'title',
      'subtitle',
      'description',
      'label',
      'cta',
      'ecom_link',
      'image_responsive',
      'video_responsive',
      'poster_responsive',
      'direction',
      'columns',
      'fullWidth',
      'backgroundcolor',
      'config_alignment',
      'config_aligment'
    ];
  }

  private fieldCategory(rootKey: string, path: JsonPathSegment[]): VisualFieldCategory {
    const pathText = path.map((part) => String(part)).join('.');
    if (this.isTextRoot(rootKey)) return 'text';
    if (['image_responsive', 'video_responsive', 'poster_responsive'].includes(rootKey)) return 'media';
    if (rootKey === 'ecom_link' || rootKey.startsWith('ecom_link_')) return 'links';
    if (['direction', 'columns', 'fullWidth', 'backgroundcolor', 'config_alignment', 'config_aligment'].includes(rootKey)) return 'layout';
    if (pathText.includes('custom_properties') || pathText.includes('custom_classes')) return 'advanced';
    return 'advanced';
  }

  private fieldHint(rootKey: string, path: JsonPathSegment[]): string {
    const pathText = path.map((part) => String(part)).join('.');
    if (this.isTextRoot(rootKey)) return 'Campo de texto visible en la sección';
    if (pathText.includes('image_sm') || pathText.includes('video_sm') || pathText.includes('poster_sm')) return 'Mobile';
    if (pathText.includes('image_md') || pathText.includes('video_md') || pathText.includes('poster_md')) return 'Tablet';
    if (pathText.includes('image_lg') || pathText.includes('video_lg') || pathText.includes('poster_lg')) return 'Desktop';
    if (rootKey === 'ecom_link' || rootKey.startsWith('ecom_link_')) return 'Destino de clic del banner o card';
    if (rootKey === 'config_alignment' || rootKey === 'config_aligment') return 'Alineación responsive del contenido';
    if (rootKey === 'columns') return this.pathLabel(path);
    if (pathText.includes('custom_classes')) return 'Clases CSS aplicadas al nodo';
    if (pathText.includes('custom_properties')) return 'Variables CSS y overrides de la landing';
    return '';
  }

  private isTextRoot(value: string): boolean {
    return ['title', 'subtitle', 'description', 'label', 'cta'].includes(value);
  }

  private isLocalizableField(rootKey: string, path: JsonPathSegment[]): boolean {
    return this.isTextRoot(rootKey) || this.isEcomLinkLocalizablePath(path);
  }

  private localizedFieldRootKey(rootKey: string, path: JsonPathSegment[]): string {
    if (!this.isEcomLinkLocalizablePath(path)) return rootKey;

    const key = String(path[path.length - 1] || '');
    return `ecom_link_${key}`;
  }

  private isEcomLinkLocalizablePath(path: JsonPathSegment[]): boolean {
    const parts = path.map((part) => String(part));
    const index = parts.lastIndexOf('ecom_link');

    return index >= 0 && ['type', 'identifier'].includes(parts[index + 1] || '') && parts.length === index + 2;
  }

  private visibleAlignmentValue(node: Record<string, unknown>, value: unknown): Record<string, unknown> {
    const alignment = this.asRecord(value);
    const visible: Record<string, unknown> = {};

    for (const root of this.alignmentRootKeysForNode(node)) {
      if (root in alignment) visible[root] = alignment[root];
    }

    return visible;
  }

  private isBannerChildPath(path: JsonPathSegment[]): boolean {
    return path.some((part) => part === 'banners');
  }

  private alignmentRootKeysForNode(node: Record<string, unknown>): ResponsiveRootKey[] {
    return node['type'] === 'banner'
      ? ['horizontal', 'vertical', 'packing']
      : ['horizontal'];
  }

  private isAlignmentRoot(root: string): root is ResponsiveRootKey {
    return ['horizontal', 'vertical', 'packing'].includes(root);
  }

  private configAlignmentKey(node: Record<string, unknown>): 'config_alignment' | 'config_aligment' {
    return 'config_aligment' in node && !('config_alignment' in node) ? 'config_aligment' : 'config_alignment';
  }

  private canHaveEcomLink(record: Record<string, unknown>): boolean {
    const type = record['type'];
    return type === 'banner' || type === 'card';
  }

  private emptyEcomLink(): Record<string, unknown> {
    return {
      type: {
        default: ''
      },
      identifier: {
        default: ''
      },
      url: 'null',
      anchor: null,
      obfuscated: false,
      custom_class: null,
      config_extra: {}
    };
  }

  private isLocalizedTextObject(value: unknown): boolean {
    const record = this.asRecord(value);
    return Object.entries(record).some(([key, item]) => {
      const isLocaleEntry = key === 'default' || this.isLocaleKey(key);
      const isSimpleValue = item === null || ['string', 'number', 'boolean'].includes(typeof item);
      return isLocaleEntry && isSimpleValue;
    });
  }

  private isLocaleKey(value: string): boolean {
    return /^[a-z]{2}-[A-Z]{2}$/.test(value);
  }

  private compareLocaleKeys(left: string, right: string): number {
    const order = ['default', 'es-ES', 'fr-FR', 'it-IT', 'pt-PT', 'de-DE', 'en-GB', 'en-IE', 'nl-NL', 'pl-PL', 'da-DK'];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
    if (leftIndex >= 0) return -1;
    if (rightIndex >= 0) return 1;
    return left.localeCompare(right);
  }

  private defaultLocaleLabel(rootKey: string): string {
    const labels: Record<string, string> = {
      title: 'Título por defecto',
      subtitle: 'Subtítulo por defecto',
      description: 'Descripción por defecto',
      label: 'Texto por defecto',
      cta: 'CTA por defecto',
      ecom_link_type: 'Type por defecto',
      ecom_link_identifier: 'Identifier por defecto'
    };

    return labels[rootKey] || 'Texto por defecto';
  }

  private localeLabel(value: string): string {
    const labels: Record<string, string> = {
      'es-ES': 'Español',
      'fr-FR': 'Francés',
      'it-IT': 'Italiano',
      'pt-PT': 'Portugués',
      'de-DE': 'Alemán',
      'en-GB': 'Inglés UK',
      'en-IE': 'Inglés IE',
      'nl-NL': 'Neerlandes',
      'pl-PL': 'Polaco',
      'da-DK': 'Danés'
    };

    return `${value} - ${labels[value] || 'Idioma'}`;
  }

  private supportedLocaleKeys(): string[] {
    return ['es-ES', 'fr-FR', 'it-IT', 'pt-PT', 'de-DE', 'en-GB', 'en-IE', 'nl-NL', 'pl-PL', 'da-DK'];
  }

  private nodeSummary(record: Record<string, unknown>): string {
    const text = ['title', 'subtitle', 'description', 'label', 'cta']
      .map((key) => this.extractPlainText(record[key]))
      .find(Boolean);

    return text || 'Sin texto detectado';
  }

  private nodeMedia(record: Record<string, unknown>): { mediaUrl: string; mediaType: 'image' | 'video' | '' } {
    const video = this.firstResponsiveUrl(record['video_responsive'], 'video');
    if (video) return { mediaUrl: video, mediaType: 'video' };

    const image = this.firstResponsiveUrl(record['image_responsive'], 'image')
      || this.firstResponsiveUrl(record['poster_responsive'], 'poster');
    if (image) return { mediaUrl: image, mediaType: 'image' };

    return { mediaUrl: '', mediaType: '' };
  }

  private firstResponsiveUrl(value: unknown, prefix: 'image' | 'video' | 'poster'): string {
    const variant = this.preferredLocale(value);
    return variant[`${prefix}_sm`] as string
      || variant[`${prefix}_md`] as string
      || variant[`${prefix}_lg`] as string
      || '';
  }

  private preferredLocale(value: unknown): Record<string, unknown> {
    const record = this.asRecord(value);
    for (const locale of ['es-ES', 'default', 'en-GB', 'en-IE']) {
      const variant = this.asRecord(record[locale]);
      if (Object.keys(variant).length) return variant;
    }

    return record;
  }

  private extractPlainText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (Array.isArray(value)) return value.map((item) => this.extractPlainText(item)).find(Boolean) || '';

    const record = this.asRecord(value);
    for (const key of ['es-ES', 'default', 'en-GB', 'en-IE', 'title', 'subtitle', 'description', 'label', 'cta']) {
      const text = this.extractPlainText(record[key]);
      if (text) return text;
    }

    for (const item of Object.values(record)) {
      const text = this.extractPlainText(item);
      if (text) return text;
    }

    return '';
  }

  private valueLabel(value: unknown): string {
    return typeof value === 'string' && value ? value : 'Section';
  }

  private pathId(path: JsonPathSegment[]): string {
    return path.map((part) => String(part)).join('.');
  }

  private pathLabel(path: JsonPathSegment[]): string {
    return path
      .map((part) => typeof part === 'number' ? `#${part + 1}` : part)
      .join(' / ');
  }

  private humanize(value: string): string {
    const labels: Record<string, string> = {
      title: 'Título',
      subtitle: 'Subtítulo',
      description: 'Descripción',
      label: 'Label',
      cta: 'CTA',
      ecom_link: 'Ecom link',
      image_responsive: 'Imágenes',
      video_responsive: 'Videos',
      poster_responsive: 'Posters',
      direction: 'Direction',
      columns: 'Columns',
      fullWidth: 'Full width',
      backgroundcolor: 'Background color',
      config_alignment: 'Config alignment',
      config_aligment: 'Config alignment',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      sm: 'Mobile',
      md: 'Tablet',
      lg: 'Desktop',
      xl: 'Desktop XL',
      config_extra: 'Config extra',
      html_tag: 'Html tag',
      custom_properties: 'Custom properties',
      custom_classes: 'Custom classes'
    };

    return labels[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
