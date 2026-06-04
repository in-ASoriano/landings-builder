import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppendIdChange, SectionSummary } from '../../../models';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './results-grid.html',
  styleUrls: ['./results-grid.scss']
})
export class ResultsGridComponent {
  @Input() components: SectionSummary[] = [];
  @Input() appendIds: Record<string, string> = {};
  @Input() selectedFile = '';
  @Input() loading = false;

  @Output() appendComponent = new EventEmitter<SectionSummary>();
  @Output() appendIdChange = new EventEmitter<AppendIdChange>();

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

  public trackBySection(_: number, section: SectionSummary): string {
    return section.file + ':' + section.sectionIndex + ':' + section.id;
  }
}
