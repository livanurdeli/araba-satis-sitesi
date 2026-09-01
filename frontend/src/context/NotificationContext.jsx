import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { userAPI, WS_BASE_URL } from '../api/client';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
            const listId = Number(bid.listing_id || 0);
            if (!listId) return;

            // 1. Kazanılan İhale Kontrolü
            if (isEnded && isTopBid) {
              const notifId = `won-${listId}`;
              const exists = updated.some(n => n.id === notifId || (n.listing_id === listId && n.type === 'AUCTION_WON'));

              if (!exists) {
                const wonNotif = {
                  id: notifId,
                  type: 'AUCTION_WON',
                  title: '🎉 Açık Artırmayı Kazandınız!',
                  message: `Tebrikler! "${bid.listing_title || 'Araç'}" ihalesini ${Number(bid.my_bid_amount).toLocaleString('tr-TR')} ₺ teklifinizle kazandınız.`,
                  listing_id: listId,
                  created_at: bid.bid_created_at || new Date().toISOString(),
                  read: false,
                };
                updated.unshift(wonNotif);
                hasNewWon = true;
              }
            }

            // 2. Geçilen Teklif Kontrolü (Canlı İlanda)
            if (!isEnded && !isTopBid) {
              const outbidId = `outbid-${listId}-${bid.current_price}`;
              const exists = updated.some(n => n.id === outbidId);

              if (!exists) {
                const outbidNotif = {
                  id: outbidId,
                  type: 'OUTBID',
                  title: '⚠️ Teklifiniz Geçildi!',
                  message: `"${bid.listing_title || 'Araç'}" ilanında yeni en yüksek teklif: ${Number(bid.current_price).toLocaleString('tr-TR')} ₺`,
                  listing_id: listId,
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
              showToast(latest.title, latest.message, latest.listing_id);
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

  // WebSocket Canlı Akış Bağlantısını Yönet (Otomatik Yeniden Bağlanma Destekli)
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isSubscribed = true;

    const connectWS = () => {
      if (!isSubscribed) return;
      const wsUrl = `${WS_BASE_URL}?user_id=${user?.user_id || 0}`;
      ws = new WebSocket(wsUrl);
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
            showToast(newNotif.title, newNotif.message, listId);
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
            showToast(newNotif.title, newNotif.message, listId);
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
            showToast(newNotif.title, newNotif.message, listId);
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
              showToast(newNotif.title, newNotif.message, listId);
            }
          }
        } catch (err) {
          console.error('WS Mesaj Hatası:', err);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectWS, 2000);
        }
      };

      ws.onerror = () => {
        if (ws && ws.readyState === 1) ws.close();
      };
    };

    connectWS();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) {
        ws.close();
      }
    };
  }, [user]);

  const showToast = (title, message, listing_id) => {
    setToast({ title, message, listing_id });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const addNotification = (notif) => {
    const listId = Number(notif.listing_id || 0);
    const fullNotif = {
      id: notif.id || Date.now(),
      type: notif.type || 'SYSTEM',
      title: notif.title || 'Bildirim',
      message: notif.message || '',
      listing_id: listId,
      created_at: notif.created_at || new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [fullNotif, ...prev]);
    if (notif.showToast !== false) {
      showToast(fullNotif.title, fullNotif.message, listId);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('otopazar_notifications');
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
        <div 
          className="notification-toast"
          onClick={() => {
            if (toast.listing_id) {
              navigate(`/listings/${toast.listing_id}`);
              setToast(null);
            }
          }}
          style={{
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
            cursor: toast.listing_id ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <strong style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '3px' }}>
              {toast.title}
            </strong>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            {toast.message}
          </p>
          {toast.listing_id && (
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: 600 }}>
              İlanı incelemek için tıklayın →
            </span>
          )}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
