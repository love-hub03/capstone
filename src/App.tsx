import { FileUpload } from './components/FileUpload';
import type { UploadContext } from './components/FileUpload';

/**
 * Stand-in for a real upload. Replace the body with an XMLHttpRequest (for
 * progress events) or `fetch` against your own endpoint.
 */
async function uploadFile(file: File, { onProgress, signal }: UploadContext): Promise<void> {
  for (let percent = 0; percent <= 100; percent += 10) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    onProgress(percent);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  console.info(`Uploaded ${file.name}`);
}

export default function App() {
  return (
    <main style={{ maxWidth: '32rem', margin: '4rem auto', padding: '0 1rem' }}>
      <h1>File upload</h1>
      <FileUpload
        accept="image/*,.pdf"
        maxSizeMb={10}
        multiple
        onUpload={uploadFile}
        onFilesAccepted={(files) => console.info('Accepted', files.map((f) => f.name))}
      />
    </main>
  );
}
