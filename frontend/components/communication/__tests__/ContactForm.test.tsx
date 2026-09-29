import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../ContactForm';

describe('ContactForm', () => {
  it('renders the expected fields', () => {
    render(<ContactForm onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Property inquiry')).toBeInTheDocument();
  });

  it('shows validation errors and does not call onSubmit when fields are invalid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContactForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Enter your name').length).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText('Enter a valid email address').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Enter a subject').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Message should be at least 12 characters').length,
    ).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data and resets the form', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContactForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Property inquiry'), {
      target: { value: 'Question about lease' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Share the details you want the recipient to act on. Emoji and @mentions are supported in the message body.',
      ),
      { target: { value: 'This is a long enough message body.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Question about lease',
          message: 'This is a long enough message body.',
        }),
      );
    });
  });
});
