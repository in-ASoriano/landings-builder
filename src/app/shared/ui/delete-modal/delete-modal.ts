import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeleteModal } from '../../../models';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-modal.html',
  styleUrls: ['./delete-modal.scss']
})
export class DeleteModalComponent {
  @Input() modal?: DeleteModal;
  @Input() confirmation = '';
  @Input() confirmText = 'Confirmar';
  @Input() deletingLanding = false;
  @Input() deletingSection = false;
  @Input() canConfirm = false;

  @Output() confirmationChange = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmDelete = new EventEmitter<void>();
}
