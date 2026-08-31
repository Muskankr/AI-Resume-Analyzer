// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JobDescriptionInput } from './JobDescriptionInput';

describe('JobDescriptionInput Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    // Setup clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders input area, placeholder, and character counter', () => {
    render(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    expect(screen.getByText('Target Job Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste or type the core engineering skills/i)).toBeInTheDocument();
    expect(screen.getByText('0/2,000')).toBeInTheDocument();
  });

  it('shows Paste from Clipboard button when clipboard API is supported', () => {
    render(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    expect(screen.getByRole('button', { name: /Paste from Clipboard/i })).toBeInTheDocument();
  });

  it('hides Paste from Clipboard button when clipboard API is not supported', () => {
    // Remove clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    expect(screen.queryByRole('button', { name: /Paste from Clipboard/i })).not.toBeInTheDocument();
  });

  it('pastes text from clipboard and respects character limit', async () => {
    const clipboardText = 'React Developer with 5 years experience';
    (navigator.clipboard.readText as any).mockResolvedValue(clipboardText);

    render(
      <JobDescriptionInput
        value="Senior "
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    const pasteBtn = screen.getByRole('button', { name: /Paste from Clipboard/i });
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('Senior React Developer with 5 years experience');
    });
  });

  it('truncates clipboard text if it exceeds maxCharacters space remaining', async () => {
    const clipboardText = 'A'.repeat(100);
    (navigator.clipboard.readText as any).mockResolvedValue(clipboardText);

    render(
      <JobDescriptionInput
        value={'B'.repeat(1950)}
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    const pasteBtn = screen.getByRole('button', { name: /Paste from Clipboard/i });
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      // 1950 chars exist, max is 2000, space remaining is 50 chars.
      // Slices 50 chars of clipboardText and appends them
      expect(mockOnChange).toHaveBeenCalledWith('B'.repeat(1950) + 'A'.repeat(50));
      expect(screen.getByText(/Pasted text was truncated/i)).toBeInTheDocument();
    });
  });

  it('shows error if clipboard is empty', async () => {
    (navigator.clipboard.readText as any).mockResolvedValue('');

    render(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    const pasteBtn = screen.getByRole('button', { name: /Paste from Clipboard/i });
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(screen.getByText('Clipboard is empty.')).toBeInTheDocument();
    });
  });

  it('shows error if clipboard permission is denied', async () => {
    (navigator.clipboard.readText as any).mockRejectedValue(new Error('Permission Denied'));

    render(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        maxCharacters={2000}
      />
    );

    const pasteBtn = screen.getByRole('button', { name: /Paste from Clipboard/i });
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(screen.getByText('Permission denied or clipboard access blocked.')).toBeInTheDocument();
    });
  });

  it('triggers onChange callback when text is entered via keyboard', () => {
    render(<JobDescriptionInput value="Initial text" onChange={mockOnChange} maxCharacters={2000} />);

    expect(screen.getByText('12/2,000')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Paste or type the core engineering skills/i);
    fireEvent.change(textarea, { target: { value: 'New text entered' } });

    expect(mockOnChange).toHaveBeenCalledWith('New text entered');
  });

  it('enforces character ceiling and does not allow typing beyond maxCharacters', () => {
    render(<JobDescriptionInput value="" onChange={mockOnChange} maxCharacters={10} />);

    const textarea = screen.getByPlaceholderText(/Paste or type the core engineering skills/i);
    
    // Type 9 chars -> allowed
    fireEvent.change(textarea, { target: { value: '123456789' } });
    expect(mockOnChange).toHaveBeenCalledWith('123456789');

    // Type 11 chars -> ignored
    fireEvent.change(textarea, { target: { value: '12345678901' } });
    expect(mockOnChange).not.toHaveBeenCalledWith('12345678901');
  });
});
