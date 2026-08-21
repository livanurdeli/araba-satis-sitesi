import { Link } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import { ArrowUpRight } from 'lucide-react';

export default function ListingCard({ listing }) {
  const isEnded = listing.status === 'ended' || new Date(listing.end_time) <= new Date();

  // Fallback ve çoklu fotoğraf ayrıştırma
  const defaultImage = 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80';
  let imageUrl = defaultImage;
  if (listing.image_url) {
    if (listing.image_url.startsWith('[') || listing.image_url.startsWith('{')) {
      try {
        const parsed = JSON.parse(listing.image_url);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imageUrl = parsed[0];
        }
      } catch (e) {
        imageUrl = listing.image_url;
      }
    } else {
      imageUrl = listing.image_url;
    }
  }

  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      borderRadius: 'var(--radius-sm)',
      background: '#ffffff',
      border: '1px solid var(--border-subtle)',
    }}>
      {/* 1. Görsel & Rozetler (Kompakt Yükseklik) */}
      <div style={{
        height: '145px',
        position: 'relative',
        background: '#f4efe2',
        overflow: 'hidden',
      }}>
        <img
          src={imageUrl}
          alt={listing.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
          }}
          onError={(e) => { e.target.src = defaultImage; }}
          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.04)'; }}
          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
        />

        {/* Üst Rozetler (AUDI ve CANLI) */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            background: '#ffffff',
            color: 'var(--text-main)',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            textTransform: 'uppercase',
          }}>
            {listing.brand || 'ARAÇ'}
          </span>

          {isEnded ? (
            <span style={{
              background: '#ffffff',
              color: '#78716c',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}>
              SONA ERDİ
            </span>
          ) : (
            <span style={{
              background: '#ffffff',
              color: '#10b981',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}>
              CANLI
            </span>
          )}
        </div>

        {/* Alt Bilgi Şeridi */}
        <div style={{
          position: 'absolute',
          bottom: '6px',
          left: '6px',
          right: '6px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          padding: '3px 6px',
          borderRadius: 'var(--radius-xs)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <span>{listing.year}</span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>{listing.model}</span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>30.000 KM</span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>Otomatik</span>
        </div>
      </div>

      {/* 2. İçerik Alanı */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
        <h3 style={{
          fontSize: '0.95rem',
          fontWeight: 800,
          lineHeight: 1.3,
          color: 'var(--text-main)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {listing.title}
        </h3>

        {/* 3. Fiyat ve Sayaç Kutusu */}
        <div style={{
          background: 'var(--bg-body)',
          padding: '8px 10px',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}>
          <div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 800 }}>
              SON TEKLİF
            </span>
            <span style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-main)',
            }}>
              {Number(listing.current_price).toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>
              SÜRE
            </span>
            <CountdownTimer endTime={listing.end_time} />
          </div>
        </div>

        {/* 4. Altın Sarısı Teklif Butonu */}
        <Link
          to={`/listings/${listing.id}`}
          className="btn btn-primary btn-sm"
          style={{
            width: '100%',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 12px',
            fontSize: '0.85rem',
            fontWeight: 800,
            background: 'var(--accent-primary)',
            color: '#1a1714',
          }}
        >
          <span>Teklif Ver</span>
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
