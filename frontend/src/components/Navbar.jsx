import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, User, LogOut, LogIn, Gauge } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(44, 38, 26, 0.04)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
      }}>
        {/* Left: Orijinal Sol Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a1714',
            boxShadow: '0 2px 6px rgba(229, 169, 60, 0.25)',
          }}>
            <Gauge size={20} strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            textTransform: 'lowercase',
          }}>
            otopazar
          </span>
        </Link>

        {/* Center: Ortadaki Araba */}
        <div style={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
          <svg width="48" height="26" viewBox="0 0 64 36" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 24h52v4H6z" />
            <path d="M14 24l5-12h26l5 12" />
            <circle cx="18" cy="26" r="4" fill="#ffffff" stroke="var(--accent-primary)" strokeWidth="2.5" />
            <circle cx="46" cy="26" r="4" fill="#ffffff" stroke="var(--accent-primary)" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Right Menu */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/"
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              transition: 'var(--transition-fast)',
            }}
          >
            İlanlar
          </Link>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/create-listing" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-xs)' }}>
                <Plus size={15} />
                <span>İlan Ver</span>
              </Link>
              
              <Link to="/profile" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-xs)' }}>
                <User size={15} />
                <span>Hesabım</span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                title="Çıkış Yap"
                style={{ padding: '7px 10px', borderRadius: 'var(--radius-xs)' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/login"
                className="btn btn-secondary btn-sm"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  padding: '7px 14px',
                  fontWeight: 700,
                }}
              >
                <LogIn size={15} />
                <span>Giriş Yap</span>
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  padding: '7px 16px',
                  fontWeight: 800,
                  boxShadow: 'none',
                }}
              >
                <span>Kayıt Ol</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
