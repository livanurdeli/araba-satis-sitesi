import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bidAPI } from '../api/client';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BidForm({ listing, onBidSuccess }) {
  const { user, isAuthenticated } = useAuth();
  const currentPrice = Number(listing.current_price);
  
  const minSuggested = currentPrice + 5000;
  const [amount, setAmount] = useState(minSuggested);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSeller = user && user.user_id === listing.seller_id;
  const isEnded = listing.status === 'ended' || new Date(listing.end_time) <= new Date();

  const handleIncrement = (inc) => {
    setAmount(prev => Number(prev) + inc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (Number(amount) <= currentPrice) {
      setError(`Teklifiniz en az ${(currentPrice + 1).toLocaleString('tr-TR')} ₺ olmalıdır.`);
      return;
    }

    setLoading(true);
    try {
      const res = await bidAPI.placeBid(listing.id, amount);
      setSuccess('Teklifiniz başarıyla sisteme kaydedildi.');
      if (onBidSuccess) {
        onBidSuccess(res);
      }
      setAmount(Number(amount) + 5000);
    } catch (err) {
      setError(err.message || 'Teklif verilemedi.');
    } finally {
      setLoading(false);
    }
  };

  if (isEnded) {
    return (
      <div className="alert alert-error" style={{ justifyContent: 'center' }}>
        <AlertCircle size={16} />
        <span>Açık artırma süresi sona ermiştir.</span>
      </div>
    );
  }

  if (isSeller) {
    return (
      <div className="alert" style={{ background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', justifyContent: 'center' }}>
        <AlertCircle size={16} />
        <span>Kendi ilanınıza teklif veremezsiniz.</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
          Teklif vermek için oturum açmanız gerekmektedir.
        </p>
        <a href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Giriş Yap
        </a>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '22px' }}>
      <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 800 }}>
        Teklif Gönder
      </h3>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="bid-input">
            Teklif Tutarı (₺)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="bid-input"
              type="number"
              className="form-input"
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                paddingRight: '36px',
                background: 'var(--bg-surface)',
              }}
              value={amount}
              min={currentPrice + 1}
              step="1000"
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <span style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)',
              fontWeight: 800,
            }}>
              ₺
            </span>
          </div>
        </div>

        {/* Hızlı Artış Butonları */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleIncrement(1000)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            +1.000 ₺
          </button>
          <button type="button" onClick={() => handleIncrement(5000)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            +5.000 ₺
          </button>
          <button type="button" onClick={() => handleIncrement(25000)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            +25.000 ₺
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span>{loading ? 'İşleniyor...' : `${Number(amount).toLocaleString('tr-TR')} ₺ Teklif Ver`}</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
