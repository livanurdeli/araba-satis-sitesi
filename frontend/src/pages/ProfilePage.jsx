import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, listingAPI } from '../api/client';
import { 
  Plus, Trash2, ExternalLink, Clock, 
  CheckCircle2, TrendingUp, AlertCircle, Award 
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');
  
  const [myListings, setMyListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listings, bids] = await Promise.all([
        userAPI.getMyListings(),
        userAPI.getMyBids(),
      ]);
      setMyListings(listings);
      setMyBids(bids);
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
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Kullanıcı Paneli</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Kullanıcı ID: #{user?.user_id} • Rol: <span className="badge badge-tag">{user?.role || 'Üye'}</span>
            </p>
          </div>

          <Link to="/create-listing" className="btn btn-primary btn-sm">
            <Plus size={15} /> Yeni İlan
          </Link>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('listings')}
            className={`btn btn-sm ${activeTab === 'listings' ? 'btn-primary' : 'btn-secondary'}`}
          >
            İlanlarım ({myListings.length})
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`btn btn-sm ${activeTab === 'bids' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Verdiğim Teklifler ({myBids.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Yükleniyor...
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : activeTab === 'listings' ? (
          myListings.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>Henüz yayında bir ilanınız bulunmuyor.</p>
              <Link to="/create-listing" className="btn btn-secondary btn-sm">
                <Plus size={14} /> İlan Ver
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myListings.map(listing => (
                <div key={listing.id} className="card" style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={`badge ${listing.status === 'active' ? 'badge-live' : 'badge-ended'}`}>
                        {listing.status === 'active' ? 'Canlı Açık Artırma' : 'Sona Erdi'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        {listing.brand} • {listing.model} ({listing.year})
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem' }}>{listing.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Başlangıç: {Number(listing.starting_price).toLocaleString('tr-TR')} ₺ • 
                      <strong style={{ color: 'var(--text-main)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                        Güncel Teklif: {Number(listing.current_price).toLocaleString('tr-TR')} ₺
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/listings/${listing.id}`} className="btn btn-secondary btn-sm">
                      <ExternalLink size={14} /> İncele
                    </Link>
                    <button onClick={() => handleDeleteListing(listing.id)} className="btn btn-danger btn-sm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          myBids.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>Henüz herhangi bir ilana teklif vermediniz.</p>
              <Link to="/" className="btn btn-secondary btn-sm">
                Açık Artırmalara Göz At
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myBids.map(bid => {
                const isEnded = bid.listing_status === 'ended';
                const isTopBid = Number(bid.my_bid_amount) >= Number(bid.current_price);

                return (
                  <div key={bid.bid_id} className="card" style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      {/* Profesyonel Durum Rozeti */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {isEnded ? (
                          isTopBid ? (
                            <span className="badge" style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              fontSize: '0.75rem',
                              fontWeight: 800,
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

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{bid.listing_title}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} /> Teklif Tarihi: {new Date(bid.bid_created_at).toLocaleString('tr-TR')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                      <Link to={`/listings/${bid.listing_id}`} className="btn btn-secondary btn-sm">
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
