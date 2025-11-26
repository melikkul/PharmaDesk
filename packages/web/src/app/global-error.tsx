'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h2>Bir şeyler yanlış gitti! (Global)</h2>
          <button onClick={() => reset()}>Tekrar Dene</button>
        </div>
      </body>
    </html>
  );
}
