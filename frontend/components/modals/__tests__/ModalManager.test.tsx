import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const modalContextMock = vi.hoisted(() => ({
  modalState: { type: null, data: undefined, isOpen: false } as {
    type: string | null;
    data?: Record<string, unknown>;
    isOpen: boolean;
  },
  closeModal: vi.fn(),
  openModal: vi.fn(),
}));

vi.mock('@/contexts/ModalContext', () => ({
  useModal: () => modalContextMock,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}));

// Every modal is dynamically imported via next/dynamic. Mock next/dynamic to
// resolve synchronously to a lightweight stand-in so we can assert which
// modal type ModalManager renders for a given modal state, without pulling
// in each real (and heavy) modal implementation.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    const Component = (props: Record<string, unknown>) => {
      const [Loaded, setLoaded] = React.useState<React.ComponentType<
        Record<string, unknown>
      > | null>(null);

      React.useEffect(() => {
        let active = true;
        loader().then((mod) => {
          if (!active) return;
          const resolved =
            (mod as { default?: React.ComponentType<Record<string, unknown>> })
              .default ?? (mod as React.ComponentType<Record<string, unknown>>);
          setLoaded(() => resolved);
        });
        return () => {
          active = false;
        };
      }, []);

      if (!Loaded) return null;
      return React.createElement(Loaded, props);
    };
    return Component;
  },
}));

vi.mock('@/components/documents', () => ({
  DocumentListModal: (props: { isOpen: boolean }) =>
    props.isOpen
      ? React.createElement('div', null, 'stub:DocumentListModal')
      : null,
  DocumentUploadModal: (props: { isOpen: boolean }) =>
    props.isOpen
      ? React.createElement('div', null, 'stub:DocumentUploadModal')
      : null,
  DocumentViewerModal: (props: { document: unknown }) =>
    props.document
      ? React.createElement('div', null, 'stub:DocumentViewerModal')
      : null,
}));

vi.mock('@/components/properties/PropertyDetailModal', () => ({
  PropertyDetailModal: (props: { isOpen: boolean }) =>
    props.isOpen
      ? React.createElement('div', null, 'stub:PropertyDetailModal')
      : null,
}));

vi.mock('@/components/properties/PropertyInquiryModal', () => ({
  PropertyInquiryModal: (props: { isOpen: boolean }) =>
    props.isOpen
      ? React.createElement('div', null, 'stub:PropertyInquiryModal')
      : null,
}));

vi.mock('@/components/payments/PaymentModal', () => ({
  PaymentModal: (props: { isOpen: boolean }) =>
    props.isOpen ? React.createElement('div', null, 'stub:PaymentModal') : null,
}));

vi.mock('../UserManagementModal', () => ({
  UserManagementModal: (props: { isOpen: boolean }) =>
    props.isOpen
      ? React.createElement('div', null, 'stub:UserManagementModal')
      : null,
}));

import { ModalManager } from '../ModalManager';

describe('ModalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalContextMock.modalState = {
      type: null,
      data: undefined,
      isOpen: false,
    };
  });

  it('renders nothing when no modal is open', () => {
    const { container } = render(React.createElement(ModalManager));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isOpen is true but type is null', () => {
    modalContextMock.modalState = { type: null, isOpen: true };
    const { container } = render(React.createElement(ModalManager));
    expect(container.firstChild).toBeNull();
  });

  it('renders the document list modal for the "documentList" type', async () => {
    modalContextMock.modalState = {
      type: 'documentList',
      isOpen: true,
      data: { documents: [] },
    };
    render(React.createElement(ModalManager));
    expect(
      await screen.findByText('stub:DocumentListModal'),
    ).toBeInTheDocument();
  });

  it('renders the property detail modal for the "propertyDetail" type', async () => {
    modalContextMock.modalState = {
      type: 'propertyDetail',
      isOpen: true,
      data: { property: { id: 'prop-1' } },
    };
    render(React.createElement(ModalManager));
    expect(
      await screen.findByText('stub:PropertyDetailModal'),
    ).toBeInTheDocument();
  });

  it('renders the payment modal for the "payment" type', async () => {
    modalContextMock.modalState = {
      type: 'payment',
      isOpen: true,
      data: { agreementId: 'agr-1', amount: 1000 },
    };
    render(React.createElement(ModalManager));
    expect(await screen.findByText('stub:PaymentModal')).toBeInTheDocument();
  });

  it('renders the user management modal for the "userManagement" type', async () => {
    modalContextMock.modalState = {
      type: 'userManagement',
      isOpen: true,
      data: { mode: 'edit' },
    };
    render(React.createElement(ModalManager));
    expect(
      await screen.findByText('stub:UserManagementModal'),
    ).toBeInTheDocument();
  });

  it('renders nothing for an unrecognized modal type', () => {
    modalContextMock.modalState = {
      // Cast through unknown: exercising the switch statement's default
      // branch for a type outside the known ModalType union.
      type: 'somethingUnknown' as unknown as null,
      isOpen: true,
    };
    const { container } = render(React.createElement(ModalManager));
    expect(container.firstChild).toBeNull();
  });
});
