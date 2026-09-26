import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { FileUpload } from '../FileUpload';

function makeFile(name: string, size: number, type = 'application/pdf') {
  const file = new File(['x'.repeat(Math.min(size, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default empty drop zone prompt', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);

    expect(
      screen.getByText('Click or drag files here to upload'),
    ).toBeInTheDocument();
  });

  it('adds a selected file and calls onFilesSelected', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('resume.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(screen.getByText('1 file selected')).toBeInTheDocument();
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.00 KB')).toBeInTheDocument();
  });

  it('rejects files larger than maxSize', () => {
    const onFilesSelected = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} maxSize={1024} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const bigFile = makeFile('huge.pdf', 2048);

    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(screen.queryByText('1 file selected')).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('caps the number of selected files at maxFiles', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} maxFiles={2} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const files = [
      makeFile('a.pdf', 100),
      makeFile('b.pdf', 100),
      makeFile('c.pdf', 100),
    ];

    fireEvent.change(input, { target: { files } });

    expect(onFilesSelected).toHaveBeenCalledWith([files[0], files[1]]);
    expect(screen.getByText('Selected Files (2/2)')).toBeInTheDocument();
  });

  it('removes an individual file', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('resume.pdf', 1024);
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: '' }));

    expect(onFilesSelected).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument();
  });

  it('clears all selected files when Clear All is clicked', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('resume.pdf', 1024)] },
    });

    fireEvent.click(screen.getByText('Clear All'));

    expect(onFilesSelected).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText('Selected Files')).not.toBeInTheDocument();
  });

  it('shows a drag-active style change on drag over and drop', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload onFilesSelected={onFilesSelected} />,
    );

    const dropZone = container.querySelector(
      '.border-2.border-dashed',
    ) as HTMLElement;
    const file = makeFile('dropped.pdf', 512);

    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('border-blue-400');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });
});
