'use client';

import { Home } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import TransactionsTable from '@/components/landlord-dashboard/TransactionsTable';
import type { Transaction } from '@/lib/transactions-data';

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2025-02-20T14:32:00Z',
    type: 'Rent',
    amount: 2400,
    currency: 'XLM',
    amountUsd: 480,
    status: 'Completed',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    description: 'February 2025 rent',
  },
  {
    id: 'tx-2',
    date: '2025-02-18T09:15:00Z',
    type: 'Deposit',
    amount: 4800,
    currency: 'XLM',
    amountUsd: 960,
    status: 'Pending',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: null,
    description: 'Security deposit',
    isSecurityDeposit: true,
  },
  {
    id: 'tx-3',
    date: '2025-02-15T11:00:00Z',
    type: 'Service Fee',
    amount: 24,
    currency: 'USD',
    status: 'Failed',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: null,
    description: 'Platform fee (1%)',
  },
];

/**
 * Section wrapper providing a stable, isolated background so each
 * `data-testid` region can be screenshot independently of the rest of the
 * page (and of each other, if the gallery grows over time).
 */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
        {title}
      </h2>
      <div
        data-testid={id}
        className="inline-block rounded-2xl border border-white/10 bg-background p-6"
      >
        {children}
      </div>
    </section>
  );
}

export default function VisualGalleryClient() {
  return (
    <main className="min-h-screen space-y-10 bg-background p-10">
      <h1 className="text-2xl font-black text-foreground">
        Visual regression gallery
      </h1>

      <Section id="gallery-buttons" title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="default" size="sm">
            Small
          </Button>
          <Button variant="default" size="lg">
            Large
          </Button>
          <Button variant="default" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section id="gallery-badges" title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section id="gallery-alerts" title="Alert">
        <div className="flex w-96 flex-col gap-4">
          <Alert variant="default">
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              This is an informational alert message.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              This is a destructive alert message.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section id="gallery-form-fields" title="Form fields">
        <div className="flex w-80 flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="gallery-input">Email</Label>
            <Input id="gallery-input" placeholder="you@example.com" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gallery-textarea">Message</Label>
            <Textarea
              id="gallery-textarea"
              placeholder="Type a message..."
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label>Property type</Label>
            <Select defaultValue="apartment">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section id="gallery-table" title="Table">
        <Table className="w-96">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Sunset View Apartments</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Downtown Retail Space</TableCell>
              <TableCell>Pending</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section id="gallery-empty-state" title="Empty state">
        <div className="w-96">
          <EmptyState
            icon={Home}
            title="No properties yet"
            description="Add your first property to start collecting rent on-chain."
            actionLabel="Add property"
            onAction={() => {}}
            variant="dark"
          />
        </div>
      </Section>

      <Section id="gallery-pagination" title="Pagination">
        <Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />
      </Section>

      {/* Highest-traffic composed view: the transactions table shown on
          both the tenant and landlord dashboards. */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
          Composed: Transactions table
        </h2>
        <div data-testid="gallery-transactions-table" className="w-[900px]">
          <TransactionsTable transactions={SAMPLE_TRANSACTIONS} />
        </div>
      </section>
    </main>
  );
}
