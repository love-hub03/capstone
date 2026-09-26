import { useState } from 'react';
import { ResumeUpload } from './components/ResumeUpload';

export default function App() {
  const [resume, setResume] = useState<File | null>(null);

  return (
    <main
      style={{
        maxWidth: '32rem',
        margin: '4rem auto',
        padding: '0 1rem',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <h1>NextHire</h1>
      <ResumeUpload onFileSelected={setResume} />
      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
        {resume ? `Ready to submit: ${resume.name}` : 'No resume attached yet.'}
      </p>
    </main>
  );
}
