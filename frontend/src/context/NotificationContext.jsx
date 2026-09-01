import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { userAPI, WS_BASE_URL } from '../api/client';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
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

  // Bildirimleri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('otopazar_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Oturum açıldığında kullanıcının kazanılan veya geçilen tekliflerini kontrol edip bildirim üret
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const syncUserBidsAndNotifications = async () => {
      try {
        const myBids = await userAPI.getMyBids();
        if (!Array.isArray(myBids)) return;

        setNotifications(prevNotifications => {
          const updated = [...prevNotifications];
          let hasNewWon = false;

          myBids.forEach(bid => {
            const isEnded = bid.listing_status === 'ended';
            const isTopBid = Number(bid.my_bid_amount) >= Number(bid.current_price);

            // 1. Kazanılan İhale Kontrolü
            if (isEnded && isTopBid) {
              const notifId = `won-${bid.listing_id}`;
              const exists = updated.some(n => n.id === notifId || (n.listing_id === bid.listing_id && n.type === 'AUCTION_WON'));

              if (!exists) {
                const wonNotif = {
                  id: notifId,
                  type: 'AUCTION_WON',
                  title: '🎉 Açık Artırmayı Kazandınız!',
                  message: `Tebrikler! "${bid.listing_title || 'Araç'}" ihalesini ${Number(bid.my_bid_amount).toLocaleString('tr-TR')} ₺ teklifinizle kazandınız.`,
                  listing_id: bid.listing_id,
                  created_at: bid.bid_created_at || new Date().toISOString(),
                  read: false,
                };
                updated.unshift(wonNotif);
                hasNewWon = true;
              }
            }

            // 2. Geçilen Teklif Kontrolü (Canlı İlanda)
            if (!isEnded && !isTopBid) {
              const outbidId = `outbid-${bid.listing_id}-${bid.current_price}`;
              const exists = updated.some(n => n.id === outbidId);

              if (!exists) {
                const outbidNotif = {
                  id: outbidId,
                  type: 'OUTBID',
                  title: '⚠️ Teklifiniz Geçildi!',
                  message: `"${bid.listing_title || 'Araç'}" ilanında yeni en yüksek teklif: ${Number(bid.current_price).toLocaleString('tr-TR')} ₺`,
                  listing_id: bid.listing_id,
                  created_at: new Date().toISOString(),
                  read: false,
                };
                updated.unshift(outbidNotif);
              }
            }
          });

          if (hasNewWon && updated.length > 0) {
            const latest = updated[0];
            if (latest.type === 'AUCTION_WON') {
              showToast(latest.title, latest.message);
            }
          }

          return updated;
        });
      } catch (e) {
        console.error('Bildirim senkronizasyon hatası:', e);
      }
    };

    syncUserBidsAndNotifications();
  }, [isAuthenticated, user]);

  // WebSocket Canlı Akış Bağlantısını Yönet
  useEffect(() => {
    const wsUrl = `${WS_BASE_URL}?user_id=${user?.user_id || 0}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('⚡ WebSocket Canlı Bildirim Akışı Bağlandı');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'BID_PLACED') {
          const listId = Number(data.listing_id || data.payload?.listing_id || 0);
          const newNotif = {
            id: Date.now(),
            type: 'BID_PLACED',
            title: '✅ Teklifiniz Alındı!',
            message: `"${data.payload?.listing_title || 'İlan'}" için ${Number(data.payload?.amount || 0).toLocaleString('tr-TR')} ₺ teklifiniz başarıyla sisteme işlendi.`,
            listing_id: listId,
            created_at: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev]);
          showToast(newNotif.title, newNotif.message);
        } else if (data.type === 'NEW_BID_SELLER') {
          const listId = Number(data.listing_id || data.payload?.listing_id || 0);
          const newNotif = {
            id: Date.now(),
            type: 'NEW_BID_SELLER',
            title: '🔔 İlanınıza Yeni Teklif!',
            message: `"${data.payload?.listing_title || 'İlan'}" ilanınıza ${data.payload?.bidder_name || 'Bir alıcı'} tarafından ${Number(data.payload?.amount || 0).toLocaleString('tr-TR')} ₺ teklif verildi.`,
            listing_id: listId,
            created_at: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev]);
          showToast(newNotif.title, newNotif.message);
        } else if (data.type === 'OUTBID') {
          const listId = Number(data.listing_id || data.payload?.listing_id || 0);
          const newNotif = {
            id: Date.now(),
            type: 'OUTBID',
            title: '⚠️ Teklifiniz Geçildi!',
            message: `"${data.payload?.listing_title || 'İzlediğiniz ilan'}" için yeni en yüksek teklif: ${Number(data.payload?.new_amount || 0).toLocaleString('tr-TR')} ₺`,
            listing_id: listId,
            created_at: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev]);
          showToast(newNotif.title, newNotif.message);
        } else if (data.type === 'AUCTION_ENDED') {
          const listId = Number(data.listing_id || data.payload?.listing_id || 0);
          if (user && data.payload?.winner_id === user.user_id) {
            const newNotif = {
              id: `won-${listId}`,
              type: 'AUCTION_WON',
              title: '🎉 Açık Artırmayı Kazandınız!',
              message: `Tebrikler! "${data.payload?.listing_title || 'Araç'}" ihalesini ${Number(data.payload?.final_price || 0).toLocaleString('tr-TR')} ₺ teklifinizle kazandınız.`,
              listing_id: listId,
              created_at: new Date().toISOString(),
              read: false,
            };

            setNotifications(prev => {
              const filtered = prev.filter(n => n.id !== newNotif.id);
              return [newNotif, ...filtered];
            });
            showToast(newNotif.title, newNotif.message);
          }
        }
      } catch (err) {
        console.error('WS Mesaj Hatası:', err);
      }
    };

    ws.onerror = () => { };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [user]);

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const addNotification = (notif) => {
    const fullNotif = {
      id: notif.id || Date.now(),
      type: notif.type || 'SYSTEM',
      title: notif.title || 'Bildirim',
      message: notif.message || '',
      listing_id: notif.listing_id,
      created_at: notif.created_at || new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [fullNotif, ...prev]);
    if (notif.showToast !== false) {
      showToast(fullNotif.title, fullNotif.message);
    }
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
      addNotification,
    }}>
      {children}

      {/* Ekranın Sağ Üstündeki Canlı Toast Bildirimi */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '74px',
          right: '16px',
          zIndex: 9999,
          background: '#ffffff',
          border: '1px solid var(--border-strong)',
          borderLeft: '4px solid var(--accent-primary)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          maxWidth: 'calc(100vw - 32px)',
          width: '340px',
          animation: 'slideIn 0.3s ease',
        }}>
          <strong style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '3px' }}>
            {toast.title}
          </strong>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
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
