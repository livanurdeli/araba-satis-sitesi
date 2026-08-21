import { Link } from 'react-router-dom';
import { Gauge } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: '#ffffff',
      borderTop: '1px solid var(--border-subtle)',
      padding: '48px 0 24px',
      marginTop: 'auto',
    }}>
      <div className="container">
        {/* Main Footer Links */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1.4fr) repeat(5, 1fr)',
          gap: '32px',
          marginBottom: '40px',
          flexWrap: 'wrap',
        }}>
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1714',
              }}>
                <Gauge size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'lowercase' }}>
                otopazar
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.6, maxWidth: '280px', marginBottom: '16px' }}>
              Türkiye'nin en güvenilir ve hızlı çevrimiçi araç açık artırma platformu.
            </p>
            {/* Social Icons */}
            <div style={{ display: 'flex', gap: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span>🌐</span>
              <span>📷</span>
              <span>🐦</span>
              <span>▶️</span>
            </div>
          </div>

          {/* Col 1: Hakkımızda */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>Hakkımızda</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <li><Link to="/">Tüm Araçlar</Link></li>
              <li><Link to="/">Yeni İlanlar</Link></li>
              <li><Link to="/">Canlı Mezat</Link></li>
              <li><Link to="/">Ekspertiz Rehberi</Link></li>
            </ul>
          </div>

          {/* Col 2: İletişim */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>İletişim</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <li><Link to="/">Nasıl Çalışır?</Link></li>
              <li><Link to="/">Teklif Verin</Link></li>
              <li><Link to="/">Araç Değerleme</Link></li>
              <li><Link to="/">Müşteri Hizmetleri</Link></li>
            </ul>
          </div>

          {/* Col 3: Yardım */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>Yardım</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <li><Link to="/">Ödeme Seçenekleri</Link></li>
              <li><Link to="/">Güvenli Havuz</Link></li>
              <li><Link to="/">Sıkça Sorulanlar</Link></li>
              <li><Link to="/">Destek Talebi</Link></li>
            </ul>
          </div>

          {/* Col 4: Kurumsal */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>Kurumsal</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <li><Link to="/">Hakkımızda</Link></li>
              <li><Link to="/">Ekibimiz</Link></li>
              <li><Link to="/">Kariyer</Link></li>
              <li><Link to="/">Haberler & Blog</Link></li>
            </ul>
          </div>

          {/* Col 5: Yasal */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>Yasal</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <li><Link to="/">Yardım Merkezi</Link></li>
              <li><Link to="/">Kullanım Koşulları</Link></li>
              <li><Link to="/">Gizlilik Politikası</Link></li>
              <li><Link to="/">KVKK Aydınlatma</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a1714',
            }}>
              <Gauge size={12} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>otopazar</span>
          </div>

          <p>© {new Date().getFullYear()} otopazar — Çevrimiçi Araç Açık Artırma Platformu</p>
        </div>
      </div>
    </footer>
  );
}
