import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { ApiKeysManagement } from '../ApiKeysManagement';

const existingKey = {
  id: 'key-1',
  name: 'Production key',
  description: 'Used in prod',
  keyPrefix: 'ck_live_',
  permissions: ['properties:read'],
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('ApiKeysManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [existingKey] });
    window.confirm = vi.fn(() => true);
  });

  it('loads and renders existing API keys', async () => {
    render(<ApiKeysManagement />);

    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(await screen.findByText('Production key')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(
      '/developer/api-keys',
      expect.objectContaining({ retries: 1 }),
    );
  });

  it('shows a loading message before the initial fetch resolves', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ApiKeysManagement />);

    expect(screen.getAllByText('Loading API keys...').length).toBeGreaterThan(
      0,
    );
  });

  it('shows an empty-detail placeholder when no key is selected', async () => {
    render(<ApiKeysManagement />);

    await screen.findByText('Production key');

    expect(
      screen.getByText('Select an API key to view details'),
    ).toBeInTheDocument();
  });

  it('selects a key from the list and renders its details', async () => {
    render(<ApiKeysManagement />);

    fireEvent.click(await screen.findByText('Production key'));

    expect(await screen.findByText('Used in prod')).toBeInTheDocument();
  });

  it('opens the create-key form and submits a new key', async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 'key-2',
        key: 'sk_live_generatedsecret',
        name: 'New Integration',
        expiresAt: '2025-01-01T00:00:00.000Z',
      },
    });
    mockGet
      .mockResolvedValueOnce({ data: [existingKey] })
      .mockResolvedValueOnce({
        data: [
          existingKey,
          { ...existingKey, id: 'key-2', name: 'New Integration' },
        ],
      });

    render(<ApiKeysManagement />);
    await screen.findByText('Production key');

    fireEvent.click(screen.getByText('New API Key'));

    fireEvent.change(
      screen.getByPlaceholderText('e.g. Production Integration'),
      { target: { value: 'New Integration' } },
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Key' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/developer/api-keys',
        expect.objectContaining({ name: 'New Integration' }),
        expect.objectContaining({ retries: 1 }),
      );
    });

    expect(
      await screen.findByText('sk_live_generatedsecret'),
    ).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('API key generated');
  });

  it('revokes a key after confirmation', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    mockGet
      .mockResolvedValueOnce({ data: [existingKey] })
      .mockResolvedValueOnce({ data: [] });

    render(<ApiKeysManagement />);
    await screen.findByText('Production key');

    fireEvent.click(screen.getByTitle('Revoke'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        '/developer/api-keys/key-1',
        expect.objectContaining({ retries: 1 }),
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith('API key revoked');
  });

  it('shows an error toast when the initial key load fails', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    render(<ApiKeysManagement />);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to load API keys');
    });
  });
});
