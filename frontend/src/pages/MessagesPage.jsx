import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageAPI, listingAPI, WS_BASE_URL } from '../api/client';
import {
  MessageSquare,
  Send,
  Search,
  ExternalLink,
  CarFront,
  Clock,
  CheckCheck,
  User,
  Shield,
  ArrowLeft,
  Sparkles,
  Inbox
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const paramListingId = searchParams.get('listing_id') ? Number(searchParams.get('listing_id')) : null;
  const paramOtherUserId = searchParams.get('other_user_id') ? Number(searchParams.get('other_user_id')) : null;

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { listing_id, other_user_id, other_user_name, listing_title, listing_image, listing_status, current_price }
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Otomatik en alta kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Tüm sohbetleri çek
  const fetchConversations = async (selectSpecificListingId, selectSpecificOtherUserId) => {
    try {
      const data = await messageAPI.getConversations();
      setConversations(data || []);

      // Eğer URL'den belirli bir sohbet istenmişse
      const targetListingId = selectSpecificListingId || paramListingId;
      const targetOtherUserId = selectSpecificOtherUserId || paramOtherUserId;

      if (targetListingId) {
        // Mevcut sohbetlerde var mı?
        const existing = (data || []).find(
          c => c.listing_id === targetListingId && (!targetOtherUserId || c.other_user_id === targetOtherUserId)
        );

        if (existing) {
          setActiveConv(existing);
        } else {
          // Henüz mesajlaşılmamış yeni bir sohbet başlatılıyor
          try {
            const listingDetails = await listingAPI.getById(targetListingId);
            const otherId = targetOtherUserId || listingDetails.seller_id;
            const newConv = {
              listing_id: targetListingId,
              listing_title: listingDetails.title,
              listing_image: listingDetails.image_url,
              listing_status: listingDetails.status,
              current_price: listingDetails.current_price,
              other_user_id: otherId,
              other_user_name: listingDetails.seller_name || 'Satıcı',
              last_message: '',
              last_message_time: new Date().toISOString(),
              unread_count: 0,
            };
            setActiveConv(newConv);
          } catch (e) {
            console.error('İlan bilgisi alınamadı:', e);
          }
        }
      } else if (!activeConv && data && data.length > 0) {
        // Varsayılan olarak ilk sohbeti seç
        setActiveConv(data[0]);
      }
    } catch (err) {
      console.error('Sohbetler yüklenemedi:', err);
      setError('Sohbetler yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Aktif sohbet değiştikçe mesajları çek
  useEffect(() => {
    if (!activeConv || !activeConv.listing_id) return;

    let isMounted = true;
    const fetchMsgs = async () => {
      setLoadingMsgs(true);
      setError('');
      try {
        const msgs = await messageAPI.getMessages(activeConv.listing_id, activeConv.other_user_id);
        if (isMounted) {
          setMessages(msgs || []);
          // Sohbet listesindeki okunmamış sayısını sıfırla
          setConversations(prev =>
            prev.map(c =>
              c.listing_id === activeConv.listing_id && c.other_user_id === activeConv.other_user_id
                ? { ...c, unread_count: 0 }
                : c
            )
          );
        }
      } catch (err) {
        if (isMounted) {
          console.error('Mesajlar çekilemedi:', err);
          setError('Mesaj geçmişi yüklenemedi.');
        }
      } finally {
        if (isMounted) setLoadingMsgs(false);
      }
    };

    fetchMsgs();

    return () => {
      isMounted = false;
    };
  }, [activeConv?.listing_id, activeConv?.other_user_id]);

  // 3. Canlı WebSocket Dinleyicisi
  useEffect(() => {
    if (!user || !user.user_id) return;

    const wsUrl = `${WS_BASE_URL}?user_id=${user.user_id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE') {
          const newMsg = data.payload;

          // Eğer gelen mesaj şu an açık olan sohbete aitse
          if (
            activeConv &&
            newMsg.listing_id === activeConv.listing_id &&
            (newMsg.sender_id === activeConv.other_user_id || newMsg.receiver_id === activeConv.other_user_id)
          ) {
            setMessages(prev => {
              // Çift eklemeyi engelle
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          // Sohbetler listesini güncelle
          setConversations(prev => {
            const index = prev.findIndex(
              c =>
                c.listing_id === newMsg.listing_id &&
                (c.other_user_id === newMsg.sender_id || c.other_user_id === newMsg.receiver_id)
            );

            if (index !== -1) {
              const updated = [...prev];
              const isCurrentChat =
                activeConv &&
                activeConv.listing_id === newMsg.listing_id &&
                activeConv.other_user_id === (newMsg.sender_id === user.user_id ? newMsg.receiver_id : newMsg.sender_id);

              updated[index] = {
                ...updated[index],
                last_message: newMsg.content,
                last_message_time: newMsg.created_at,
                unread_count: isCurrentChat || newMsg.sender_id === user.user_id
                  ? updated[index].unread_count
                  : updated[index].unread_count + 1,
              };

              // En üste taşı
              const [item] = updated.splice(index, 1);
              return [item, ...updated];
            } else {
              // Yeni bir sohbet oluşturulduysa listeyi tekrar tazele
              messageAPI.getConversations().then(res => setConversations(res || [])).catch(() => {});
              return prev;
            }
          });
        }
      } catch (e) {
        console.error('WS Mesaj Hatası:', e);
      }
    };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [user?.user_id, activeConv]);

  // 4. Mesaj Gönderme
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeConv || sending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const createdMsg = await messageAPI.sendMessage({
        listing_id: activeConv.listing_id,
        receiver_id: activeConv.other_user_id,
        content: content,
      });

      // Mesajı anında listeye ekle
      setMessages(prev => {
        if (prev.some(m => m.id === createdMsg.id)) return prev;
        return [...prev, createdMsg];
      });

      // Sohbet listesindeki son mesajı güncelle
      setConversations(prev => {
        const index = prev.findIndex(
          c => c.listing_id === activeConv.listing_id && c.other_user_id === activeConv.other_user_id
        );
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            last_message: content,
            last_message_time: createdMsg.created_at || new Date().toISOString(),
          };
          const [item] = updated.splice(index, 1);
          return [item, ...updated];
        } else {
          return [
            {
              ...activeConv,
              last_message: content,
              last_message_time: createdMsg.created_at || new Date().toISOString(),
            },
            ...prev,
          ];
        }
      });
    } catch (err) {
      alert(err.message || 'Mesaj gönderilemedi.');
      setInputMessage(content); // Geri yükle
    } finally {
      setSending(false);
    }
  };

  // Hızlı Hazır Cevap Seçimi
  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
  };

  // Sohbet Seçimi
  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    setSearchParams({ listing_id: conv.listing_id, other_user_id: conv.other_user_id });
  };

  // Filtrelenmiş Sohbetler
  const filteredConversations = conversations.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.listing_title?.toLowerCase().includes(q) ||
      c.other_user_name?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  // Tarih Formatlayıcı
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Fotoğraf çözücü
  const getThumbnail = (imageUrl) => {
    if (!imageUrl) return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300';
    if (imageUrl.startsWith('[') || imageUrl.startsWith('{')) {
      try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch (e) {}
    }
    return imageUrl;
  };

  return (
    <div className="page-wrapper" style={{ padding: '20px 0', background: 'var(--bg-main)' }}>
      <div className="container">
        {/* Messages Card Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          minHeight: '720px',
          height: 'calc(100vh - 140px)',
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}>

          {/* LEFT PANEL: Conversations Sidebar */}
          <div style={{
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: '#ffffff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} color="var(--accent-primary)" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Mesajlarım</h2>
                </div>
                <span className="badge badge-tag" style={{ fontSize: '0.75rem' }}>
                  {conversations.length} Sohbet
                </span>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="İlan veya kişi ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {loadingConvs ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                  Sohbetler yükleniyor...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-subtle)' }}>
                  <Inbox size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Henüz mesajınız yok</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>İlan sayfalarından satıcılara mesaj göndererek sohbet başlatabilirsiniz.</p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = activeConv && activeConv.listing_id === c.listing_id && activeConv.other_user_id === c.other_user_id;
                  const thumb = getThumbnail(c.listing_image);

                  return (
                    <div
                      key={`${c.listing_id}-${c.other_user_id}`}
                      onClick={() => handleSelectConv(c)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        gap: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#ffffff' : 'transparent',
                        borderLeft: isSelected ? '4px solid var(--accent-primary)' : '4px solid transparent',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Vehicle Thumbnail */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--bg-surface-elevated)',
                        position: 'relative',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        <img
                          src={thumb}
                          alt={c.listing_title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Content Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: isSelected || c.unread_count > 0 ? 800 : 700,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {c.other_user_name || 'Kullanıcı'}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', flexShrink: 0, marginLeft: '6px' }}>
                            {formatTime(c.last_message_time)}
                          </span>
                        </div>

                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '4px',
                        }}>
                          🚗 {c.listing_title}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{
                            fontSize: '0.8rem',
                            color: c.unread_count > 0 ? 'var(--text-main)' : 'var(--text-subtle)',
                            fontWeight: c.unread_count > 0 ? 700 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            margin: 0,
                          }}>
                            {c.last_message || 'Yeni sohbet'}
                          </p>

                          {c.unread_count > 0 && (
                            <span style={{
                              background: '#ef4444',
                              color: '#ffffff',
                              borderRadius: '10px',
                              padding: '1px 7px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              flexShrink: 0,
                              marginLeft: '8px',
                            }}>
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Active Chat Room */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
            {activeConv ? (
              <>
                {/* Chat Top Banner */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      color: '#1a1714',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}>
                      {activeConv.other_user_name ? activeConv.other_user_name[0].toUpperCase() : 'U'}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{activeConv.other_user_name}</span>
                        <span className="badge badge-tag" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                          Muhatap #{activeConv.other_user_id}
                        </span>
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                        <span>Canlı Bağlantı Aktif</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Quick Summary Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <img
                        src={getThumbnail(activeConv.listing_image)}
                        alt={activeConv.listing_title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ minWidth: 0, maxWidth: '240px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeConv.listing_title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                        {activeConv.current_price ? `${Number(activeConv.current_price).toLocaleString('tr-TR')} ₺` : 'İlan'}
                      </span>
                    </div>
                    <Link
                      to={`/listings/${activeConv.listing_id}`}
                      target="_blank"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                      title="İlanı Yeni Sekmede Aç"
                    >
                      <span>İlana Git</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* Message Flow Body */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  {loadingMsgs ? (
                    <div style={{ margin: 'auto', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                      Mesajlar yükleniyor...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{
                      margin: 'auto',
                      textAlign: 'center',
                      maxWidth: '400px',
                      padding: '30px 20px',
                      background: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-subtle)',
                    }}>
                      <Sparkles size={32} color="var(--accent-primary)" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>
                        Sohbete İlk Mesajı Gönderin
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '16px' }}>
                        Bu araç hakkında sormak istediğiniz soruları veya teklif detaylarını aşağıdan satıcıya iletebilirsiniz.
                      </p>
                      
                      {/* Quick Chips */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[
                          'Merhaba, araç hakkında detaylı bilgi alabilir miyim?',
                          'Ekspertiz raporu veya tramer kaydı mevcut mu?',
                          'Aracı ne zaman yerinde görebilirim?',
                        ].map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickPrompt(prompt)}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'var(--text-main)',
                              transition: 'var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                          >
                            💬 "{prompt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.sender_id === user?.user_id;

                      return (
                        <div
                          key={m.id || idx}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {!isMe && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginBottom: '3px', marginLeft: '6px', fontWeight: 600 }}>
                              {m.sender_name || activeConv.other_user_name}
                            </span>
                          )}

                          <div
                            style={{
                              maxWidth: '70%',
                              padding: '10px 14px',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              background: isMe ? '#1e293b' : '#ffffff',
                              color: isMe ? '#ffffff' : 'var(--text-main)',
                              boxShadow: isMe ? '0 2px 6px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
                              border: isMe ? 'none' : '1px solid var(--border-subtle)',
                              fontSize: '0.9rem',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {m.content}

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              fontSize: '0.68rem',
                              color: isMe ? '#94a3b8' : '#94a3b8',
                              marginTop: '4px',
                            }}>
                              <span>{formatTime(m.created_at)}</span>
                              {isMe && <CheckCheck size={13} color={m.is_read ? '#38bdf8' : '#94a3b8'} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div style={{
                  padding: '16px 20px',
                  background: '#ffffff',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  {/* Quick Prompts Bar */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {[
                      'Ekspertiz var mı?',
                      'Pazarlık payı var mı?',
                      'Takas düşünüyor musunuz?',
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(chip)}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '14px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Mesajınızı yazın... (Göndermek için Enter'a basın)"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={sending}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: 'var(--bg-surface-elevated)',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                    />

                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || sending}
                      className="btn btn-primary"
                      style={{
                        padding: '12px 18px',
                        borderRadius: 'var(--radius-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: !inputMessage.trim() || sending ? 0.6 : 1,
                      }}
                    >
                      <span>Gönder</span>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-subtle)',
              }}>
                <MessageSquare size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px', opacity: 0.7 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Sohbet Başlatın veya Bir Görüşme Seçin
                </h3>
                <p style={{ fontSize: '0.875rem', marginTop: '6px', maxWidth: '360px' }}>
                  Sol menüden bir konuşmaya tıklayarak mesaj geçmişini görüntüleyebilir veya araç ilanları üzerinden satıcılara doğrudan mesaj atabilirsiniz.
                </p>
                <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: '16px' }}>
                  <CarFront size={15} />
                  <span>İlanları İncele</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
