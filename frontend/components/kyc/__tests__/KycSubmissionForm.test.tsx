import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { KycSubmissionForm } from '../KycSubmissionForm';

const mutateAsync = vi.fn();

vi.mock('@/lib/query/hooks/use-kyc-submit', () => ({
  useKycSubmit: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('KycSubmissionForm', () => {
  beforeEach(() => mutateAsync.mockReset());

  it('prefills names from defaultValues', () => {
    render(
      <KycSubmissionForm defaultValues={{ firstName: 'Ada', lastName: 'L' }} />,
    );
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
  });

  it('blocks submission and shows an error when fields are missing', () => {
    render(<KycSubmissionForm />);
    fireEvent.click(
      screen.getByRole('button', { name: /submit for verification/i }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/complete all fields/i);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
