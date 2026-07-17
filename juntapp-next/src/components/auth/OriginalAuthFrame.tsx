import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';

export default function OriginalAuthFrame({ active, children }: { active: 'login' | 'register'; children: React.ReactNode }) {
  return (
    <div className="auth-overlay active style-swiss">
      <div className="auth-card">
        <Link href="/" className="auth-close-btn" aria-label="Cerrar">×</Link>
        <div className="auth-card-header">
          <BrandMark className="auth-logo" size={64} />
          <h2>Junt<strong>APP</strong></h2>
          <p>Gestión Vecinal Digital</p>
        </div>
        <div className="auth-mode-selector">
          <div className="auth-mode-badge">
            <span className="badge-dot orange" />
            <span>Conectado a Supabase Cloud</span>
          </div>
        </div>
        <div className="auth-tabs">
          <Link href="/login" className={`auth-tab-btn ${active === 'login' ? 'active' : ''}`}>Iniciar Sesión</Link>
          <Link href="/registro" className={`auth-tab-btn ${active === 'register' ? 'active' : ''}`}>Registrarse</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
