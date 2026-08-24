import { useState } from 'react';
import { Gauge, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export default function Footer() {
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
        'İlan detay sayfasındaki "Satıcıya Mesaj Gönder" butonuna veya üst menüdeki "Mesajlar" sekmesine tıklayarak satıcıyla gerçek zamanlı olarak doğrudan sohbet edebilir, ekspertiz ve teslimat detaylarını konuşabilirsiniz.',
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

  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: 'auto',
        padding: '48px 0 24px',
      }}
    >
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-primary)',
              marginBottom: '6px',
            }}
          >
            <HelpCircle size={22} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Sıkça Sorulan Sorular
            </h3>
          </div>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem', margin: 0 }}>
            Açık artırma, canlı teklif ve mesajlaşma süreçleri hakkında merak edilenler
          </p>
        </div>

        {/* SSS Akordeonu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '40px' }}>
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
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    gap: '12px',
                  }}
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  ) : (
                    <ChevronDown size={18} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
                  )}
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px 20px',
                      fontSize: '0.85rem',
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

        {/* Sade Alt Çubuk */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1714',
              }}
            >
              <Gauge size={13} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>otopazar</span>
          </div>

          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} otopazar — Çevrimiçi Araç Açık Artırma Platformu
          </p>
        </div>
      </div>
    </footer>
  );
}
