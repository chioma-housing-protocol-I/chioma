import { Notification } from './types';

// ─── Mock Notifications ─────────────────────────────────────────────────────
// Seed data used while the backend notification endpoints are not yet wired.
// Replace with real API calls via the notification store when ready.

/** Helper – minutes ago from now */
const minsAgo = (mins: number) =>
  new Date(Date.now() - 1000 * 60 * mins).toISOString();

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message from tenant',
    body: 'Ada Nwosu sent you a message about the plumbing issue in Unit 3B.',
    read: false,
    createdAt: minsAgo(8), // 8 min ago
    link: '/landlords/tenants',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Crypto payment received',
    body: '0.15 ETH rent payment for 12 Akin Adesola St has been confirmed on-chain.',
    read: false,
    createdAt: minsAgo(25), // 25 min ago
    link: '/landlords/financials',
  },
  {
    id: '3',
    type: 'maintenance',
    title: 'Maintenance request updated',
    body: 'The electrician has marked ticket #1042 (power outage) as resolved.',
    read: false,
    createdAt: minsAgo(52), // 52 min ago
    link: '/landlords/maintenance',
  },
  {
    id: '4',
    type: 'message',
    title: 'New inquiry on Lekki Duplex',
    body: 'A prospective tenant is interested in your 4-bedroom listing.',
    read: true,
    createdAt: minsAgo(78), // ~1 hr 18 min ago
    link: '/landlords/properties',
  },
  {
    id: '5',
    type: 'payment',
    title: 'Rent payment overdue',
    body: 'USDC payment for Unit 7A (Chinedu Eze) is 3 days overdue. Wallet has not initiated transfer.',
    read: true,
    createdAt: minsAgo(95), // ~1 hr 35 min ago
    link: '/landlords/financials',
  },
  {
    id: '6',
    type: 'maintenance',
    title: 'New maintenance request',
    body: 'Tenant in Unit 2A reported a leaking roof. Priority: High.',
    read: true,
    createdAt: minsAgo(105), // ~1 hr 45 min ago
    link: '/landlords/maintenance',
  },
  {
    id: '7',
    type: 'message',
    title: 'Agent response received',
    body: 'Your agent Emeka has replied regarding the Victoria Island showing.',
    read: true,
    createdAt: minsAgo(112), // ~1 hr 52 min ago
  },
  {
    id: '8',
    type: 'payment',
    title: 'Crypto payment received',
    body: '500 USDC rent payment for 5 Admiralty Way has been confirmed on-chain.',
    read: true,
    createdAt: minsAgo(118), // ~1 hr 58 min ago
    link: '/landlords/financials',
  },
];
