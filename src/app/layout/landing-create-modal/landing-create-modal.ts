import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateLandingRequest } from '../../models';

@Component({
  selector: 'app-landing-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-create-modal.html',
  styleUrls: ['./landing-create-modal.scss']
})
export class LandingCreateModalComponent {
  @Input() open = false;
  @Input() createNumber = '';
  @Input() createSlug = '';
  @Input() nextNumber = '';
  @Input() creatingLanding = false;

  @Output() createNumberChange = new EventEmitter<string>();
  @Output() createSlugChange = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() createLanding = new EventEmitter<CreateLandingRequest>();

  public submit(): void {
    this.createLanding.emit({
      number: this.createNumber,
      slug: this.createSlug
    });
  }
}
