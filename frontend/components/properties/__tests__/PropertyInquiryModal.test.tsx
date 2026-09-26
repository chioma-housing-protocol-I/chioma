import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockUseAuth = vi.fn();
const mockUsePathname = vi.fn(() => '/properties/1');
const mockNotifySuccess = vi.fn();
const mockNotifyError = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/ui', () => ({
  notify: {
    success: (...args: unknown[]) => mockNotifySuccess(...args),
    error: (...args: unknown[]) => mockNotifyError(...args),
  },
}));

import { PropertyInquiryModal } from '../PropertyInquiryModal';

describe('PropertyInquiryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      },
    });
  });

  it('prompts sign-in when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
      }),
    );

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to contact the host about Sunset Villa'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Property Inquiry')).not.toBeInTheDocument();
  });

  it('pre-fills the form with the signed-in user details', () => {
    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
      }),
    );

    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'Hello, I am interested in Sunset Villa. Please share next steps.',
      ),
    ).toBeInTheDocument();
  });

  it('shows validation errors when required fields are cleared', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
        onSubmit,
      }),
    );

    fireEvent.change(screen.getByPlaceholderText('Your full name'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByText('Send Inquiry'));

    await waitFor(() => {
      expect(screen.getAllByText('Name is required').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Email is required').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a format error for an invalid email address', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
        onSubmit,
      }),
    );

    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: 'not-an-email' },
    });

    fireEvent.click(screen.getByText('Send Inquiry'));

    await waitFor(() => {
      expect(
        screen.getAllByText('Enter a valid email address').length,
      ).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation error when the message is cleared', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
        onSubmit,
      }),
    );

    const messageField = screen.getByDisplayValue(
      'Hello, I am interested in Sunset Villa. Please share next steps.',
    );
    fireEvent.change(messageField, { target: { value: '' } });

    fireEvent.click(screen.getByText('Send Inquiry'));

    await waitFor(() => {
      expect(screen.getAllByText('Message is required').length).toBeGreaterThan(
        0,
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the inquiry and closes the modal on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose,
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
        onSubmit,
      }),
    );

    fireEvent.click(screen.getByText('Send Inquiry'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 'prop-1',
          propertyTitle: 'Sunset Villa',
          name: 'Jane Doe',
          email: 'jane@example.com',
        }),
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockNotifySuccess).toHaveBeenCalledWith('Inquiry sent successfully');
  });

  it('shows an error notification when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: true,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
        onSubmit,
      }),
    );

    fireEvent.click(screen.getByText('Send Inquiry'));

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Network error');
    });
  });

  it('does not render modal content when isOpen is false', () => {
    render(
      React.createElement(PropertyInquiryModal, {
        isOpen: false,
        onClose: vi.fn(),
        propertyId: 'prop-1',
        propertyTitle: 'Sunset Villa',
      }),
    );

    expect(screen.queryByText('Property Inquiry')).not.toBeInTheDocument();
  });
});
