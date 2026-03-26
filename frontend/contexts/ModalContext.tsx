'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ModalType =
  | 'propertyAgreement'
  | 'dispute'
  | 'disputeResolution'
  | 'payment'
  | 'refund'
  | 'userManagement'
  | 'documentViewer'
  | 'documentUpload'
  | 'documentList'
  | null;

interface ModalState {
  type: ModalType;
  data?: Record<string, unknown>;
  isOpen: boolean;
}

interface ModalContextType {
  modalState: ModalState;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  updateModalData: (data: Record<string, unknown>) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    data: undefined,
    isOpen: false,
  });

  const openModal = useCallback(
    (type: ModalType, data?: Record<string, unknown>) => {
      setModalState({
        type,
        data,
        isOpen: true,
      });
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModalState({
      type: null,
      data: undefined,
      isOpen: false,
    });
  }, []);

  const updateModalData = useCallback((data: Record<string, unknown>) => {
    setModalState((prev) => ({
      ...prev,
      data: { ...prev.data, ...data },
    }));
  }, []);

  return (
    <ModalContext.Provider
      value={{ modalState, openModal, closeModal, updateModalData }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
