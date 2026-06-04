import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LandingSummary } from '../../models';

@Component({
  selector: 'app-landing-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-switcher.html',
  styleUrls: ['./landing-switcher.scss']
})
export class LandingSwitcherComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() landings: LandingSummary[] = [];
  @Input() selectedFile = '';
  @Input() landingFilter = '';
  @Input() creatingLanding = false;

  @Output() selectedFileChange = new EventEmitter<string>();
  @Output() landingFilterChange = new EventEmitter<string>();
  @Output() openCreateLanding = new EventEmitter<void>();

  public pickerOpen = false;

  @HostListener('document:click', ['$event'])
  public closeOnOutsideClick(event: MouseEvent): void {
    if (!this.pickerOpen) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.pickerOpen = false;
  }

  public filteredLandings(): LandingSummary[] {
    const query = this.landingFilter.trim().toLowerCase();
    if (!query) return this.landings;
    return this.landings.filter((landing) => landing.file.toLowerCase().includes(query));
  }

  public selectedLandingLabel(): string {
    const selected = this.landings.find((landing) => landing.file === this.selectedFile);
    if (!selected) return 'Seleccionar landing';
    return `${selected.file} · ${selected.sections} secciones`;
  }

  public togglePicker(): void {
    this.pickerOpen = !this.pickerOpen;
  }

  public updateLandingFilter(value: string): void {
    this.landingFilterChange.emit(value);
    if (!this.pickerOpen) this.pickerOpen = true;
  }

  public selectLanding(file: string): void {
    this.selectedFileChange.emit(file);
    this.pickerOpen = false;
  }

  public trackByFile(_: number, landing: LandingSummary): string {
    return landing.file;
  }
}
