import { useState, useEffect } from 'react';
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

  // İlan güncellendiğinde önerilen tutarı güncelle
  useEffect(() => {
    if (listing?.current_price) {
      const newMin = Number(listing.current_price) + 5000;
      setAmount(newMin);
    }
  }, [listing?.current_price]);

  const isSeller = user && user.user_id === listing.seller_id;
  const isEnded = listing.status === 'ended' || new Date(listing.end_time) <= new Date();

  // Nokta, virgül veya boşluk içeren girişleri akıllıca tam sayıya çevirme
  const handleAmountInputChange = (e) => {
    const rawVal = e.target.value;
    // Sadece sayısal karakterleri al (nokta, virgül vb. temizle)
    const digitsOnly = rawVal.replace(/[^0-9]/g, '');
    setAmount(digitsOnly ? Number(digitsOnly) : '');
  };

  const handleIncrement = (inc) => {
    setAmount(prev => (Number(prev) || currentPrice) + inc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);

    if (!numericAmount || isNaN(numericAmount)) {
      setError('Lütfen geçerli bir teklif tutarı girin.');
      return;
    }

    if (numericAmount <= currentPrice) {
      setError(`Teklifiniz mevcut fiyattan (${currentPrice.toLocaleString('tr-TR')} ₺) yüksek olmalıdır. Minimum teklif: ${(currentPrice + 1000).toLocaleString('tr-TR')} ₺`);
      return;
    }

    setLoading(true);
    try {
      const res = await bidAPI.placeBid(listing.id, numericAmount);
      setSuccess(`${numericAmount.toLocaleString('tr-TR')} ₺ tutarındaki teklifiniz başarıyla sisteme kaydedildi.`);
      if (onBidSuccess) {
        onBidSuccess(res);
      }
      setAmount(numericAmount + 5000);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="bid-input">
              Teklif Tutarı (₺)
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
              Min: {(currentPrice + 1000).toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              id="bid-input"
              type="text"
              inputMode="numeric"
              placeholder="Örn: 558000 veya 558.000"
              className="form-input"
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                paddingRight: '36px',
                background: 'var(--bg-surface)',
              }}
              value={amount ? Number(amount).toLocaleString('tr-TR') : ''}
              onChange={handleAmountInputChange}
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
          <span>{loading ? 'İşleniyor...' : `${amount ? Number(amount).toLocaleString('tr-TR') : '0'} ₺ Teklif Ver`}</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
