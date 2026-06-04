
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SectionMove, SectionSummary } from '../../../models';

type NewSectionComponent = 'TextGroup' | 'CardGroup' | 'BannerGroup';

@Component({
  selector: 'app-section-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './section-list.html',
  styleUrls: ['./section-list.scss']
})
export class SectionListComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() sections: SectionSummary[] = [];
  @Input() selectedSectionIndex = 0;
  @Input() sectionFilter = '';

  @Output() sectionFilterChange = new EventEmitter<string>();
  @Output() selectSection = new EventEmitter<number>();
  @Output() moveSection = new EventEmitter<SectionMove>();
  @Output() createSection = new EventEmitter<NewSectionComponent>();
  @Output() duplicateSection = new EventEmitter<number>();
  @Output() deleteSection = new EventEmitter<number>();

  public draggingIndex: number | null = null;
  public dropTargetIndex: number | null = null;
  public newSectionComponent: NewSectionComponent = 'TextGroup';
  public newSectionMenuOpen = false;
  private dragMoved = false;

  public readonly newSectionOptions: NewSectionComponent[] = ['TextGroup', 'CardGroup', 'BannerGroup'];

  public toggleNewSectionMenu(): void {
    this.newSectionMenuOpen = !this.newSectionMenuOpen;
  }

  public createNewSection(component: NewSectionComponent): void {
    this.newSectionMenuOpen = false;
    this.createSection.emit(component);
  }

  @HostListener('document:click', ['$event'])
  public closeNewSectionMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.newSectionMenuOpen) return;
    const target = event.target instanceof Node ? event.target : null;
    const menu = this.elementRef.nativeElement.querySelector('.section-list__create-menu');
    if (target && menu?.contains(target)) return;
    this.newSectionMenuOpen = false;
  }

  public get filteredSections(): SectionSummary[] {
    const query = this.sectionFilter.trim().toLowerCase();
    if (!query) return this.sections;
    return this.sections.filter((section) => {
      const haystack = [
        section.id || '',
        section.component || '',
        section.title || '',
        section.file || '',
        (section.classes || []).join(' ')
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  public trackBySection(_: number, section: SectionSummary): string {
    return section.file + ':' + section.sectionIndex + ':' + section.id;
  }

  public selectedSection(): SectionSummary | undefined {
    return this.sections[this.selectedSectionIndex];
  }

  public updateFilter(value: string): void {
    this.sectionFilterChange.emit(value);
  }

  public scrollHorizontally(event: WheelEvent): void {
    const strip = event.currentTarget as HTMLElement | null;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;

    event.preventDefault();
    strip.scrollLeft += event.deltaX || event.deltaY;
  }

  public startDrag(event: DragEvent, section: SectionSummary): void {
    this.draggingIndex = section.sectionIndex;
    this.dropTargetIndex = section.sectionIndex;
    this.dragMoved = false;
    event.dataTransfer?.setData('text/plain', String(section.sectionIndex));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  public dragOver(event: DragEvent, section: SectionSummary): void {
    if (this.draggingIndex === null) return;
    event.preventDefault();
    this.dropTargetIndex = section.sectionIndex;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  public dropSection(event: DragEvent, section: SectionSummary): void {
    event.preventDefault();
    const fromIndex = this.draggingIndex ?? Number(event.dataTransfer?.getData('text/plain'));
    const toIndex = section.sectionIndex;
    this.resetDrag();
    if (!Number.isFinite(fromIndex) || fromIndex === toIndex) return;
    this.dragMoved = true;
    this.moveSection.emit({ fromIndex, toIndex });
  }

  public endDrag(): void {
    this.resetDrag();
  }

  public clickSection(event: MouseEvent, section: SectionSummary): void {
    if (this.dragMoved) {
      event.preventDefault();
      this.dragMoved = false;
      return;
    }
    this.selectSection.emit(section.sectionIndex);
  }

  public requestDeleteSection(event: MouseEvent, section: SectionSummary): void {
    event.preventDefault();
    event.stopPropagation();
    this.deleteSection.emit(section.sectionIndex);
  }

  public requestDuplicateSection(event: MouseEvent, section: SectionSummary): void {
    event.preventDefault();
    event.stopPropagation();
    this.duplicateSection.emit(section.sectionIndex);
  }

  public isDragging(section: SectionSummary): boolean {
    return this.draggingIndex === section.sectionIndex;
  }

  public isDropTarget(section: SectionSummary): boolean {
    return this.dropTargetIndex === section.sectionIndex && this.draggingIndex !== section.sectionIndex;
  }

  private resetDrag(): void {
    this.draggingIndex = null;
    this.dropTargetIndex = null;
  }
}
