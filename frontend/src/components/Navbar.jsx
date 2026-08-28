import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, User, LogOut, LogIn, Gauge, MessageSquare } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { messageAPI, WS_BASE_URL } from '../api/client';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await messageAPI.getUnreadCount();
      setUnreadMsgCount(res.unread_count || 0);
    } catch (e) {
      // sessizce geç
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Sayfa değiştikçe (özellikle /messages sayfasına girip çıkınca) unread sayısını yenile
  }, [isAuthenticated, location.pathname]);

  // WebSocket üzerinden yeni mesaj bildirimi dinleme
  useEffect(() => {
    if (!user || !user.user_id) return;

    const wsUrl = `${WS_BASE_URL}?user_id=${user.user_id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE') {
          if (data.payload.receiver_id === user.user_id && location.pathname !== '/messages') {
            setUnreadMsgCount(prev => prev + 1);
          }
        }
      } catch (e) {}
    };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [user?.user_id, location.pathname]);

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

        {/* Center: Ortadaki Araba (Mobilde gizlenir) */}
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
          <svg width="48" height="26" viewBox="0 0 64 36" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 24h52v4H6z" />
            <path d="M14 24l5-12h26l5 12" />
            <circle cx="18" cy="26" r="4" fill="#ffffff" stroke="var(--accent-primary)" strokeWidth="2.5" />
            <circle cx="46" cy="26" r="4" fill="#ffffff" stroke="var(--accent-primary)" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Right Menu */}
        <nav className="navbar-mobile-nav" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/"
            className="hide-on-mobile"
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
            <div className="navbar-mobile-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Mesajlar Butonu */}
              <Link
                to="/messages"
                className="btn btn-secondary btn-sm navbar-mobile-btn"
                style={{
                  position: 'relative',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Mesajlarım"
              >
                <MessageSquare size={16} />
                <span className="hide-text-on-mobile">Mesajlar</span>
                {unreadMsgCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '10px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 0 0 2px #ffffff',
                  }}>
                    {unreadMsgCount}
                  </span>
                )}
              </Link>

              <NotificationBell />

              <Link
                to="/create-listing"
                className="btn btn-primary btn-sm navbar-mobile-btn"
                style={{ borderRadius: 'var(--radius-xs)' }}
                title="İlan Ver"
              >
                <Plus size={15} />
                <span className="hide-text-on-mobile">İlan Ver</span>
              </Link>
              
              <Link
                to="/profile"
                className="btn btn-secondary btn-sm navbar-mobile-btn"
                style={{ borderRadius: 'var(--radius-xs)' }}
                title="Hesabım"
              >
                <User size={15} />
                <span className="hide-text-on-mobile">Hesabım</span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm navbar-mobile-btn"
                title="Çıkış Yap"
                style={{ padding: '7px 10px', borderRadius: 'var(--radius-xs)' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="navbar-mobile-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/login"
                className="btn btn-secondary btn-sm navbar-mobile-btn"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  padding: '7px 12px',
                  fontWeight: 700,
                }}
              >
                <LogIn size={15} />
                <span>Giriş Yap</span>
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-sm navbar-mobile-btn"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  padding: '7px 14px',
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
