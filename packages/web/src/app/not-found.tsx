// Force dynamic rendering - skip static generation for this page
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'Montserrat, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh'
    }}>
      <h1 style={{ 
        fontSize: '6rem', 
        margin: '0',
        color: '#16a34a',
        fontWeight: '700'
      }}>404</h1>
      <h2 style={{ 
        marginTop: '16px',
        color: '#1a1a2e',
        fontSize: '1.5rem'
      }}>Sayfa Bulunamadı</h2>
      <p style={{ 
        color: '#666',
        marginTop: '8px' 
      }}>Aradığınız sayfa mevcut değil.</p>
      <a 
        href="/"
        style={{
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#16a34a',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '500'
        }}
      >
        Ana Sayfaya Dön
      </a>
    </div>
  );
}
