import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletSelectorModal from '../WalletSelectorModal';

const wallets = [
  {
    id: 'freighter',
    name: 'Freighter',
    type: 'HOT_WALLET',
    isAvailable: true,
    isPlatformWrapper: false,
    icon: '',
    url: '',
  },
  {
    id: 'xbull',
    name: 'xBull',
    type: 'HOT_WALLET',
    isAvailable: false,
    isPlatformWrapper: false,
    icon: '',
    url: '',
  },
];

describe('WalletSelectorModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <WalletSelectorModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists wallets returned by listWallets, marking unavailable ones as not installed', async () => {
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );

    expect(await screen.findByText('Freighter')).toBeInTheDocument();
    expect(screen.getByText('xBull')).toBeInTheDocument();
    expect(screen.getByText('Not installed')).toBeInTheDocument();
  });

  it('calls onSelectWallet with the clicked wallet id', async () => {
    const onSelectWallet = vi.fn();
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={onSelectWallet}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );

    fireEvent.click(await screen.findByText('Freighter'));
    expect(onSelectWallet).toHaveBeenCalledWith('freighter');
  });

  it('disables the other wallets while one is connecting', async () => {
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId="freighter"
        error={null}
      />,
    );

    await screen.findByText('Freighter');
    expect(screen.getByText('Freighter').closest('button')).toBeDisabled();
    expect(screen.getByText('xBull').closest('button')).toBeDisabled();
  });

  it('shows an empty state when no wallets are returned', async () => {
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue([])}
        connectingWalletId={null}
        error={null}
      />,
    );

    expect(
      await screen.findByText('No supported wallets were found.'),
    ).toBeInTheDocument();
  });

  it('renders a distinct message per error reason', async () => {
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={{ reason: 'wrong-network', message: 'raw message' }}
      />,
    );

    await screen.findByText('Freighter');
    expect(
      screen.getByText('Your wallet is set to the wrong network.'),
    ).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={onClose}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );

    await screen.findByText('Freighter');
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <WalletSelectorModal
        isOpen={true}
        onClose={onClose}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );

    await screen.findByText('Freighter');
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal panel', async () => {
    const onClose = vi.fn();
    render(
      <WalletSelectorModal
        isOpen={true}
        onClose={onClose}
        onSelectWallet={vi.fn()}
        listWallets={vi.fn().mockResolvedValue(wallets)}
        connectingWalletId={null}
        error={null}
      />,
    );

    fireEvent.click(await screen.findByText('Connect a wallet'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('re-fetches wallets each time it is reopened', async () => {
    const listWallets = vi.fn().mockResolvedValue(wallets);
    const { rerender } = render(
      <WalletSelectorModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={listWallets}
        connectingWalletId={null}
        error={null}
      />,
    );

    expect(listWallets).not.toHaveBeenCalled();

    rerender(
      <WalletSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectWallet={vi.fn()}
        listWallets={listWallets}
        connectingWalletId={null}
        error={null}
      />,
    );

    await waitFor(() => expect(listWallets).toHaveBeenCalledTimes(1));
  });
});
