import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockUseAuthStore = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector?: unknown) => {
    const state = mockUseAuthStore();
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/lib/query/hooks/use-landlord-documents', () => ({
  useUploadDocument: () => ({ mutate: mockMutate, isPending: false }),
}));

import { DocumentUpload } from '../DocumentUpload';

function makeFile(name = 'lease.pdf', size = 1024, type = 'application/pdf') {
  const file = new File(['a'.repeat(size)], name, { type });
  return file;
}

describe('DocumentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
    });
  });

  it('renders the upload form with default fields', () => {
    render(React.createElement(DocumentUpload, {}));

    expect(
      screen.getByRole('heading', { name: 'Upload Document' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Click to upload a file')).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Name/)).toBeInTheDocument();
  });

  it('disables submission until a file and name are provided', () => {
    render(React.createElement(DocumentUpload, {}));

    const submitButton = screen.getByText('Upload Document', {
      selector: 'button',
    });
    expect(submitButton).toBeDisabled();
  });

  it('shows the selected file name and auto-fills the document name field', () => {
    render(React.createElement(DocumentUpload, {}));

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('inspection-report.pdf');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('inspection-report.pdf')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('inspection-report.pdf'),
    ).toBeInTheDocument();
  });

  it('allows removing a selected file', () => {
    render(React.createElement(DocumentUpload, {}));

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile()] } });

    expect(screen.getByText('lease.pdf')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find((btn) =>
      btn.querySelector('svg.lucide-x'),
    );
    expect(removeButton).toBeTruthy();
    fireEvent.click(removeButton!);

    expect(screen.queryByText('lease.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Click to upload a file')).toBeInTheDocument();
  });

  it('shows the property name field only when no propertyId is provided', () => {
    const { rerender } = render(React.createElement(DocumentUpload, {}));
    expect(
      screen.getByPlaceholderText('Property name or address'),
    ).toBeInTheDocument();

    rerender(React.createElement(DocumentUpload, { propertyId: 'prop-1' }));
    expect(
      screen.queryByPlaceholderText('Property name or address'),
    ).not.toBeInTheDocument();
  });

  it('submits the upload with the selected file and metadata', async () => {
    render(React.createElement(DocumentUpload, {}));

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('lease-agreement.pdf');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByText('Upload Document', {
      selector: 'button',
    });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          metadata: expect.objectContaining({
            name: 'lease-agreement.pdf',
            type: 'OTHER',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(React.createElement(DocumentUpload, { onCancel }));

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
