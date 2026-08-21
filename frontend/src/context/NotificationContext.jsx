import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('otopazar_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState(null);
  const wsRef = useRef(null);

  // Bildirimleri kaydet
  useEffect(() => {
    localStorage.setItem('otopazar_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // WebSocket Bağlantısını Yönet
  useEffect(() => {
    const wsUrl = `ws://localhost:8080/ws?user_id=${user?.user_id || 0}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('⚡ WebSocket Canlı Akış Bağlandı');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'OUTBID') {
          const newNotif = {
            id: Date.now(),
            type: 'OUTBID',
            title: '⚠️ Teklifiniz Geçildi!',
            message: `İzlediğiniz ilanda yeni en yüksek teklif: ${Number(data.payload.new_amount).toLocaleString('tr-TR')} ₺`,
            listing_id: data.payload.listing_id,
            created_at: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev]);
          showToast(newNotif.title, newNotif.message);
        } else if (data.type === 'AUCTION_ENDED') {
          if (user && data.payload.winner_id === user.user_id) {
            const newNotif = {
              id: Date.now(),
              type: 'AUCTION_WON',
              title: '🎉 Açık Artırmayı Kazandınız!',
              message: `Tebrikler! ${Number(data.payload.final_price).toLocaleString('tr-TR')} ₺ teklifinizle ihaleyi kazandınız.`,
              listing_id: data.payload.listing_id,
              created_at: new Date().toISOString(),
              read: false,
            };

            setNotifications(prev => [newNotif, ...prev]);
            showToast(newNotif.title, newNotif.message);
          }
        }
      } catch (err) {
        console.error('WS Mesaj Hatası:', err);
      }
    };

    ws.onerror = () => {};

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [user]);

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllAsRead,
      clearNotifications,
      showToast,
    }}>
      {children}

      {/* Ekranın Sağ Üstündeki Canlı Toast Bildirimi */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
          background: '#ffffff',
          border: '1px solid var(--border-strong)',
          borderLeft: '4px solid var(--accent-primary)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          maxWidth: '340px',
          animation: 'slideIn 0.3s ease',
        }}>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
            {toast.title}
          </strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            {toast.message}
          </p>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
