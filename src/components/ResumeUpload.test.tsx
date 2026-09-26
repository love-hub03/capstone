import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResumeUpload } from './ResumeUpload';
import { TYPE_ERROR } from '../lib/validateResume';

const MB = 1024 * 1024;

const makeFile = (name: string, type: string, sizeBytes = 1024): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

const renderUpload = (onFileSelected = vi.fn()) => {
  const { container } = render(<ResumeUpload onFileSelected={onFileSelected} />);
  return {
    onFileSelected,
    input: screen.getByLabelText(/upload your resume/i),
    zone: container.querySelector('.resume-upload__zone') as HTMLElement,
  };
};

const dropFile = (zone: HTMLElement, file: File) =>
  fireEvent.drop(zone, { dataTransfer: { files: [file], types: ['Files'] } });

describe('ResumeUpload', () => {
  it('renders the empty state', () => {
    const { zone, onFileSelected } = renderUpload();

    expect(screen.getByText(/drag and drop, or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF, DOC, or DOCX/i)).toBeInTheDocument();
    expect(zone).toHaveAttribute('data-state', 'idle');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it('accepts a valid resume and shows its name and size', async () => {
    const { input, zone, onFileSelected } = renderUpload();
    const resume = makeFile('resume.pdf', 'application/pdf', 200 * 1024);

    await userEvent.upload(input, resume);

    expect(screen.getByText('resume.pdf (200 KB)')).toBeInTheDocument();
    expect(zone).toHaveAttribute('data-state', 'success');
    expect(screen.getByRole('button', { name: 'Remove resume.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(onFileSelected).toHaveBeenCalledWith(resume);
  });

  // The native picker filters by `accept`, so a wrong type can only really
  // arrive by being dropped. That is the path this test exercises.
  it('rejects a wrong file type dropped onto the zone', () => {
    const { zone, onFileSelected } = renderUpload();

    dropFile(zone, makeFile('virus.exe', 'application/x-msdownload', 40 * MB));

    expect(screen.getByRole('alert')).toHaveTextContent(TYPE_ERROR);
    expect(zone).toHaveAttribute('data-state', 'error');
    expect(screen.queryByText(/virus\.exe/)).not.toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  // Belt and braces: the component's own guard holds even if `accept` is bypassed.
  it('rejects a wrong file type chosen through the picker', async () => {
    const { input, onFileSelected } = renderUpload();

    await userEvent.upload(input, makeFile('virus.exe', 'application/x-msdownload'), {
      applyAccept: false,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(TYPE_ERROR);
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it('rejects an oversized file with a message naming the limit', async () => {
    const { input, zone, onFileSelected } = renderUpload();

    await userEvent.upload(input, makeFile('resume.pdf', 'application/pdf', 8.2 * MB));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'resume.pdf is 8.2 MB. The maximum size is 5 MB.',
    );
    expect(zone).toHaveAttribute('data-state', 'error');
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it('clears the selection when Remove is clicked', async () => {
    const { input, zone, onFileSelected } = renderUpload();

    await userEvent.upload(input, makeFile('resume.pdf', 'application/pdf', 200 * 1024));
    await userEvent.click(screen.getByRole('button', { name: 'Remove resume.pdf' }));

    expect(screen.queryByText(/resume\.pdf \(/)).not.toBeInTheDocument();
    expect(zone).toHaveAttribute('data-state', 'idle');
    expect(onFileSelected).toHaveBeenLastCalledWith(null);
  });

  it('replaces an error once a valid file arrives', () => {
    const { zone } = renderUpload();

    dropFile(zone, makeFile('virus.exe', 'application/x-msdownload'));
    expect(screen.getByRole('alert')).toHaveTextContent(TYPE_ERROR);

    dropFile(zone, makeFile('resume.pdf', 'application/pdf', 200 * 1024));
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(zone).toHaveAttribute('data-state', 'success');
  });

  it('marks the dragging state while a file is over the zone', () => {
    const { zone } = renderUpload();

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone).toHaveAttribute('data-state', 'dragging');

    fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone).toHaveAttribute('data-state', 'idle');
  });

  describe('accessibility', () => {
    it('associates the input with a real label and keeps it focusable', async () => {
      const { input } = renderUpload();

      expect(input).toHaveAttribute('type', 'file');
      await userEvent.tab();
      expect(input).toHaveFocus();
    });

    it('describes the input with the error region and flags invalid state', () => {
      const { input, zone } = renderUpload();

      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);

      dropFile(zone, makeFile('virus.exe', 'application/x-msdownload'));
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('announces the attached file politely', async () => {
      const { input } = renderUpload();

      await userEvent.upload(input, makeFile('resume.pdf', 'application/pdf', 200 * 1024));

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('resume.pdf attached.');
    });
  });
});
