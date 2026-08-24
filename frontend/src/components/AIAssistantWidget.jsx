import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { agentAPI } from '../api/client';
import {
  Sparkles,
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  CarFront,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Zap,
  MessageSquare
} from 'lucide-react';

export default function AIAssistantWidget() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Merhaba! Ben **otopazar Yapay Zeka Danışmanı** 🚗\n\nSize bütçenize uygun araç bulma, açık artırma tüyoları ve ekspertiz kontrol noktaları konusunda yardımcı olabilirim. Nasıl yardımcı olabilirim?',
      suggestions: [
        '1.000.000 ₺ altı araçları göster',
        'BMW açık artırmaları var mı?',
        'Ekspertizde nelere dikkat etmeliyim?',
        'Nasıl teklif vermeliyim?',
      ],
      recommendations: [],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Mevcut sayfadaki ilan ID'sini tespit et (varsa)
  const currentListingId = location.pathname.startsWith('/listings/')
    ? Number(location.pathname.split('/')[2])
    : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    // Kullanıcı mesajını ekle
    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await agentAPI.chat({
        message: text,
        listing_id: currentListingId || 0,
      });

      const agentMsg = {
        sender: 'agent',
        text: res.reply || 'Cevap alınamadı.',
        suggestions: res.suggestions || [],
        recommendations: res.recommendations || [],
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: 'Üzgünüm, yanıt oluştururken bir sorun oluştu. Lütfen tekrar deneyin.',
          suggestions: ['Bütçeme uygun araç öner', 'Canlı açık artırmalar'],
          recommendations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Basit Markdown biçimlendirici (kalın yazılar ve liste maddeleri için)
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return lines.map((line, idx) => {
      let content = line;
      // **kalın** etiketlerini parse et
      const parts = content.split(/(\*\*.*?\*\*)/g);

      return (
        <div key={idx} style={{ minHeight: line.trim() === '' ? '8px' : 'auto', marginBottom: '3px' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* 1. Yüzen Başlatıcı Buton (Floating Trigger) */}
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Dikkat Çekici Rozet */}
          <div
            onClick={() => setIsOpen(true)}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: '8px 14px',
              borderRadius: '999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.16)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }}
            />
            <span>OtoDanışman AI</span>
            <Sparkles size={14} color="#d97706" />
          </div>

          {/* Ana Yuvarlak İkon Butonu */}
          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(217, 119, 6, 0.4)',
              transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(217, 119, 6, 0.55)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(217, 119, 6, 0.4)';
            }}
            title="Yapay Zeka Danışmanına Sor"
          >
            <Bot size={28} />
          </button>
        </div>
      )}

      {/* 2. Açılır Canlı Asistan Sohbet Penceresi */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '540px',
            maxHeight: 'calc(100vh - 48px)',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Başlık Alanı (Header) */}
          <div
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(217, 119, 6, 0.2)',
                  border: '1px solid rgba(217, 119, 6, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    OtoDanışman AI
                  </h4>
                  <span
                    style={{
                      background: '#d97706',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Canlı
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.725rem', color: '#a8a29e' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span>Akıllı Araç & Açık Artırma Danışmanı</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sohbet Mesajları Akış Alanı */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'var(--bg-surface-soft)',
            }}
          >
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* Mesaj Baloncuğu */}
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '12px 14px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isUser ? 'var(--accent-primary)' : '#ffffff',
                      color: isUser ? '#ffffff' : 'var(--text-main)',
                      fontSize: '0.825rem',
                      lineHeight: 1.55,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* Önerilen Araç Kartları (Varsa) */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        width: '100%',
                        marginTop: '10px',
                      }}
                    >
                      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                        🎯 Önerilen İlanlar ({msg.recommendations.length})
                      </span>
                      {msg.recommendations.map(car => (
                        <div
                          key={car.id}
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/listings/${car.id}`);
                          }}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            background: '#ffffff',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateX(2px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <img
                            src={car.image_url || 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=500'}
                            alt={car.title}
                            style={{ width: '56px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {car.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>
                              {Number(car.current_price).toLocaleString('tr-TR')} ₺
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-subtle)" style={{ alignSelf: 'center' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hızlı Soru / Seçenek Çipleri */}
                  {msg.suggestions && msg.suggestions.length > 0 && idx === messages.length - 1 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '8px',
                      }}
                    >
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-strong)',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.color = '#b45309';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border-strong)';
                            e.currentTarget.style.color = 'var(--text-main)';
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Yükleniyor / Yazıyor Animasyonu */}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  borderRadius: '14px 14px 14px 2px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-subtle)',
                }}
              >
                <Sparkles size={14} color="#d97706" />
                <span>OtoDanışman yanıtlıyor...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Mesaj Yazma Formu */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px',
              background: '#ffffff',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Bütçenizi veya aklınızdaki soruyu yazın..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '999px',
                border: '1px solid var(--border-strong)',
                fontSize: '0.825rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: inputText.trim() && !loading ? 'var(--accent-primary)' : 'var(--border-strong)',
                color: '#ffffff',
                border: 'none',
                cursor: inputText.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
