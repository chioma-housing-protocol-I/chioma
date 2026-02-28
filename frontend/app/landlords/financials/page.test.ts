import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import FinancialsPage from './page';
import { Transaction } from '@/lib/transactions-data';

const mockTransactions: Transaction[] = [
  { id: 1, date: '2022-01-01', type: 'Rent', amount: 1000, currency: 'USD', propertyName: 'Property 1' },
  { id: 2, date: '2022-01-15', type: 'Deposit', amount: 500, currency: 'USD', propertyName: 'Property 2' },
];

describe('FinancialsPage', () => {
  it('renders transactions table', async () => {
    const { getByText } = render(<FinancialsPage />);
    await waitFor(() => getByText('Transaction & Payment History'));
    expect(getByText('Property 1')).toBeInTheDocument();
    expect(getByText('Property 2')).toBeInTheDocument();
  });

  it('exports transactions to CSV', async () => {
    const { getByText } = render(<FinancialsPage />);
    const exportButton = getByText('Export CSV');
    fireEvent.click(exportButton);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
  });

  it('exports transactions to PDF', async () => {
    const { getByText } = render(<FinancialsPage />);
    const exportButton = getByText('Export PDF');
    fireEvent.click(exportButton);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
  });
});
