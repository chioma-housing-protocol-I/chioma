import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfilePage from '../page';
import { useAuth } from '@/store/authStore';
import {
  useKycStatus,
  useSubmitKyc,
} from '@/lib/query/hooks/use-kyc-verifications';

// Mocks
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/query/hooks/use-kyc-verifications', () => ({
  useKycStatus: vi.fn(),
  useSubmitKyc: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/stellar-auth', () => ({
  getFreighterPublicKey: vi.fn().mockResolvedValue('G_TEST_ADDRESS'),
}));

const mockUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'user',
};

const mockMutateAsync = vi.fn();

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      accessToken: 'fake_token',
    });

    (useKycStatus as any).mockReturnValue({
      data: { status: 'PENDING' },
      isLoading: false,
    });

    (useSubmitKyc as any).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    // Mock fetch for profile endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        profilePicture: null,
      }),
    });
  });

  it('renders loading state initially', () => {
    (useKycStatus as any).mockReturnValue({ isLoading: true });
    render(<UserProfilePage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders correctly with loaded profile', async () => {
    render(<UserProfilePage />);

    // Wait for the profile fetch to finish
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays Full Verified badge for APPROVED status', async () => {
    (useKycStatus as any).mockReturnValue({
      data: { status: 'APPROVED' },
      isLoading: false,
    });
    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Full Verified')).toBeInTheDocument();
    });
  });

  it('displays Basic Verification badge for PENDING status', async () => {
    (useKycStatus as any).mockReturnValue({
      data: { status: 'PENDING' },
      isLoading: false,
    });
    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Basic Verification')).toBeInTheDocument();
    });
  });

  it('allows filling out KYC form and submitting', async () => {
    (useKycStatus as any).mockReturnValue({
      data: { status: 'none' }, // Unverified
      isLoading: false,
    });

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Submit for Verification')).toBeInTheDocument();
    });

    const dobInput = document.querySelector('input[type="date"]');
    if (dobInput) {
      fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
    }

    const countryInput = screen.getByPlaceholderText('e.g. United States');
    fireEvent.change(countryInput, { target: { value: 'Nigeria' } });

    // Mock files for uploaders
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const idFile = new File(['dummy content'], 'id.png', { type: 'image/png' });
    const addressFile = new File(['dummy content'], 'address.png', {
      type: 'image/png',
    });

    if (fileInputs.length >= 2) {
      fireEvent.change(fileInputs[0], { target: { files: [idFile] } });
      fireEvent.change(fileInputs[1], { target: { files: [addressFile] } });
    }

    const submitBtn = screen.getByText('Submit for Verification');
    fireEvent.click(submitBtn);

    // wait for mutateAsync to be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    const callArgs = mockMutateAsync.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      first_name: 'John',
      last_name: 'Doe',
      dob: '1990-01-01',
      country: 'Nigeria',
    });
    expect(callArgs.id_document).toContain('data:image/png;base64');
  });

  it('allows updating profile information', async () => {
    (useKycStatus as any).mockReturnValue({
      data: { status: 'none' }, // Unverified
      isLoading: false,
    });

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click Edit Profile
    const editBtn = screen.getByText('Edit Profile');
    fireEvent.click(editBtn);

    // Change name
    const nameInputs = screen
      .getAllByRole('textbox')
      .filter((el) => (el as HTMLInputElement).value === 'John Doe');
    if (nameInputs.length > 0) {
      fireEvent.change(nameInputs[0], { target: { value: 'Jane Doe' } });
    }

    // Change phone
    const phoneInput = screen.getByPlaceholderText('+234 000 000 0000');
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    // Mock fetch for PATCH request
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    // Save changes
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ fullName: 'Jane Doe', phone: '0987654321' }),
        }),
      );
    });
  });

  it('allows connecting a wallet', async () => {
    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const connectBtn = screen.getByText('Connect Wallet');
    fireEvent.click(connectBtn);

    const { getFreighterPublicKey } = await import('@/lib/stellar-auth');
    await waitFor(() => {
      expect(getFreighterPublicKey).toHaveBeenCalled();
    });

    // Test clipboard copy
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
    });

    // We would click copy here if it was easy to query, but just covering connect wallet adds coverage
  });

  it('handles KYC submission failure', async () => {
    (useKycStatus as any).mockReturnValue({
      data: { status: 'none' },
      isLoading: false,
    });

    mockMutateAsync.mockRejectedValueOnce(new Error('Network Error'));

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Submit for Verification')).toBeInTheDocument();
    });

    const dobInput = document.querySelector('input[type="date"]');
    if (dobInput)
      fireEvent.change(dobInput, { target: { value: '1990-01-01' } });

    const countryInput = screen.getByPlaceholderText('e.g. United States');
    fireEvent.change(countryInput, { target: { value: 'Nigeria' } });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    if (fileInputs.length >= 2) {
      fireEvent.change(fileInputs[0], {
        target: { files: [new File([], 'a')] },
      });
      fireEvent.change(fileInputs[1], {
        target: { files: [new File([], 'b')] },
      });
    }

    fireEvent.click(screen.getByText('Submit for Verification'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
