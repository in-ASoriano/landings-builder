import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';

import { SearchPanelComponent } from './features/component-library/search-panel/search-panel';
import { EmptyLandingComponent } from './features/landing-manager/empty-landing/empty-landing';
import { LandingPreviewComponent } from './features/preview/landing-preview/landing-preview';
import { SectionEditorComponent } from './features/section-editor/section-editor/section-editor';
import { SectionListComponent } from './features/section-list/section-list/section-list';
import { LandingCreateModalComponent } from './layout/landing-create-modal/landing-create-modal';
import { LandingSwitcherComponent } from './layout/landing-switcher/landing-switcher';
import { LandingToolbarComponent } from './layout/landing-toolbar/landing-toolbar';
import { AppNoticesComponent } from './shared/ui/app-notices/app-notices';
import { DeleteModalComponent } from './shared/ui/delete-modal/delete-modal';
import { LandingApiService } from './core/services/landing-api.service';
import { SectionJsonService } from './core/services/section-json.service';
import { ThemeService } from './core/services/theme.service';
import {
  AppTheme,
  AppThemeOption,
  CreateLandingRequest,
  DeleteModal,
  LandingDetail,
  LandingSummary,
  SectionMove,
  SectionSummary,
  TplStatus
} from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AppNoticesComponent,
    DeleteModalComponent,
    EmptyLandingComponent,
    LandingCreateModalComponent,
    LandingPreviewComponent,
    LandingSwitcherComponent,
    LandingToolbarComponent,
    SearchPanelComponent,
    SectionEditorComponent,
    SectionListComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit, OnDestroy {

  private readonly api = inject(LandingApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sectionJson = inject(SectionJsonService);
  private readonly themeService = inject(ThemeService);

  public config?: { landingRoot: string; tplRoot: string };
  public landings: LandingSummary[] = [];
  public selectedFile = '';
  public createNumber = '';
  public createSlug = '';
  public selectedLanding?: LandingDetail;
  public selectedSectionIndex = 0;
  public selectedSectionJson = '';
  public sectionJsonError = '';
  public tplStatus?: TplStatus;
  public query = '';
  public landingFilter = '';
  public sectionFilter = '';
  public components: SectionSummary[] = [];
  public libraryComponents: SectionSummary[] = [];
  public libraryPreviewComponent?: SectionSummary;
  public libraryPreviewJson = '';
  public libraryPreviewLoading = false;
  public libraryPreviewTplStatus?: TplStatus;
  public libraryLoading = false;
  public searchPreviewComponent?: SectionSummary;
  public searchPreviewJson = '';
  public searchPreviewLoading = false;
  private searchDebounceId?: ReturnType<typeof setTimeout>;
  public appendIds: Record<string, string> = {};
  public loading = false;
  public creatingLanding = false;
  public deletingLanding = false;
  public savingSection = false;
  public deletingSection = false;
  public duplicatingSection = false;
  public addingBanner = false;
  public importingLanding = false;
  public message = '';
  public error = '';
  public deleteModal?: DeleteModal;
  public deleteConfirmation = '';
  public readonly deleteConfirmText = 'Confirmar';
  public readonly themeOptions: AppThemeOption[] = this.themeService.options;
  public activeTheme: AppTheme = this.themeService.initialTheme();
  public createLandingModalOpen = false;
  public previewOpen = false;
  public sectionsColumnWidth = 620;
  private resizingSections = false;
  private resizeStartX = 0;
  private resizeStartWidth = 620;
  private readonly sectionsColumnMinWidth = 260;
  private readonly sectionsColumnMaxWidth = 620;
  private tplStatusRequest = 0;
  private libraryPreviewTplStatusRequest = 0;
  private readonly externalWatchIntervalMs = 2500;
  private externalWatchId?: ReturnType<typeof setInterval>;
  private selectedLandingModifiedAt = '';
  private selectedTplModifiedAt = '';
  private selectedThemeCssModifiedAt = '';
  private landingsSignature = '';
  private autoRefreshPauseNotified = false;

  ngOnInit(): void {
    this.loadConfig();
    this.loadLandings();
    this.startExternalChangeWatch();
  }

  ngOnDestroy(): void {
    if (this.externalWatchId) clearInterval(this.externalWatchId);
  }

  @HostListener('document:keydown', ['$event'])
  public handleDocumentShortcuts(event: KeyboardEvent): void {
    const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
    if (!isSaveShortcut) return;

    event.preventDefault();
    if (!this.canSaveSelectedSection()) return;
    this.saveSelectedSection();
  }

  @HostListener('document:mousemove', ['$event'])
  public resizeSectionsColumn(event: MouseEvent): void {
    if (!this.resizingSections) return;
    event.preventDefault();
    const delta = event.clientX - this.resizeStartX;
    this.sectionsColumnWidth = this.clampSectionsColumnWidth(this.resizeStartWidth + delta);
    this.refresh();
  }

  @HostListener('document:mouseup')
  public stopSectionsResize(): void {
    this.resizingSections = false;
  }

  public loadConfig(): void {
    this.api.getConfig().subscribe({
      next: (config) => {
        this.config = config;
        this.refresh();
      },
      error: (error) => this.showError(error)
    });
  }

  public openCreateLandingModal(): void {
    this.createLandingModalOpen = true;
    this.refresh();
  }

  public closeCreateLandingModal(): void {
    if (this.creatingLanding) return;
    this.createLandingModalOpen = false;
    this.refresh();
  }

  public togglePreview(): void {
    this.previewOpen = !this.previewOpen;
    this.refresh();
  }

  public workbenchGridTemplate(): Record<string, string> {
    if (typeof window !== 'undefined' && window.innerWidth <= 980) return {};

    return {
      'grid-template-columns': `minmax(220px, ${this.sectionsColumnWidth}px) 10px minmax(420px, 1fr)`
    };
  }

  public startSectionsResize(event: MouseEvent): void {
    event.preventDefault();
    this.resizingSections = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.sectionsColumnWidth;
  }

  public resetSectionsWidth(): void {
    this.sectionsColumnWidth = this.sectionsColumnMaxWidth;
    this.refresh();
  }

  private clampSectionsColumnWidth(width: number): number {
    return Math.max(this.sectionsColumnMinWidth, Math.min(this.sectionsColumnMaxWidth, Math.round(width)));
  }

  public loadLandings(): void {
    this.loading = true;
    this.api.getLandings().subscribe({
      next: ({ landings }) => {
        this.landings = landings;
        this.landingsSignature = this.signatureForLandings(landings);
        if (!this.createNumber) this.createNumber = this.suggestNextNumber();
        if (!this.landings.some((landing) => landing.file === this.selectedFile)) {
          this.selectedFile = this.landings[0]?.file || '';
        }
        if (this.selectedFile) this.loadLanding(this.selectedFile);
        this.loadComponentLibrary();
        this.loading = false;
        this.refresh();
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  public loadLanding(file = this.selectedFile, options: { clearMessage?: boolean } = {}): void {
    if (!file) return;
    const clearMessage = options.clearMessage ?? true;
    this.selectedFile = file;
    if (clearMessage) this.message = '';
    this.tplStatus = undefined;
    this.selectedLanding = undefined;
    this.selectedSectionJson = '';
    this.api.getLanding(file).subscribe({
      next: (landing) => {
        if (landing.file !== this.selectedFile) return;
        this.selectedLanding = landing;
        this.selectedLandingModifiedAt = landing.modifiedAt || this.modifiedAtForLanding(landing.file);
        if (this.selectedSectionIndex >= landing.sections.length) {
          this.selectedSectionIndex = Math.max(landing.sections.length - 1, 0);
        }
        this.updateSelectedSectionJson();
        this.loadTplStatus();
        this.refresh();
      },
      error: (error) => this.showError(error)
    });
  }

  public loadTplStatus(): void {
    if (!this.selectedFile) return;
    const requestedFile = this.selectedFile;
    const requestId = ++this.tplStatusRequest;
    this.tplStatus = undefined;
    this.api.getTplStatus(requestedFile).subscribe({
      next: (status) => {
        if (requestId !== this.tplStatusRequest || status.file !== this.selectedFile) return;
        this.tplStatus = status;
        this.selectedTplModifiedAt = status.modifiedAt || '';
        this.selectedThemeCssModifiedAt = status.themeCssModifiedAt || '';
        this.refresh();
      },
      error: () => {
        if (requestId !== this.tplStatusRequest) return;
        this.tplStatus = undefined;
        this.selectedTplModifiedAt = '';
        this.selectedThemeCssModifiedAt = '';
        this.refresh();
      }
    });
  }

  // Editor TPL desactivado: la app solo consulta su CSS para renderizar la preview.

  private startExternalChangeWatch(): void {
    if (this.externalWatchId) return;
    this.externalWatchId = setInterval(() => this.checkExternalChanges(), this.externalWatchIntervalMs);
  }

  private checkExternalChanges(): void {
    if (this.loading || this.creatingLanding || this.deletingLanding || this.deletingSection || this.savingSection || this.duplicatingSection || this.addingBanner || this.importingLanding) return;

    this.api.getLandings().subscribe({
      next: ({ landings }) => {
        const previousSignature = this.landingsSignature;
        const nextSignature = this.signatureForLandings(landings);
        const selectedStillExists = landings.some((landing) => landing.file === this.selectedFile);

        this.landings = landings;
        this.landingsSignature = nextSignature;
        if (!this.createNumber) this.createNumber = this.suggestNextNumber();

        if (!selectedStillExists) {
          this.selectedFile = landings[0]?.file || '';
          this.selectedLandingModifiedAt = '';
          this.selectedTplModifiedAt = '';
          this.selectedThemeCssModifiedAt = '';
          if (this.selectedFile) {
            this.message = `Detectado cambio externo: cargada ${this.selectedFile}.`;
            this.loadLanding(this.selectedFile, { clearMessage: false });
          } else {
            this.selectedLanding = undefined;
            this.selectedSectionJson = '';
          }
          this.refresh();
          return;
        }

        if (previousSignature && previousSignature !== nextSignature) {
          this.loadComponentLibrary();
        }

        this.checkSelectedFileStamps();
        this.refresh();
      },
      error: () => undefined
    });
  }

  private checkSelectedFileStamps(): void {
    if (!this.selectedFile) return;
    const requestedFile = this.selectedFile;
    this.api.getFileStamps(requestedFile).subscribe({
      next: (stamps) => {
        if (stamps.file !== this.selectedFile) return;

        if (stamps.modifiedAt && stamps.modifiedAt !== this.selectedLandingModifiedAt) {
          this.reloadLandingAfterExternalChange(stamps.modifiedAt);
          return;
        }

        const tplChanged = stamps.tplModifiedAt !== this.selectedTplModifiedAt
          || stamps.themeCssModifiedAt !== this.selectedThemeCssModifiedAt;

        if (tplChanged) {
          this.selectedTplModifiedAt = stamps.tplModifiedAt;
          this.selectedThemeCssModifiedAt = stamps.themeCssModifiedAt;
          this.message = `Detectado cambio externo en estilos de ${this.selectedFile}.`;
          this.loadTplStatus();
        }
      },
      error: () => undefined
    });
  }

  private reloadLandingAfterExternalChange(modifiedAt: string): void {
    if (this.hasUnsavedSelectedSectionChanges()) {
      if (!this.autoRefreshPauseNotified) {
        this.message = 'Detecté cambios externos en htdocs, pero no recargo para no pisar los cambios sin guardar del editor.';
        this.autoRefreshPauseNotified = true;
        this.refresh();
      }
      return;
    }

    this.autoRefreshPauseNotified = false;
    this.selectedLandingModifiedAt = modifiedAt;
    this.message = `Actualizado automáticamente desde htdocs: ${this.selectedFile}.`;
    this.loadLanding(this.selectedFile, { clearMessage: false });
  }

  public searchComponents(value = this.query): void {
    this.query = value;
    if (!value.trim()) {
      this.components = [];
      this.searchPreviewComponent = undefined;
      this.searchPreviewJson = '';
      this.refresh();
      return;
    }
    this.api
      .getComponents(value, 80)
      .subscribe({
        next: ({ components }) => {
          this.components = components;
          for (const component of components) {
            const key = this.key(component);
            this.ensureAppendId(component);
          }
          if (components.length) {
            this.previewSearchComponent(components[0]);
          } else {
            this.searchPreviewComponent = undefined;
            this.searchPreviewJson = '';
          }
          this.refresh();
        },
        error: (error) => this.showError(error)
      });
  }

  public scheduleSearch(value: string): void {
    this.query = value;
    if (this.searchDebounceId) clearTimeout(this.searchDebounceId);

    if (!value.trim()) {
      this.components = [];
      this.searchPreviewComponent = undefined;
      this.searchPreviewJson = '';
      this.refresh();
      return;
    }

    this.searchDebounceId = setTimeout(() => this.searchComponents(value), 250);
  }

  public applySearchSuggestion(value: string): void {
    this.query = value;
    if (this.searchDebounceId) clearTimeout(this.searchDebounceId);
    this.searchComponents(value);
  }

  public loadComponentLibrary(): void {
    this.libraryLoading = true;
    this.api
      .getComponents('', 5000)
      .subscribe({
        next: ({ components }) => {
          this.libraryLoading = false;
          this.libraryComponents = components.filter((component) => Boolean(component.id));
          for (const component of this.libraryComponents) {
            this.ensureAppendId(component);
          }

          const currentKey = this.libraryPreviewComponent ? this.key(this.libraryPreviewComponent) : '';
          const nextPreview = currentKey
            ? this.libraryComponents.find((component) => this.key(component) === currentKey)
            : undefined;
          if (nextPreview) {
            this.previewLibraryComponent(nextPreview);
          } else {
            this.libraryPreviewComponent = undefined;
            this.libraryPreviewJson = '';
            this.libraryPreviewLoading = false;
            this.libraryPreviewTplStatus = undefined;
          }
          this.refresh();
        },
        error: (error) => {
          this.libraryLoading = false;
          this.showError(error);
        }
      });
  }

  public previewLibraryComponent(component: SectionSummary): void {
    this.libraryPreviewComponent = component;
    this.libraryPreviewJson = '';
    this.libraryPreviewLoading = true;
    this.libraryPreviewTplStatus = undefined;
    this.loadLibraryPreviewTplStatus(component.file);

    const fromCurrentLanding = this.selectedLanding?.file === component.file
      ? this.selectedLanding
      : undefined;

    if (fromCurrentLanding) {
      this.setLibraryPreviewJson(fromCurrentLanding, component);
      return;
    }

    this.api.getLanding(component.file).subscribe({
      next: (landing) => this.setLibraryPreviewJson(landing, component),
      error: (error) => {
        this.libraryPreviewLoading = false;
        this.showError(error);
      }
    });
  }

  public loadLibraryPreviewTplStatus(file: string): void {
    const requestId = ++this.libraryPreviewTplStatusRequest;
    this.api.getTplStatus(file).subscribe({
      next: (status) => {
        if (requestId !== this.libraryPreviewTplStatusRequest || this.libraryPreviewComponent?.file !== file) return;
        this.libraryPreviewTplStatus = status;
        this.refresh();
      },
      error: () => {
        if (requestId !== this.libraryPreviewTplStatusRequest) return;
        this.libraryPreviewTplStatus = undefined;
        this.refresh();
      }
    });
  }

  public previewSearchComponent(component: SectionSummary): void {
    this.searchPreviewComponent = component;
    this.searchPreviewJson = '';
    this.searchPreviewLoading = true;

    const fromCurrentLanding = this.selectedLanding?.file === component.file
      ? this.selectedLanding
      : undefined;

    if (fromCurrentLanding) {
      this.setSearchPreviewJson(fromCurrentLanding, component);
      return;
    }

    this.api.getLanding(component.file).subscribe({
      next: (landing) => this.setSearchPreviewJson(landing, component),
      error: (error) => {
        this.searchPreviewLoading = false;
        this.showError(error);
      }
    });
  }

  public createLanding(request?: CreateLandingRequest): void {
    const number = (request?.number ?? this.createNumber).trim();
    const slug = (request?.slug ?? this.createSlug).trim();
    if (!/^\d{4}$/.test(number)) {
      this.error = 'El número debe tener 4 dígitos, por ejemplo 4024.';
      this.refresh();
      return;
    }
    if (!slug) {
      this.error = 'Escribe un nombre para la landing.';
      this.refresh();
      return;
    }

    this.creatingLanding = true;
    this.api.createLanding({ number, slug }).subscribe({
      next: ({ file }) => {
        this.creatingLanding = false;
        this.createLandingModalOpen = false;
        this.selectedFile = file;
        this.selectedSectionIndex = 0;
        this.createSlug = '';
        this.createNumber = String(Number(number) + 1).padStart(4, '0');
        this.message = `Creada ${file} con sections vacío.`;
        this.loadLandings();
        this.loadLanding(file);
        this.refresh();
      },
      error: (error) => {
        this.creatingLanding = false;
        this.showError(error);
      }
    });
  }

  public deleteLanding(): void {
    if (!this.selectedFile) return;
    this.deleteConfirmation = '';
    this.deleteModal = {
      type: 'landing',
      title: 'Borrar landing',
      body: 'Se eliminará el JSON ' + this.selectedFile + '.',
      target: this.selectedFile
    };
    this.refresh();
  }

  public downloadSelectedLanding(): void {
    if (!this.selectedFile || !this.selectedLanding?.raw) return;

    const json = `${JSON.stringify(this.selectedLanding.raw, null, 2)}\n`;
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.selectedFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.message = `Descargada ${this.selectedFile}.`;
    this.refresh();
  }

  public async importLandingFile(file: File): Promise<void> {
    if (!file) return;

    this.importingLanding = true;
    this.message = '';
    this.error = '';
    this.refresh();

    try {
      const text = await file.text();
      const landing = JSON.parse(text) as unknown;
      const targetFile = this.isLandingFileName(file.name) ? file.name : this.selectedFile;
      if (!targetFile) throw new Error('Selecciona una landing destino o importa un JSON con nombre 1234-nombre.json.');

      this.api.importLanding({ fileName: file.name, targetFile, landing }).subscribe({
        next: ({ file: importedFile, sections }) => {
          this.importingLanding = false;
          this.selectedFile = importedFile;
          this.selectedSectionIndex = 0;
          this.message = `Importada ${importedFile} con ${sections} secciones.`;
          this.loadLandings();
          this.loadLanding(importedFile);
          this.refresh();
        },
        error: (error) => {
          this.importingLanding = false;
          this.showError(error);
        }
      });
    } catch (error) {
      this.importingLanding = false;
      this.error = error instanceof Error ? error.message : 'No se ha podido importar el JSON.';
      this.refresh();
    }
  }

  public closeDeleteModal(): void {
    if (this.deletingLanding || this.deletingSection) return;
    this.deleteModal = undefined;
    this.deleteConfirmation = '';
    this.refresh();
  }

  public canConfirmDelete(): boolean {
    return !!this.deleteModal && this.deleteConfirmation.trim() === this.deleteConfirmText && !this.deletingLanding && !this.deletingSection;
  }

  public confirmDelete(): void {
    if (!this.canConfirmDelete() || !this.deleteModal) return;
    if (this.deleteModal.type === 'landing') {
      this.confirmLandingDelete(this.deleteModal.target);
      return;
    }
    this.confirmSectionDelete(this.deleteModal.target, this.deleteModal.sectionIndex ?? 0);
  }

  private confirmLandingDelete(deletedFile: string): void {
    this.deletingLanding = true;
    this.api.deleteLanding(deletedFile).subscribe({
      next: () => {
        this.deletingLanding = false;
        this.deleteModal = undefined;
        this.deleteConfirmation = '';
        this.selectedLanding = undefined;
        this.selectedSectionJson = '';
        this.tplStatus = undefined;
        this.message = 'Borrada ' + deletedFile + '.';
        this.loadLandings();
        this.refresh();
      },
      error: (error) => {
        this.deletingLanding = false;
        this.showError(error);
      }
    });
  }

  public append(component: SectionSummary): void {
    if (!this.selectedFile) return;
    const id = this.appendIds[this.key(component)] || this.suggestId(component);
    const payload = { sourceFile: component.file, sectionIndex: component.sectionIndex, id };
    this.loading = true;
    this.api.appendSection(this.selectedFile, payload).subscribe({
      next: ({ sections }) => {
        this.loading = false;
        this.selectedSectionIndex = Math.max(sections - 1, 0);
        this.message = `Añadida sección ${component.sectionIndex} de ${component.file}. Total: ${sections}.`;
        this.loadLanding(this.selectedFile);
        this.loadLandings();
        this.refresh();
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  public createBlankSection(component = 'TextGroup'): void {
    if (!this.selectedFile) return;
    const id = this.suggestBlankSectionId(component);
    this.loading = true;
    this.api.createSection(this.selectedFile, { id, component }).subscribe({
      next: ({ sections }) => {
        this.loading = false;
        this.selectedSectionIndex = Math.max(sections - 1, 0);
        this.message = `Creada nueva sección ${component} en ${this.selectedFile}.`;
        this.loadLanding(this.selectedFile);
        this.loadLandings();
        this.refresh();
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  public duplicateSelectedSection(): void {
    this.duplicateSectionAt(this.selectedSectionIndex);
  }

  public duplicateSectionAt(sectionIndex: number): void {
    if (!this.selectedLanding || !this.selectedFile) return;
    this.duplicatingSection = true;
    this.api.duplicateSection(this.selectedFile, sectionIndex).subscribe({
      next: ({ duplicated }) => {
        this.duplicatingSection = false;
        this.selectedSectionIndex = duplicated.sectionIndex;
        this.message = `Duplicada sección ${sectionIndex + 1} debajo.`;
        this.loadLanding(this.selectedFile);
        this.loadLandings();
        this.refresh();
      },
      error: (error) => {
        this.duplicatingSection = false;
        this.showError(error);
      }
    });
  }

  public addBannerToSelectedSection(): void {
    if (!this.selectedLanding || !this.selectedFile) return;
    const sectionIndex = this.selectedSectionIndex;
    this.addingBanner = true;
    this.api.addBanner(this.selectedFile, sectionIndex).subscribe({
      next: ({ banners }) => {
        this.addingBanner = false;
        this.selectedSectionIndex = sectionIndex;
        this.message = `Añadido banner ${banners} a la sección ${sectionIndex + 1}.`;
        this.loadLanding(this.selectedFile);
        this.loadLandings();
        this.refresh();
      },
      error: (error) => {
        this.addingBanner = false;
        this.showError(error);
      }
    });
  }

  public selectSection(index: number): void {
    this.selectedSectionIndex = index;
    this.updateSelectedSectionJson();
  }

  public moveSection(move: SectionMove): void {
    if (!this.selectedFile || move.fromIndex === move.toIndex) return;
    this.loading = true;
    this.api
      .reorderSections(this.selectedFile, move)
      .subscribe({
        next: () => {
          this.loading = false;
          this.selectedSectionIndex = this.indexAfterMove(this.selectedSectionIndex, move.fromIndex, move.toIndex);
          this.message = `Sección ${move.fromIndex + 1} movida a la posición ${move.toIndex + 1}.`;
          this.loadLanding(this.selectedFile);
          this.loadLandings();
          this.refresh();
        },
        error: (error) => {
          this.loading = false;
          this.showError(error);
        }
      });
  }

  public selectedSectionSummary(): SectionSummary | undefined {
    return this.selectedLanding?.sections[this.selectedSectionIndex];
  }

  public formatSelectedSection(): void {
    const formatted = this.sectionJson.format(this.selectedSectionJson);
    this.selectedSectionJson = formatted.json;
    this.sectionJsonError = formatted.error;
    this.refresh();
  }

  public deleteSelectedSection(): void {
    if (!this.selectedLanding || !this.selectedFile) return;
    this.deleteSectionAt(this.selectedSectionIndex);
  }

  public deleteSectionAt(sectionIndex: number): void {
    if (!this.selectedLanding || !this.selectedFile) return;
    const current = this.selectedLanding.sections[sectionIndex];
    const label = current?.id || current?.component || 'sección ' + (sectionIndex + 1);
    this.deleteConfirmation = '';
    this.deleteModal = {
      type: 'section',
      title: 'Borrar sección',
      body: 'Se eliminará la sección ' + (sectionIndex + 1) + ' (' + label + ') de ' + this.selectedFile + '.',
      target: this.selectedFile,
      sectionIndex
    };
    this.refresh();
  }

  private confirmSectionDelete(targetFile: string, previousIndex: number): void {
    this.deletingSection = true;
    this.api
      .deleteSection(targetFile, previousIndex)
      .subscribe({
        next: ({ sections }) => {
          this.deletingSection = false;
          this.deleteModal = undefined;
          this.deleteConfirmation = '';
          this.selectedSectionIndex = Math.max(Math.min(previousIndex, sections - 1), 0);
          this.selectedSectionJson = '';
          this.message = 'Sección ' + (previousIndex + 1) + ' borrada. Total: ' + sections + '.';
          this.loadLanding(targetFile);
          this.loadLandings();
          this.refresh();
        },
        error: (error) => {
          this.deletingSection = false;
          this.showError(error);
        }
      });
  }

  public saveSelectedSection(): void {
    if (!this.selectedLanding || !this.selectedFile) return;

    const parsed = this.sectionJson.parseSection(this.selectedSectionJson);
    if (parsed.error) {
      this.sectionJsonError = parsed.error;
      this.refresh();
      return;
    }
    const section = parsed.section;
    this.selectedSectionJson = JSON.stringify(section ?? {}, null, 2);
    this.sectionJsonError = '';

    this.savingSection = true;
    this.api
      .updateSection(this.selectedFile, this.selectedSectionIndex, section)
      .subscribe({
        next: ({ modifiedAt, updated }) => {
          this.savingSection = false;
          this.showMessage(`Sección ${updated.sectionIndex + 1} guardada correctamente en ${this.selectedFile}.`);
          this.applySavedSection(section, updated, modifiedAt);
          this.refresh();
        },
        error: (error) => {
          this.savingSection = false;
          this.showError(error);
        }
      });
  }

  private canSaveSelectedSection(): boolean {
    return Boolean(
      this.selectedLanding &&
      this.selectedFile &&
      this.selectedSectionJson &&
      !this.savingSection &&
      !this.loading &&
      !this.creatingLanding &&
      !this.deletingLanding &&
      !this.deletingSection &&
      !this.duplicatingSection &&
      !this.addingBanner &&
      !this.importingLanding &&
      !this.deleteModal
    );
  }

  public setTheme(theme: AppTheme): void {
    this.activeTheme = theme;
    this.themeService.storeTheme(theme);
    this.refresh();
  }

  public workspaceThemeClass(): string {
    return this.themeService.workspaceClass(this.activeTheme);
  }

  public currentTplStatus(): TplStatus | undefined {
    return this.tplStatus?.file === this.selectedFile ? this.tplStatus : undefined;
  }

  public currentTplCss(): string {
    return this.currentTplStatus()?.css || '';
  }

  public currentThemeCss(): string {
    return this.currentTplStatus()?.themeCss || '';
  }

  public currentTplPath(): string {
    return this.currentTplStatus()?.tplPath || '';
  }

  public currentPreviewSections(): unknown[] {
    return this.selectedLanding?.raw?.sections || [];
  }

  public key(component: SectionSummary): string {
    return component.file + ':' + component.sectionIndex;
  }

  public setAppendId(key: string, value: string): void {
    this.appendIds[key] = value;
  }

  public suggestNextNumber(): string {
    const max = this.landings.reduce((highest, landing) => Math.max(highest, landing.number || 0), 0);
    return String(max + 1).padStart(4, '0');
  }

  public suggestId(component: SectionSummary): string {
    return this.uniqueSuggestedSectionId(this.sectionJson.suggestId(component), component.id);
  }

  public sectionIdsForEditor(): string[] {
    return (this.selectedLanding?.sections || [])
      .map((section) => section.id)
      .filter((id): id is string => Boolean(id));
  }

  private ensureAppendId(component: SectionSummary): void {
    const key = this.key(component);
    const current = this.appendIds[key];
    if (current && current !== component.id && current !== this.sectionJson.legacySuggestedId(component)) return;

    this.appendIds[key] = this.suggestId(component);
  }

  private uniqueSuggestedSectionId(baseId: string, sourceId = ''): string {
    const base = this.slug(baseId) || 'section';
    const existingIds = new Set(this.sectionIdsForEditor().filter((id) => id !== sourceId));
    if (!existingIds.has(base)) return base;

    let index = 2;
    let candidate = `${base}-${index}`;
    while (existingIds.has(candidate)) {
      index += 1;
      candidate = `${base}-${index}`;
    }

    return candidate;
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

  public suggestBlankSectionId(component = 'TextGroup'): string {
    const existingIds = new Set((this.selectedLanding?.sections || []).map((section) => section.id).filter(Boolean));
    const base = component.replace(/Group$/, '').toLowerCase() + '-section';
    let index = (this.selectedLanding?.sections.length || 0) + 1;
    let id = `${base}-${index}`;
    while (existingIds.has(id)) {
      index += 1;
      id = `${base}-${index}`;
    }
    return id;
  }

  public searchPlaceholder(): string {
    const ids = this.selectedLanding?.sections
      .map((section) => section.id)
      .filter((id): id is string => Boolean(id));
    const uniqueIds = [...new Set(ids)].slice(0, 4);
    return uniqueIds.length
      ? uniqueIds.join(', ')
      : 'Busca por id de sección, landing, texto, imagen/video o clase...';
  }

  public searchSuggestion(): string {
    const query = this.query.trim().toLowerCase();
    if (!query) return '';
    const match = this.components
      .map((component) => component.id || component.component)
      .find((label) => {
        const normalized = label.toLowerCase();
        return normalized.startsWith(query) && normalized !== query;
      });
    return match || '';
  }

  public shortText(value: string, max = 130): string {
    if (!value) return 'Sin texto detectado';
    return value.length > max ? `${value.slice(0, max).trim()}...` : value;
  }

  public trackByFile(_: number, landing: LandingSummary): string {
    return landing.file;
  }

  public trackBySection(_: number, section: SectionSummary): string {
    return `${section.file}:${section.sectionIndex}:${section.id}`;
  }

  private signatureForLandings(landings: LandingSummary[]): string {
    return landings
      .map((landing) => `${landing.file}:${landing.modifiedAt || ''}:${landing.sections}:${landing.error || ''}`)
      .join('|');
  }

  private modifiedAtForLanding(file: string): string {
    return this.landings.find((landing) => landing.file === file)?.modifiedAt || '';
  }

  private applySavedSection(section: unknown, updated: SectionSummary, modifiedAt = ''): void {
    if (!this.selectedLanding) return;

    const rawSections = [...(this.selectedLanding.raw?.sections || [])];
    rawSections[updated.sectionIndex] = section;
    const sections = [...this.selectedLanding.sections];
    sections[updated.sectionIndex] = updated;
    const nextModifiedAt = modifiedAt || this.selectedLanding.modifiedAt || this.modifiedAtForLanding(this.selectedFile);

    this.selectedLanding = {
      ...this.selectedLanding,
      modifiedAt: nextModifiedAt,
      sections,
      raw: {
        ...this.selectedLanding.raw,
        sections: rawSections
      }
    };
    this.selectedLandingModifiedAt = nextModifiedAt;

    this.landings = this.landings.map((landing) => (
      landing.file === this.selectedFile
        ? { ...landing, modifiedAt: nextModifiedAt, sections: sections.length }
        : landing
    ));
    this.landingsSignature = this.signatureForLandings(this.landings);
    this.components = this.replaceComponentSummary(this.components, updated);
    this.libraryComponents = this.replaceComponentSummary(this.libraryComponents, updated);

    if (this.searchPreviewComponent && this.isSameComponentLocation(this.searchPreviewComponent, updated)) {
      this.searchPreviewComponent = updated;
      this.setSearchPreviewJson(this.selectedLanding, updated);
    }

    if (this.libraryPreviewComponent && this.isSameComponentLocation(this.libraryPreviewComponent, updated)) {
      this.libraryPreviewComponent = updated;
      this.setLibraryPreviewJson(this.selectedLanding, updated);
    }
  }

  private replaceComponentSummary(components: SectionSummary[], updated: SectionSummary): SectionSummary[] {
    return components.map((component) => (
      this.isSameComponentLocation(component, updated)
        ? updated
        : component
    ));
  }

  private isSameComponentLocation(a: SectionSummary, b: SectionSummary): boolean {
    return a.file === b.file && a.sectionIndex === b.sectionIndex;
  }

  private isLandingFileName(fileName: string): boolean {
    return /^\d{4}-.+\.json$/.test(fileName);
  }

  public hasUnsavedSelectedSectionChanges(): boolean {
    const original = this.selectedLanding?.raw?.sections?.[this.selectedSectionIndex];
    if (!original || !this.selectedSectionJson.trim()) return false;

    return this.sectionJson.hasUnsavedChanges(original, this.selectedSectionJson);
  }

  private updateSelectedSectionJson(): void {
    this.selectedSectionJson = this.sectionJson.sectionJsonFromLanding(
      this.selectedLanding?.raw?.sections,
      this.selectedSectionIndex
    );
    this.sectionJsonError = '';
    this.autoRefreshPauseNotified = false;
    this.refresh();
  }

  private indexAfterMove(currentIndex: number, fromIndex: number, toIndex: number): number {
    if (currentIndex === fromIndex) return toIndex;
    if (fromIndex < toIndex && currentIndex > fromIndex && currentIndex <= toIndex) return currentIndex - 1;
    if (fromIndex > toIndex && currentIndex >= toIndex && currentIndex < fromIndex) return currentIndex + 1;
    return currentIndex;
  }

  private setSearchPreviewJson(landing: LandingDetail, component: SectionSummary): void {
    this.searchPreviewJson = this.sectionJson.previewJsonFromLanding(landing.raw?.sections, component.sectionIndex);
    this.searchPreviewLoading = false;
    this.refresh();
  }

  private setLibraryPreviewJson(landing: LandingDetail, component: SectionSummary): void {
    this.libraryPreviewJson = this.sectionJson.previewJsonFromLanding(landing.raw?.sections, component.sectionIndex);
    this.libraryPreviewLoading = false;
    this.refresh();
  }

  private showError(error: unknown): void {
    const raw = error as { error?: { error?: string }; message?: string };
    this.error = raw?.error?.error || raw?.message || 'Error inesperado';
    this.refresh();
  }

  private showMessage(message: string): void {
    this.message = '';
    this.refresh();
    this.message = message;
    this.refresh();
  }

  private refresh(): void {
    this.cdr.detectChanges();
  }
}
