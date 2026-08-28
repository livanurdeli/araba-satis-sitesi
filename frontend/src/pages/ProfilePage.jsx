import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, listingAPI } from '../api/client';
import { 
  Plus, Trash2, ExternalLink, Clock, 
  TrendingUp, AlertCircle, Award, MessageSquare, CarFront, User as UserIcon, Shield
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'bids' ? 'bids' : 'listings');
  
  const [myListings, setMyListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab değiştiğinde URL parametresini senkronize et
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'bids' ? { tab: 'bids' } : {});
  };

  const parseImage = (imgStr) => {
    const defaultImg = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80';
    if (!imgStr) return defaultImg;
    if (imgStr.startsWith('[') || imgStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(imgStr);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch (e) {
        return imgStr;
      }
    }
    return imgStr;
  };

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listings, bids] = await Promise.all([
        userAPI.getMyListings(),
        userAPI.getMyBids(),
      ]);
      setMyListings(listings || []);
      setMyBids(bids || []);
    } catch (err) {
      setError(err.message || 'Profil bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Bu ilanı silmek istediğinizden emin misiniz?')) return;

    try {
      await listingAPI.delete(id);
      setMyListings(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(err.message || 'İlan silinemedi.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* User Account Header */}
        <div className="card" style={{
          padding: 'clamp(16px, 3vw, 24px)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a1714',
              fontWeight: 800,
              fontSize: '1.3rem',
              boxShadow: '0 4px 12px rgba(229, 169, 60, 0.25)',
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  {user?.name || 'Kullanıcı Paneli'}
                </h1>
                <span className="badge badge-tag" style={{ fontSize: '0.75rem' }}>
                  <Shield size={11} style={{ marginRight: '3px' }} />
                  {user?.role === 'admin' ? 'Yönetici' : 'Üye'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                {user?.email || `Kullanıcı ID: #${user?.user_id || user?.id}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/messages" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={15} /> <span>Mesajlarım</span>
            </Link>
            <Link to="/create-listing" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> <span>Yeni İlan Ver</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => handleTabChange('listings')}
            className={`btn btn-sm ${activeTab === 'listings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            İlanlarım ({myListings.length})
          </button>
          <button
            onClick={() => handleTabChange('bids')}
            className={`btn btn-sm ${activeTab === 'bids' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            Verdiğim Teklifler ({myBids.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>Yükleniyor...</div>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : activeTab === 'listings' ? (
          myListings.length === 0 ? (
            <div className="card" style={{ padding: '48px 20px', textAlign: 'center' }}>
              <CarFront size={40} style={{ margin: '0 auto 12px', color: 'var(--text-subtle)' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                Henüz yayında bir ilanınız bulunmuyor.
              </p>
              <Link to="/create-listing" className="btn btn-primary btn-sm">
                <Plus size={14} /> İlk İlanınızı Verin
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myListings.map(listing => (
                <div key={listing.id} className="card" style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img
                      src={parseImage(listing.image_url)}
                      alt={listing.title}
                      style={{
                        width: '72px',
                        height: '54px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                        background: '#f4f4f5',
                      }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className={`badge ${listing.status === 'active' ? 'badge-live' : 'badge-ended'}`}>
                          {listing.status === 'active' ? 'Canlı Açık Artırma' : 'Sona Erdi'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                          {listing.brand} • {listing.model} ({listing.year})
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0' }}>{listing.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Başlangıç: {Number(listing.starting_price).toLocaleString('tr-TR')} ₺ • 
                        <strong style={{ color: 'var(--text-main)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                          Güncel Teklif: {Number(listing.current_price).toLocaleString('tr-TR')} ₺
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/listings/${listing.id}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ExternalLink size={14} /> <span>İncele</span>
                    </Link>
                    <button onClick={() => handleDeleteListing(listing.id)} className="btn btn-danger btn-sm" title="İlanı Sil">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          myBids.length === 0 ? (
            <div className="card" style={{ padding: '48px 20px', textAlign: 'center' }}>
              <Award size={40} style={{ margin: '0 auto 12px', color: 'var(--text-subtle)' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                Henüz herhangi bir ilana teklif vermediniz.
              </p>
              <Link to="/" className="btn btn-primary btn-sm">
                Açık Artırmalara Göz At
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myBids.map(bid => {
                const isEnded = bid.listing_status === 'ended';
                const isTopBid = Number(bid.my_bid_amount) >= Number(bid.current_price);
                const isWon = isEnded && isTopBid;

                return (
                  <div key={bid.bid_id} className="card" style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img
                        src={parseImage(bid.image_url)}
                        alt={bid.listing_title}
                        style={{
                          width: '72px',
                          height: '54px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          background: '#f4f4f5',
                        }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div>
                        {/* Profesyonel Durum Rozeti */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          {isEnded ? (
                            isWon ? (
                              <span className="badge" style={{
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <Award size={13} />
                                <span>İhale Kazanıldı</span>
                              </span>
                            ) : (
                              <span className="badge" style={{
                                background: '#f4f4f5',
                                color: '#71717a',
                                border: '1px solid #e4e4e7',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <Clock size={12} />
                                <span>Sona Erdi</span>
                              </span>
                            )
                          ) : (
                            isTopBid ? (
                              <span className="badge" style={{
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <TrendingUp size={13} />
                                <span>En Yüksek Teklif</span>
                              </span>
                            ) : (
                              <span className="badge" style={{
                                background: '#fffbeb',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <AlertCircle size={13} />
                                <span>Teklifiniz Geçildi</span>
                              </span>
                            )
                          )}

                          <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                            {bid.brand} {bid.model}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0' }}>{bid.listing_title}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} /> Teklif Tarihi: {new Date(bid.bid_created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 800 }}>
                          Verdiğiniz Teklif
                        </span>
                        <span style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: isTopBid ? 'var(--text-main)' : 'var(--text-muted)',
                        }}>
                          {Number(bid.my_bid_amount).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                      
                      {isWon && (
                        <Link
                          to={`/messages?listing_id=${bid.listing_id}`}
                          className="btn btn-primary btn-sm"
                          style={{ background: '#15803d', borderColor: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}
                          title="Satıcıya Mesaj Gönder"
                        >
                          <MessageSquare size={14} />
                          <span>Satıcıya Yaz</span>
                        </Link>
                      )}

                      <Link to={`/listings/${bid.listing_id}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>İncele</span>
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
