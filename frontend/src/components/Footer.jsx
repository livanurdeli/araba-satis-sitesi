import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Gauge,
  ShieldCheck,
  Zap,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Car,
  Lock,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Radio
} from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'Açık artırmada teklif verdiğimde fiyat anında güncellenir mi?',
      answer:
        'Evet! Platformumuz WebSocket canlı yayın motoruyla donatılmıştır. Verdiğiniz teklif milisaniyeler içinde tüm bağlı kullanıcıların ekranında sayfayı yenilemeye gerek kalmadan anında parlar ve güncellenir.',
    },
    {
      id: 2,
      question: 'Aynı anda iki kişi teklif verirse çakışma nasıl önlenir?',
      answer:
        'Sistemimiz PostgreSQL veritabanı seviyesinde eşzamanlı satır kilidi (SELECT FOR UPDATE) kullanır. Aynı milisaniyede gelen istekler sıraya alınır ve yalnızca geçerli en yüksek teklif kabul edilerek çift harcama veya teklif çakışması %100 engellenir.',
    },
    {
      id: 3,
      question: 'İhaleyi kazandığımda veya araç hakkında sorum olduğunda satıcıyla nasıl görüşürüm?',
      answer:
        'İlan detay sayfasındaki "Satıcıya Mesaj Gönder" butonuna veya Üst Menüdeki "Mesajlar" sekmesine tıklayarak satıcıyla gerçek zamanlı olarak doğrudan sohbet edebilir, ekspertiz ve devir detaylarını konuşabilirsiniz.',
    },
    {
      id: 4,
      question: 'Açık artırma süresi bittiğinde ne olur?',
      answer:
        'Arka plandaki otomatik açık artırma izleme servisimiz süresi dolan ihaleyi anında tespit eder, durumu "Tamamlandı" olarak kilitler ve en yüksek teklif sahibini "Resmi Kazanan" ilan ederek iki tarafa da bildirim gönderir.',
    },
  ];

  const toggleFaq = (id) => {
    setOpenFaq(prev => (prev === id ? null : id));
  };

  const popularBrands = [
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Porsche',
    'Volkswagen',
    'Ford',
    'Toyota',
    'Volvo',
  ];

  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: 'auto',
        position: 'relative',
      }}
    >
      {/* 1. Üst Güvenlik ve Mimari Güvence Kartları */}
      <div
        style={{
          background: 'linear-gradient(180deg, var(--bg-surface-soft) 0%, #ffffff 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '40px 0',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(217, 119, 6, 0.1)',
                color: '#b45309',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '10px',
              }}
            >
              <ShieldCheck size={16} />
              <span>Güvenli & Gerçek Zamanlı Mezat Altyapısı</span>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>
              otopazar Açık Artırma Güvencesi
            </h3>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem', maxWidth: '600px', margin: '0 auto' }}>
              Şeffaf ihale motoru, eşzamanlı veri kilidi ve canlı mesajlaşma ile güvenli araç alım-satım deneyimi.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Kart 1 */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px' }}>Eşzamanlı İşlem Kilidi</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.5, margin: 0 }}>
                  PostgreSQL <code>SELECT FOR UPDATE</code> satır kilidi ile milisaniyelik teklif çakışmaları önlenir.
                </p>
              </div>
            </div>

            {/* Kart 2 */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px' }}>Canlı WebSocket Yayını</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.5, margin: 0 }}>
                  Yeni teklifler, fiyat parlamaları ve OUTBID uyarıları tüm ekranlara anında canlı dağıtılır.
                </p>
              </div>
            </div>

            {/* Kart 3 */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px' }}>Alıcı-Satıcı Canlı Sohbet</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.5, margin: 0 }}>
                  İlan sahipleriyle araç durumu, ekspertiz ve devir teslim hakkında anında birebir mesajlaşın.
                </p>
              </div>
            </div>

            {/* Kart 4 */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#faf5ff',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px' }}>Otomatik İhale Kapanışı</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.5, margin: 0 }}>
                  Süre sıfırlandığı anda açık artırma kilitlenir, en yüksek teklif sahibi resmi kazanan seçilir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. İnteraktif SSS (Sıkça Sorulan Sorular) ve Hızlı Aksiyon Alanı */}
      <div style={{ padding: '48px 0 36px' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 1.4fr) minmax(280px, 1fr)',
              gap: '40px',
              alignItems: 'start',
            }}
          >
            {/* Sol Sütun: SSS Akordeonu */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <HelpCircle size={20} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Sıkça Sorulan Sorular
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqs.map(faq => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <div
                      key={faq.id}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        background: isOpen ? 'var(--bg-surface-soft)' : '#ffffff',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: 'var(--text-main)',
                          gap: '12px',
                        }}
                      >
                        <span>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                        ) : (
                          <ChevronDown size={16} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
                        )}
                      </button>

                      {isOpen && (
                        <div
                          style={{
                            padding: '0 16px 16px 16px',
                            fontSize: '0.825rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.6,
                            borderTop: '1px dashed var(--border-subtle)',
                            paddingTop: '12px',
                          }}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sağ Sütun: Hızlı Filtreleme ve Canlı Menü */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Marka Filtreleri */}
              <div
                style={{
                  background: 'var(--bg-surface-soft)',
                  padding: '20px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Car size={18} color="var(--accent-primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                    Popüler Marka Mezatları
                  </h4>
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-subtle)', margin: '0 0 12px' }}>
                  Doğrudan ilgilendiğiniz markanın aktif açık artırmalarına göz atın:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {popularBrands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => navigate(`/listings?brand=${encodeURIComponent(brand)}`)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.background = 'var(--accent-primary)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = 'var(--text-main)';
                      }}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hızlı İşlem Bağlantıları */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <Link
                  to="/listings?status=active"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={14} color="#dc2626" />
                    Canlı Mezatlar
                  </span>
                  <ArrowRight size={14} color="var(--text-subtle)" />
                </Link>

                <Link
                  to="/create-listing"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="var(--accent-primary)" />
                    Yeni İlan Ver
                  </span>
                  <ArrowRight size={14} color="var(--text-subtle)" />
                </Link>

                <Link
                  to="/messages"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} color="#059669" />
                    Mesaj Kutusu
                  </span>
                  <ArrowRight size={14} color="var(--text-subtle)" />
                </Link>

                <Link
                  to="/profile"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#2563eb" />
                    Teklif Geçmişim
                  </span>
                  <ArrowRight size={14} color="var(--text-subtle)" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Canlı Sistem Durumu & Telif Hakkı Alt Çubuğu */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-soft)',
          padding: '18px 0',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Logo ve İsim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1714',
              }}
            >
              <Gauge size={14} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              otopazar
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span>© {new Date().getFullYear()} Türkiye'nin Çevrimiçi Araç Açık Artırma Platformu</span>
          </div>

          {/* Sistem Canlılık Rozetleri */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                }}
              />
              <span>PostgreSQL Eşzamanlı Kilit Aktif</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'inline-block',
                  boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)',
                }}
              />
              <span>WebSocket Canlı Akış Aktif</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
