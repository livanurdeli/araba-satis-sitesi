import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listingAPI, WS_BASE_URL } from '../api/client';
import ListingCard from '../components/ListingCard';
import { 
  Search, RotateCcw, SlidersHorizontal, ChevronDown, 
  Users, ShieldCheck, Gavel, HelpCircle, Clock, Shield
} from 'lucide-react';

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('active');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const filtersRef = useRef({ brand, status, minPrice, maxPrice });
  useEffect(() => {
    filtersRef.current = { brand, status, minPrice, maxPrice };
  }, [brand, status, minPrice, maxPrice]);

  const fetchListings = async (showLoading = true, currentFilters = filtersRef.current) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const data = await listingAPI.getAll({
        brand: currentFilters.brand,
        status: currentFilters.status === 'all' ? '' : currentFilters.status,
        min_price: currentFilters.minPrice,
        max_price: currentFilters.maxPrice,
      });
      setListings(data || []);
    } catch (err) {
      setError(err.message || 'İlanlar yüklenemedi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(true, { brand, status, minPrice, maxPrice });
  }, [brand, status]);

  // Canlı WebSocket Bağlantısı: Yeni ilanlar, teklifler ve biten açık artırmalar için anlık güncelleme
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isSubscribed = true;

    const connectWS = () => {
      if (!isSubscribed) return;
      ws = new WebSocket(WS_BASE_URL);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'NEW_LISTING' && data.payload) {
            const newListing = data.payload;
            setListings(prev => {
              if (prev.some(l => l.id === newListing.id)) return prev;
              return [newListing, ...prev];
            });
            fetchListings(false, filtersRef.current);
          } else if (data.type === 'NEW_BID') {
            setListings(prev => prev.map(l => {
              if (l.id === data.listing_id || l.id === data.payload?.listing_id) {
                return { ...l, current_price: data.payload?.amount || data.payload?.current_price || l.current_price };
              }
              return l;
            }));
            fetchListings(false, filtersRef.current);
          } else if (data.type === 'AUCTION_ENDED') {
            setListings(prev => prev.map(l => {
              if (l.id === data.listing_id || l.id === data.payload?.listing_id) {
                return { ...l, status: 'ended' };
              }
              return l;
            }));
            fetchListings(false, filtersRef.current);
          }
        } catch (err) {
          console.error('ListingsPage WS Hatası:', err);
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
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const resetFilters = () => {
    setBrand('');
    setStatus('active');
    setMinPrice('');
    setMaxPrice('');
  };

  // Marka listesi
  const brandList = [
    { name: 'Toyota', icon: '🚗' },
    { name: 'Honda', icon: '🚙' },
    { name: 'Ford', icon: '🚘' },
    { name: 'BMW', icon: '🏎️' },
    { name: 'Mercedes', icon: '⭐' },
    { name: 'Audi', icon: '🔘' },
    { name: 'Volkswagen', icon: '🚐' },
    { name: 'Porsche', icon: '🐎' },
    { name: 'Volvo', icon: '🛡️' },
  ];

  return (
    <div className="page-wrapper" style={{ paddingTop: '20px' }}>
      <div className="container">
        
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (Arka Planda Araba Görseli, Ön Planda Yazılar & İstatistik) */}
        {/* ========================================================================= */}
        <section style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minHeight: '380px',
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)',
          marginBottom: '32px',
          boxShadow: '0 8px 30px rgba(44, 38, 26, 0.06)',
          border: '1px solid var(--border-subtle)',
          background: '#fbf8f0',
        }}>
          {/* Arka Plan Araba Görseli */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '68%',
            backgroundImage: "url('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
          }} />

          {/* Yumuşak Krem Gradyan Katmanı (Yazıların mobilde ve masaüstünde net okunması için) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, #fbf8f0 55%, rgba(251, 248, 240, 0.92) 80%, rgba(251, 248, 240, 0.35) 100%)',
          }} />

          {/* Ön Plandaki İçerik (Yazılar, Butonlar ve İstatistikler) */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '560px',
            width: '100%',
          }}>
            <h1 style={{
              fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: '6px',
              color: 'var(--text-main)',
            }}>
              otopazar ile Hayalindeki<br />Aracı Kazan
            </h1>
            <h2 style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              Açık Artırma İlanları
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginBottom: '20px',
              maxWidth: '440px',
            }}>
              Türkiye'nin Güvenilir Çevrimiçi Araç Açık Artırma Platformu
            </p>

            {/* Butonlar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const el = document.getElementById('listings-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--accent-primary)',
                  color: '#1a1714',
                }}
              >
                Canlı Açık Artırmaları Keşfet
              </button>

              <Link
                to="/create-listing"
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                Araç Sat
              </Link>
            </div>

            {/* İstatistik Kutusu (Responsive) */}
            <div className="card stats-grid-container">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1.05rem', fontWeight: 900 }}>
                  <Users size={16} color="var(--accent-primary)" /> 10,000+
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Kayıtlı Kullanıcı</div>
              </div>
              <div className="stats-grid-item-border" style={{ paddingLeft: '20px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>2,500+</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Güvenli İşlem</div>
              </div>
              <div className="stats-grid-item-border" style={{ paddingLeft: '20px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>500+</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Canlı İlan</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. HORIZONTAL SEARCH & FILTER STRIP */}
        {/* ========================================================================= */}
        <section className="card" style={{
          padding: '14px 18px',
          marginBottom: '32px',
          background: '#ffffff',
          borderRadius: 'var(--radius-sm)',
        }}>
          <form onSubmit={handleFilterSubmit} className="filter-strip-grid">
            {/* 1. İlan Durumu */}
            <div style={{
              background: 'var(--accent-primary)',
              borderRadius: 'var(--radius-xs)',
              padding: '9px 14px',
              color: '#1a1714',
              cursor: 'pointer',
            }}
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <Gavel size={14} /> İlan Durumu
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '2px' }}>
                <span>🟡 {status === 'active' ? 'Canlı İlanlar' : 'Tüm İlanlar'}</span>
              </div>
            </div>

            {/* 2. Araç Markası */}
            <div style={{
              background: 'var(--bg-body)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '7px 12px',
            }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
                🚗 Araç Markası
              </label>
              <select
                className="form-select"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '2px 0',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                <option value="">Tüm Markalar</option>
                <option value="Audi">Audi</option>
                <option value="BMW">BMW</option>
                <option value="Mercedes">Mercedes-Benz</option>
                <option value="Porsche">Porsche</option>
                <option value="Volkswagen">Volkswagen</option>
                <option value="Volvo">Volvo</option>
                <option value="Ford">Ford</option>
                <option value="Toyota">Toyota</option>
              </select>
            </div>

            {/* 3. Fiyat Aralığı */}
            <div style={{
              background: 'var(--bg-body)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '7px 12px',
            }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
                💳 Fiyat Aralığı
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  placeholder="Min Fiyat"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    width: '50%',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span style={{ color: 'var(--text-subtle)' }}>-</span>
                <input
                  type="number"
                  placeholder="Max Fiyat"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    width: '50%',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* 4. Butonlar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 800,
                  fontSize: '0.825rem',
                  border: '1px solid var(--border-strong)',
                }}
              >
                Filtrele <ChevronDown size={13} />
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-outline"
                title="Filtreleri Sıfırla"
                style={{ padding: '10px', borderRadius: 'var(--radius-xs)' }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* 3. LISTINGS GRID (Daha Küçük & Kompakt Kartlar) */}
        {/* ========================================================================= */}
        <div id="listings-grid" style={{ marginBottom: '46px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'lowercase' }}>otopazar</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              {loading ? 'Yükleniyor...' : `${listings.length} araç listeleniyor`}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              <p>İlanlar yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <SlidersHorizontal size={32} color="var(--text-subtle)" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Eşleşen İlan Bulunamadı</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                Filtreleri temizleyerek tüm açık artırmaları görebilirsiniz.
              </p>
              <button onClick={resetFilters} className="btn btn-primary btn-sm">
                Filtreleri Sıfırla
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '18px',
            }}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. BROWSE BY BRAND */}
        {/* ========================================================================= */}
        <section style={{ marginBottom: '46px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>
            Markalara Göre İncele
          </h2>

          <div className="horizontal-scroll-touch" style={{
            gap: '14px',
            paddingBottom: '10px',
            alignItems: 'center',
          }}>
            {brandList.map((b, idx) => (
              <button
                key={idx}
                onClick={() => setBrand(b.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '64px',
                }}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: brand === b.name ? 'var(--accent-primary)' : '#ffffff',
                  border: `1px solid ${brand === b.name ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'var(--transition-fast)',
                }}>
                  {b.icon}
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: brand === b.name ? 'var(--text-main)' : 'var(--text-muted)',
                }}>
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. VALUE PROPOSITION */}
        {/* ========================================================================= */}
        <section style={{ marginBottom: '46px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>
            Neden otopazar?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '3px' }}>Şeffaf ve Açık</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Bütün araçlar bağımsız ekspertiz ve tramer onaylıdır.
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Shield size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '3px' }}>Güvenli Ödeme</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Eş zamanlı işlem kilidi ve güvenli havuz hesabı güvencesi.
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '3px' }}>Hızlı Teklif</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Canlı geri sayım sayacıyla anlık teklif verin.
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <HelpCircle size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '3px' }}>7/24 Destek</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Uzman destek ekibimiz her adımda yanınızda.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
