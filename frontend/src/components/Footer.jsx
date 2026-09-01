import { useState } from 'react';
import { Gauge, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export default function Footer() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'Verdiğim teklifi iptal edebilir veya geri çekebilir miyim?',
      answer:
        'Hayır. Açık artırmaların güvenilirliğini ve satıcıların mağdur olmamasını sağlamak adına sisteme girilen hiçbir teklif geri çekilemez. Lütfen bütçenize uygun teklifler veriniz.',
    },
    {
      id: 2,
      question: 'Açık artırmayı kazandığımı nasıl anlarım?',
      answer:
        'İhale süresi dolduğunda en yüksek teklifi veren kullanıcı sizseniz; ekranınızda anlık bir tebrik bildirimi belirir, sağ üstteki bildirim çanınıza bildirim düşer ve araç profilinizdeki "Kazanılan İhalelerim" sekmesine eklenir.',
    },
    {
      id: 3,
      question: 'Kendi aracımı satışa çıkarmak için ne yapmalıyım?',
      answer:
        'Üst menüde yer alan "İlan Ver" butonuna tıklayarak aracınızın marka, model, yıl, başlangıç fiyatı, ihale bitiş tarihi ve fotoğraflarını yükleyerek saniyeler içinde aracınızı canlı açık artırmaya açabilirsiniz.',
    },
    {
      id: 4,
      question: 'Aracıma gelen teklifleri nereden takip edebilirim?',
      answer:
        'Biri aracınıza teklif verdiğinde sağ üstteki zil simgesine ve ekranınıza canlı bildirim gelir. Ayrıca "Hesabım > İlanlarım" sekmesinden aracınızın güncel fiyatını ve tüm teklif geçmişini anlık olarak izleyebilirsiniz.',
    },
    {
      id: 5,
      question: 'İlanımı yayındayken düzenleyebilir veya silebilir miyim?',
      answer:
        'İlanınıza henüz hiç teklif gelmemişse ilanınızı profilinizden dilediğiniz gibi güncelleyebilir veya silebilirsiniz. Ancak teklif verilmiş aktif bir açık artırmanın kuralları, alıcıların hakkını korumak adına kilitlenir.',
    },
    {
      id: 6,
      question: 'Alıcı ve satıcı site üzerinden nasıl iletişim kurar?',
      answer:
        'İlan detay sayfasında bulunan "Satıcıya Mesaj Gönder" butonuna basarak site içi güvenli mesajlaşma panelini kullanabilirsiniz. Sayfayı yenilemenize gerek kalmadan mesajlar anında karşı tarafa iletilir.',
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
