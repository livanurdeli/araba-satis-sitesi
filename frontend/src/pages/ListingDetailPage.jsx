import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listingAPI, bidAPI } from '../api/client';
import BidForm from '../components/BidForm';
import BidHistory from '../components/BidHistory';
import CountdownTimer from '../components/CountdownTimer';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CarFront, Calendar, Shield, User, ChevronLeft, ChevronRight, Trophy, Sparkles } from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Fotoğrafları ayrıştırma (tekli veya çoklu JSON)
  const defaultImage = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&auto=format&fit=crop&q=80';
  let images = [defaultImage];
  if (listing?.image_url) {
    if (listing.image_url.startsWith('[') || listing.image_url.startsWith('{')) {
      try {
        const parsed = JSON.parse(listing.image_url);
        if (Array.isArray(parsed) && parsed.length > 0) {
          images = parsed;
        }
      } catch (e) {
        images = [listing.image_url];
      }
    } else {
      images = [listing.image_url];
    }
  }

  const handlePrevImage = () => {
    setActiveImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const fetchData = async () => {
    try {
      const [listingData, bidsData] = await Promise.all([
        listingAPI.getById(id),
        bidAPI.getBids(id),
      ]);
      setListing(listingData);
      setBids(bidsData);
    } catch (err) {
      setError(err.message || 'İlan detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const [priceFlash, setPriceFlash] = useState(false);

  useEffect(() => {
    fetchData();

    // WebSocket ile Bu İlanı Canlı Dinleme
    const wsUrl = `ws://localhost:8080/ws?listing_id=${id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_BID' && Number(data.listing_id) === Number(id)) {
          // Fiyatı ve teklif listesini anında yenile
          setListing(prev => prev ? { ...prev, current_price: data.payload.amount } : prev);
          setPriceFlash(true);
          setTimeout(() => setPriceFlash(false), 2000);
          
          // Teklif geçmişini tekrar çek
          bidAPI.getBids(id).then(freshBids => setBids(freshBids)).catch(() => {});
        } else if (data.type === 'AUCTION_ENDED' && Number(data.listing_id) === Number(id)) {
          setListing(prev => prev ? { ...prev, status: 'ended' } : prev);
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [id]);

  const handleBidSuccess = (res) => {
    setListing(prev => ({
      ...prev,
      current_price: res.current_price,
    }));
    fetchData();
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>İlan yükleniyor...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <span>{error || 'İlan bulunamadı.'}</span>
          </div>
          <Link to="/" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> İlanlara Dön
          </Link>
        </div>
      </div>
    );
  }

  const isEnded = listing.status === 'ended' || new Date(listing.end_time) <= new Date();

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Navigation Breadcrumb */}
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          marginBottom: '20px',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Tüm İlanlar
        </Link>

        {/* 2-Column Split */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)',
          gap: '24px',
          alignItems: 'flex-start',
        }}>
          {/* Left Column: Vehicle Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Çoklu Araç Fotoğrafı Galerisi */}
            <div className="card" style={{
              overflow: 'hidden',
              position: 'relative',
              background: '#f4efe2',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '8px',
            }}>
              {/* Ana Büyük Görsel */}
              <div style={{
                position: 'relative',
                height: '340px',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
                background: '#1a1714',
              }}>
                <img
                  src={images[activeImageIdx] || defaultImage}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = defaultImage; }}
                />

                {/* İleri / Geri Butonları (1'den fazla görsel varsa) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        color: '#1a1714',
                      }}
                      title="Önceki Fotoğraf"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      onClick={handleNextImage}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        color: '#1a1714',
                      }}
                      title="Sonraki Fotoğraf"
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Fotoğraf Sayacı (1 / 4) */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(28, 25, 23, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      {activeImageIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Küçük Resimler Şeridi (Thumbnails) */}
              {images.length > 1 && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '4px 0',
                }}>
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      style={{
                        width: '70px',
                        height: '50px',
                        flexShrink: 0,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: idx === activeImageIdx ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        opacity: idx === activeImageIdx ? 1 : 0.65,
                        cursor: 'pointer',
                        padding: 0,
                        background: '#ffffff',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Küçük Resim ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header Card */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                <span className="badge badge-tag">{listing.brand}</span>
                <span className="badge badge-tag">{listing.model}</span>
                <span className="badge badge-tag">{listing.year}</span>
                {isEnded ? (
                  <span className="badge badge-ended">Sona Erdi</span>
                ) : (
                  <span className="badge badge-live">Canlı Açık Artırma</span>
                )}
              </div>

              <h1 style={{ fontSize: '1.8rem', lineHeight: 1.3, marginBottom: '12px' }}>
                {listing.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-subtle)', fontSize: '0.825rem' }}>
                <span>İlan No: #{listing.id}</span>
                <span>•</span>
                <span>Satıcı ID: #{listing.seller_id}</span>
                <span>•</span>
                <span>Yayınlanma: {new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

            {/* Spec Sheet Table */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Teknik Özellikler
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Marka</span>
                  <strong style={{ fontSize: '0.95rem' }}>{listing.brand}</strong>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Model</span>
                  <strong style={{ fontSize: '0.95rem' }}>{listing.model}</strong>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Model Yılı</span>
                  <strong style={{ fontSize: '0.95rem' }}>{listing.year}</strong>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Başlangıç Fiyatı</span>
                  <strong style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                    {Number(listing.starting_price).toLocaleString('tr-TR')} ₺
                  </strong>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Ekspertiz ve Açıklama
              </h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.925rem', whiteSpace: 'pre-line' }}>
                {listing.description || 'Satıcı bu araç için ek bir açıklama belirtmedi.'}
              </p>
            </div>
          </div>

          {/* Right Column: Live Bidding Module */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Real-time Bid Monitor Card */}
            <div className="card" style={{ padding: '24px', border: '1px solid var(--border-strong)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Güncel En Yüksek Teklif
                </span>
                <CountdownTimer endTime={listing.end_time} onEnd={() => setListing(prev => ({ ...prev, status: 'ended' }))} />
              </div>

              <div style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: priceFlash ? '#854d0e' : 'var(--text-main)',
                background: priceFlash ? '#fef08a' : 'transparent',
                padding: priceFlash ? '4px 10px' : '0',
                borderRadius: 'var(--radius-xs)',
                transition: 'all 0.35s ease',
                marginBottom: '14px',
                display: 'inline-block',
              }}>
                {Number(listing.current_price).toLocaleString('tr-TR')} ₺
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-subtle)',
              }}>
                <Shield size={14} color="var(--accent-emerald)" />
                <span>Eş zamanlı işlem kilidi ile güvenli teklif altyapısı</span>
              </div>
            </div>

            {/* Kazanan Rozeti / Sonuç Kartı (Süre Dolduysa) */}
            {isEnded && bids.length > 0 && (
              <div className="card" style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
                border: '1px solid #facc15',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#eab308',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}>
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#854d0e' }}>
                      Açık Artırma Tamamlandı
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#a16207' }}>
                      En yüksek teklifi veren alıcı kazandı
                    </span>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid #fef08a',
                  marginTop: '10px',
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#854d0e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={15} />
                    <span>Kazanan: <strong>{bids[0].bidder_name || `Alıcı #${bids[0].bidder_id}`}</strong></span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#854d0e', marginTop: '3px' }}>
                    {Number(bids[0].amount).toLocaleString('tr-TR')} ₺
                  </div>
                </div>

                {user && user.user_id === bids[0].bidder_id && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} />
                    <span>Tebrikler! Bu açık artırmada en yüksek teklif sahibi olarak aracı satın alma hakkı kazandınız.</span>
                  </div>
                )}
              </div>
            )}

            {/* Bid Form */}
            <BidForm listing={listing} onBidSuccess={handleBidSuccess} />

            {/* Bid History */}
            <BidHistory bids={bids} />
          </div>
        </div>
      </div>
    </div>
  );
}
