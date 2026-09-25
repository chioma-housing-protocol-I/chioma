import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastMock.success,
    error: toastMock.error,
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { ProfileMetadataManagement } from '../ProfileMetadataManagement';

describe('ProfileMetadataManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the default metadata fields and summary counts', () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    expect(screen.getByText('Profile Metadata')).toBeInTheDocument();
    expect(screen.getByText('Total Fields')).toBeInTheDocument();
    // 6 default fields, 5 public (phone is private).
    expect(screen.getAllByText('6')[0]).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('shows a placeholder until a field is selected', () => {
    render(<ProfileMetadataManagement userId="user-1" />);
    expect(
      screen.getByText('Select a field to view details'),
    ).toBeInTheDocument();
  });

  it('selects a field and shows its detail panel', () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Bio'));

    expect(
      screen.queryByText('Select a field to view details'),
    ).not.toBeInTheDocument();
    // The detail panel renders the field label as a heading.
    expect(screen.getByRole('heading', { name: 'Bio' })).toBeInTheDocument();
    expect(screen.getByText('View History')).toBeInTheDocument();
  });

  it('toggles the change-history panel for the selected field', () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Bio'));
    fireEvent.click(screen.getByText('View History'));

    expect(screen.getByText('Change History')).toBeInTheDocument();
    expect(screen.getByText('Field ID: bio')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide History'));
    expect(screen.queryByText('Change History')).not.toBeInTheDocument();
  });

  it('adds a new custom field through the form', async () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Add Field'));
    expect(screen.getByText('Add New Field')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g., Bio'), {
      target: { value: 'Twitter Handle' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., bio'), {
      target: { value: 'twitter' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Field' }));

    // react-hook-form's handleSubmit resolves asynchronously.
    expect(await screen.findByText('Twitter Handle')).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('Field added successfully');
    // Total field count grows from 6 to 7.
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('deletes a custom field after confirmation', async () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Add Field'));
    fireEvent.change(screen.getByPlaceholderText('e.g., Bio'), {
      target: { value: 'Twitter Handle' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., bio'), {
      target: { value: 'twitter' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Field' }));

    const customFieldButton = (
      await screen.findByText('Twitter Handle')
    ).closest('button') as HTMLElement;
    fireEvent.click(within(customFieldButton).getByTitle('Delete'));

    expect(window.confirm).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(
      'Field deleted successfully',
    );
    expect(screen.queryByText('Twitter Handle')).not.toBeInTheDocument();
  });

  it('filters fields via the search box in the field list', () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.change(screen.getByPlaceholderText('Search fields...'), {
      target: { value: 'website' },
    });

    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.queryByText('Bio')).not.toBeInTheDocument();
  });

  it('exports metadata as a downloadable JSON file', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      writable: true,
      configurable: true,
    });

    render(<ProfileMetadataManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Export'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(toastMock.success).toHaveBeenCalledWith('Metadata exported');
  });

  it('renders the public profile preview with only public, non-empty fields', () => {
    render(<ProfileMetadataManagement userId="user-1" />);

    expect(screen.getByText('Public Profile Preview')).toBeInTheDocument();
    // All default field values are empty, so no public fields render.
    expect(
      screen.getByText(
        'No public fields. Add fields and make them public to create your profile.',
      ),
    ).toBeInTheDocument();
  });
});
