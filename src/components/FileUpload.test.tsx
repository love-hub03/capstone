import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUpload } from './FileUpload';

const makeFile = (name: string, type: string, sizeBytes = 8): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

const picker = () => screen.getByLabelText(/drag and drop/i);

describe('FileUpload', () => {
  it('renders the prompt and constraint hint', () => {
    render(<FileUpload accept="image/*" maxSizeMb={5} />);
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/image\/\*.*5 MB/)).toBeInTheDocument();
  });

  it('uploads an accepted file and reports progress', async () => {
    const onUpload = vi.fn(async (_file: File, ctx: { onProgress: (n: number) => void }) => {
      ctx.onProgress(50);
    });

    render(<FileUpload accept="image/*" maxSizeMb={5} onUpload={onUpload} />);
    await userEvent.upload(picker(), makeFile('photo.png', 'image/png'));

    expect(onUpload).toHaveBeenCalledOnce();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Uploaded')).toBeInTheDocument());
  });

  it('rejects a file over the size limit without uploading', async () => {
    const onUpload = vi.fn();

    render(<FileUpload maxSizeMb={1} onUpload={onUpload} />);
    await userEvent.upload(picker(), makeFile('big.png', 'image/png', 5 * 1024 * 1024));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(onUpload).not.toHaveBeenCalled();
  });

  // The file picker filters by `accept` on its own, so a disallowed type can
  // only reach the component by being dropped on it.
  it('rejects a disallowed file type dropped onto the zone', async () => {
    const onUpload = vi.fn();

    render(<FileUpload accept="image/*" onUpload={onUpload} />);
    const zone = screen.getByRole('button', { name: /drag and drop/i });
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('notes.txt', 'text/plain')], types: ['Files'] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed/i);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('uploads a valid dropped file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);

    render(<FileUpload accept="image/*" onUpload={onUpload} />);
    const zone = screen.getByRole('button', { name: /drag and drop/i });
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('photo.png', 'image/png')], types: ['Files'] },
    });

    await waitFor(() => expect(screen.getByText('Uploaded')).toBeInTheDocument());
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it('surfaces an upload failure', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Network down'));

    render(<FileUpload onUpload={onUpload} />);
    await userEvent.upload(picker(), makeFile('photo.png', 'image/png'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });

  it('replaces the selection in single-file mode', async () => {
    render(<FileUpload />);

    await userEvent.upload(picker(), makeFile('first.png', 'image/png'));
    await userEvent.upload(picker(), makeFile('second.png', 'image/png'));

    expect(screen.queryByText('first.png')).not.toBeInTheDocument();
    expect(screen.getByText('second.png')).toBeInTheDocument();
  });

  it('keeps every file in multiple mode and removes one on request', async () => {
    render(<FileUpload multiple />);

    await userEvent.upload(picker(), [
      makeFile('a.png', 'image/png'),
      makeFile('b.png', 'image/png'),
    ]);
    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(screen.queryByText('a.png')).not.toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('does not open the picker when disabled', async () => {
    const onUpload = vi.fn();
    render(<FileUpload disabled onUpload={onUpload} />);

    expect(screen.getByRole('button', { name: /drag and drop/i })).toBeDisabled();
    expect(onUpload).not.toHaveBeenCalled();
  });
});
