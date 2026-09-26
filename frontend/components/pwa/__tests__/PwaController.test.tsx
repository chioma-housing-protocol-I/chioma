import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  default: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign((...args: unknown[]) => toastMock.default(...args), {
    success: toastMock.success,
    error: toastMock.error,
  }),
}));

import PwaController from '../PwaController';

type FakeInstallEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function dispatchInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as FakeInstallEvent;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: 'web' });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('PwaController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    delete (window as unknown as { Notification?: unknown }).Notification;
  });

  it('renders nothing when there is no install prompt, update, or iOS banner', () => {
    const { container } = render(React.createElement(PwaController));
    expect(container.firstChild).toBeNull();
  });

  it('shows the iOS install banner on iPhone Safari and can be dismissed', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });

    render(React.createElement(PwaController));

    expect(screen.getByText('Install on iPhone or iPad')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(
      screen.queryByText('Install on iPhone or iPad'),
    ).not.toBeInTheDocument();
  });

  it('shows the install banner and installs the app when the user accepts', async () => {
    render(React.createElement(PwaController));

    const event = dispatchInstallPrompt('accepted');

    expect(await screen.findByText('Install Chioma')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /install app/i }));
      await Promise.resolve();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Install started. Chioma will appear on your home screen.',
    );
    expect(screen.queryByText('Install Chioma')).not.toBeInTheDocument();
  });

  it('dismisses the install banner via "Not now"', async () => {
    render(React.createElement(PwaController));

    dispatchInstallPrompt();

    expect(await screen.findByText('Install Chioma')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(screen.queryByText('Install Chioma')).not.toBeInTheDocument();
  });

  it('shows an error toast when notifications are unsupported', async () => {
    delete (window as unknown as { Notification?: unknown }).Notification;

    render(React.createElement(PwaController));

    dispatchInstallPrompt();

    expect(await screen.findByText('Install Chioma')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enable alerts/i }));
      await Promise.resolve();
    });

    expect(toastMock.error).toHaveBeenCalledWith(
      'Notifications are not supported on this device.',
    );
  });
});
