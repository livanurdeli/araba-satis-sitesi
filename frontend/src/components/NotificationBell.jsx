import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Çan Butonu */}
      <button
        type="button"
        onClick={handleToggle}
        className="btn btn-secondary btn-sm"
        style={{
          position: 'relative',
          padding: '7px 10px',
          borderRadius: 'var(--radius-xs)',
          background: isOpen ? 'var(--bg-surface-elevated)' : 'transparent',
          border: '1px solid var(--border-subtle)',
        }}
        title="Bildirimler"
      >
        <Bell size={16} color="var(--text-main)" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: 900,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Açılır Bildirim Çekmecesi */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Başlık */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-surface-elevated)',
          }}>
            <strong style={{ fontSize: '0.85rem' }}>Bildirimler ({notifications.length})</strong>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Tümünü Temizle"
              >
                <Trash2 size={12} /> Temizle
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Henüz yeni bir bildiriminiz yok.
              </div>
            ) : (
              notifications.map(n => {
                const isWon = n.type === 'AUCTION_WON';
                const isPlaced = n.type === 'BID_PLACED';
                const isSeller = n.type === 'NEW_BID_SELLER';
                const isOutbid = n.type === 'OUTBID';

                return (
                  <Link
                    key={n.id}
                    to={n.listing_id ? `/listings/${n.listing_id}` : '#'}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'var(--transition-fast)',
                      background: n.read ? '#ffffff' : isWon ? '#fefce8' : isPlaced ? '#f0fdf4' : isOutbid ? '#fffbeb' : '#faf5ff',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? '#ffffff' : isWon ? '#fefce8' : isPlaced ? '#f0fdf4' : isOutbid ? '#fffbeb' : '#faf5ff'; }}
                  >
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                      {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
