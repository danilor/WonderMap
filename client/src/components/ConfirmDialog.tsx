import Modal from 'react-bootstrap/Modal';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** "Are you sure?" box in the app's style (instead of the browser's own dialog). */
export function ConfirmDialog({ show, title, children, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal show={show} onHide={onCancel} centered size="sm" data-testid="confirm-dialog">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-outline-light" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} data-testid="confirm-yes">
          {confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
