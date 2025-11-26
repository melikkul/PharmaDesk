'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Bir şeyler yanlış gitti!</h2>
      <button
        onClick={() => reset()}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}
