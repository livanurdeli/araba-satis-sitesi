import { Clock } from 'lucide-react';

export default function BidHistory({ bids }) {
  if (!bids || bids.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '0.875rem' }}>Henüz teklif verilmedi.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 800 }}>
          Teklif Geçmişi
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
          {bids.length} Teklif
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {bids.map((bid, index) => {
          const isHighest = index === 0;
          return (
            <div
              key={bid.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                background: isHighest ? '#fefce8' : 'var(--bg-surface-elevated)',
                border: isHighest ? '1px solid #fef08a' : '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isHighest ? '#854d0e' : 'var(--text-main)' }}>
                  {bid.bidder_name || 'Alıcı'} {isHighest && '• En Yüksek'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Clock size={11} />
                  {new Date(bid.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {new Date(bid.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div style={{
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: 'var(--font-mono)',
                color: isHighest ? '#854d0e' : 'var(--text-main)',
              }}>
                {Number(bid.amount).toLocaleString('tr-TR')} ₺
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
