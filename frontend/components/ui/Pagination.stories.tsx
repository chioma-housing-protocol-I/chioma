'use client';

import React, { useState } from 'react';
import { Pagination } from './Pagination';

const meta = {
  title: 'Utilities/Pagination',
  component: Pagination,
};

export default meta;

export const Basic = () => {
  const [page, setPage] = useState(1);
  return (
    <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
  );
};

export const LargePageSet = () => {
  const [page, setPage] = useState(10);
  return (
    <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
  );
};
