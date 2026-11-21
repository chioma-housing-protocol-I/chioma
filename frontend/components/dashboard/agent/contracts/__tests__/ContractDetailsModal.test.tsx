import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractDetailsModal } from '../ContractDetailsModal';
import type { Contract } from '@/types/contracts';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const contract: Contract = {
  id: 'contract-1',
  propertyName: 'Lagos Apartment',
  propertyAddress: '12 Marina St, Lagos',
  landlord: { name: 'Jane Landlord', walletAddress: 'G...LAND', role: 'ADMIN' },
  tenant: { name: 'John Tenant', walletAddress: 'G...TEN', role: 'USER' },
  agent: { name: 'Pat Agent', walletAddress: 'G...AGT', role: 'USER' },
  rentAmount: '5000',
  securityDeposit: '1000',
  commissionRate: '5%',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'ACTIVE',
  stage: 'DEPOSIT_LOCKED',
  stellarTxHash: 'abc123txhash',
  createdAt: '2026-01-01T00:00:00.000Z',
  terms: 'Full lease terms text.',
};

describe('ContractDetailsModal', () => {
  it('renders the property name and status', () => {
    render(<ContractDetailsModal contract={contract} onClose={vi.fn()} />);

    expect(screen.getByText('Lagos Apartment')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows contract details by default and switches to the Full Agreement tab', () => {
    render(<ContractDetailsModal contract={contract} onClose={vi.fn()} />);

    expect(screen.getByText('Parties Involved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Full Agreement' }));
    expect(screen.getByText('Full lease terms text.')).toBeInTheDocument();
  });

  it('copies the Stellar transaction hash to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ContractDetailsModal contract={contract} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Copy transaction hash'));
    expect(writeText).toHaveBeenCalledWith('abc123txhash');
  });

  it('omits the blockchain record section when there is no tx hash', () => {
    render(
      <ContractDetailsModal
        contract={{ ...contract, stellarTxHash: '' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Blockchain Record')).not.toBeInTheDocument();
  });

  it('calls onClose when the header close button is clicked', () => {
    const onClose = vi.fn();
    render(<ContractDetailsModal contract={contract} onClose={onClose} />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onClose).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ContractDetailsModal contract={contract} onClose={onClose} />,
    );

    fireEvent.click(container.querySelector('.absolute.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ContractDetailsModal contract={contract} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
