// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileRecoveryWizard } from './FileRecoveryWizard';

describe('FileRecoveryWizard Component', () => {
  const mockOnRetryUpload = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    errorType: 'CORRUPTED_STRUCTURE' as const,
    fileName: 'resume.pdf',
    onRetryUpload: mockOnRetryUpload,
    onClose: mockOnClose,
  };

  it('renders Step 1 (ERROR_FEEDBACK) diagnostics correctly for CORRUPTED_STRUCTURE', () => {
    render(<FileRecoveryWizard {...defaultProps} />);

    expect(screen.getByText('Resume Recovery Wizard')).toBeInTheDocument();
    expect(screen.getByText('Corrupted File Structure')).toBeInTheDocument();
    expect(screen.getByText(/The file "resume.pdf" could not be opened/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze Resolution Strategy' })).toBeInTheDocument();
  });

  it('renders Step 1 diagnostics correctly for SCANNED_PDF_NO_TEXT', () => {
    render(<FileRecoveryWizard {...defaultProps} errorType="SCANNED_PDF_NO_TEXT" />);

    expect(screen.getByText('Unreadable PDF Layer (Scanned Document)')).toBeInTheDocument();
    expect(screen.getByText(/was successfully opened, but it contains zero digital text elements/i)).toBeInTheDocument();
  });

  it('renders Step 1 diagnostics correctly for UNSUPPORTED_RICH_FORMAT', () => {
    render(<FileRecoveryWizard {...defaultProps} errorType="UNSUPPORTED_RICH_FORMAT" />);

    expect(screen.getByText('Unsupported Rich Layout Elements')).toBeInTheDocument();
    expect(screen.getByText(/contains complex multi-column graphics/i)).toBeInTheDocument();
  });

  it('navigates through steps to upload and handles successful retry', async () => {
    mockOnRetryUpload.mockResolvedValue(true);
    const { container } = render(<FileRecoveryWizard {...defaultProps} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Resolution Strategy' }));
    expect(screen.getByText('🛠️ Actionable Blueprint')).toBeInTheDocument();
    expect(screen.getByText(/Re-save or re-export the document/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to Upload' }));
    expect(screen.getByText('Select your repaired resume file')).toBeInTheDocument();

    // File selection
    const file = new File(['dummy content'], 'repaired_resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('#recoveryFile') as HTMLInputElement;
    
    // Simulate file input change
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText('Target: repaired_resume.pdf')).toBeInTheDocument();

    // Click verify
    fireEvent.click(screen.getByRole('button', { name: 'Verify and Parse Resume' }));

    await waitFor(() => {
      expect(mockOnRetryUpload).toHaveBeenCalledWith(file);
      expect(screen.getByText('Document Parsed Successfully')).toBeInTheDocument();
    });

    // Step 4 close button
    fireEvent.click(screen.getByRole('button', { name: 'Return to Profile Setup' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error if file verification fails on retry', async () => {
    mockOnRetryUpload.mockResolvedValue(false);
    render(<FileRecoveryWizard {...defaultProps} />);

    // Go directly to Step 3 for quick test path (Step 1 -> Step 2 -> Step 3)
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Resolution Strategy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to Upload' }));

    const file = new File(['dummy content'], 'repaired_resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById('recoveryFile') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Verify and Parse Resume' }));

    await waitFor(() => {
      expect(mockOnRetryUpload).toHaveBeenCalled();
      expect(screen.getByText(/The newly uploaded file still failed verification/i)).toBeInTheDocument();
    });
  });

  it('shows error if network failure occurs during upload retry', async () => {
    mockOnRetryUpload.mockRejectedValue(new Error('Network Error'));
    render(<FileRecoveryWizard {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Resolution Strategy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to Upload' }));

    const file = new File(['dummy content'], 'repaired_resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById('recoveryFile') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Verify and Parse Resume' }));

    await waitFor(() => {
      expect(mockOnRetryUpload).toHaveBeenCalled();
      expect(screen.getByText(/A network error occurred while reprocessing the document/i)).toBeInTheDocument();
    });
  });
});
