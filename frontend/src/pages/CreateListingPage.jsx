import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingAPI } from '../api/client';
import { 
  AlertCircle, ArrowRight, UploadCloud, Trash2, 
  Plus, CheckCircle2, Star, Image as ImageIcon 
} from 'lucide-react';

export default function CreateListingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    brand: 'BMW',
    model: '',
    year: new Date().getFullYear(),
    description: '',
    starting_price: '',
    images: [], // Çoklu fotoğraf dizisi
    durationDays: '3',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Çoklu Dosya Yükleme & Optimize Etme
  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Lütfen sadece geçerli görsel dosyaları seçin.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Görsel okunamadı.'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');
    try {
      // Önce doğrudan sunucuya yüklemeyi dene
      const token = localStorage.getItem('token');
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));

      const uploadRes = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fd,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const urls = uploadData.urls || [uploadData.url];
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...urls],
        }));
      } else {
        // Sunucu hatasında yerel canvas optimizasyonuna geri dön
        const processed = await Promise.all(files.map(processFile));
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...processed],
        }));
      }
    } catch {
      // Ağ hatasında yerel canvas optimizasyonuna geri dön
      const processed = await Promise.all(files.map(processFile));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...processed],
      }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSetPrimary = (indexToPrimary) => {
    setFormData(prev => {
      const selected = prev.images[indexToPrimary];
      const others = prev.images.filter((_, idx) => idx !== indexToPrimary);
      return {
        ...prev,
        images: [selected, ...others],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.images.length === 0) {
      setError('Lütfen araca ait en az bir fotoğraf yükleyin.');
      return;
    }

    if (!formData.title || !formData.brand || !formData.model || !formData.starting_price) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    const durationDays = parseInt(formData.durationDays, 10);
    const endTime = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    setLoading(true);
    try {
      // Tüm fotoğrafları JSON string olarak saklayarak 100% veritabanı uyumluluğu sağlıyoruz
      const payload = {
        title: formData.title,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year, 10),
        description: formData.description,
        starting_price: parseFloat(formData.starting_price),
        image_url: JSON.stringify(formData.images),
        end_time: endTime.toISOString(),
      };

      const newListing = await listingAPI.create(payload);
      navigate(`/listings/${newListing.id}`);
    } catch (err) {
      setError(err.message || 'İlan oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '720px' }}>
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Yeni Açık Artırma Başlat</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Araç fotoğraflarını yükleyin ve detayları girerek açık artırmanızı başlatın.
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Çoklu Fotoğraf Yükleme Alanı */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Araç Fotoğrafları ({formData.images.length} Seçildi) *
                </label>
                {formData.images.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                    İlk fotoğraf vitrin (kapak) olarak kullanılır
                  </span>
                )}
              </div>

              {/* Gizli çoklu dosya seçici */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />

              {formData.images.length === 0 ? (
                /* Boşken gösterilen büyük Dropzone */
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: '2px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-body)',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.background = 'var(--accent-primary-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.background = 'var(--bg-body)';
                  }}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--accent-primary)',
                  }}>
                    <UploadCloud size={26} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '4px', color: 'var(--text-main)' }}>
                    Araç Fotoğraflarını Seçin (Birden Fazla Seçilebilir)
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    PNG, JPG veya WEBP • Dış, iç ve motor fotoğraflarını topluca ekleyin
                  </span>
                </div>
              ) : (
                /* Çoklu Fotoğraf Izgarası (Gallery Grid) */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-body)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  {formData.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        height: '110px',
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        border: idx === 0 ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                        background: '#ffffff',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Araç Fotoğrafı ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Kapak Görseli Rozeti */}
                      {idx === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: 'var(--accent-primary)',
                          color: '#1a1714',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Star size={10} fill="#1a1714" /> Vitrin
                        </div>
                      )}

                      {/* Aksiyon Butonları */}
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        display: 'flex',
                        gap: '4px',
                      }}>
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(idx)}
                            title="Kapak Fotoğrafı Yap"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              color: '#854d0e',
                            }}
                          >
                            <Star size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Sil"
                          style={{
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            color: '#ffffff',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* + Yeni Fotoğraf Ekleme Kutusu */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      height: '110px',
                      borderRadius: 'var(--radius-xs)',
                      border: '2px dashed var(--border-strong)',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <Plus size={20} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Fotoğraf Ekle</span>
                  </button>
                </div>
              )}
            </div>

            {/* Başlık */}
            <div className="form-group">
              <label className="form-label" htmlFor="title">İlan Başlığı *</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Örn: 2021 BMW 320i M Sport"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Marka & Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="brand">Marka *</label>
                <select
                  id="brand"
                  name="brand"
                  className="form-select"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                >
                  <option value="BMW">BMW</option>
                  <option value="Mercedes">Mercedes-Benz</option>
                  <option value="Audi">Audi</option>
                  <option value="Porsche">Porsche</option>
                  <option value="Volkswagen">Volkswagen</option>
                  <option value="Volvo">Volvo</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Honda">Honda</option>
                  <option value="Ford">Ford</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="model">Model *</label>
                <input
                  id="model"
                  name="model"
                  type="text"
                  placeholder="Örn: 320i"
                  className="form-input"
                  value={formData.model}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Üretim Yılı & Başlangıç Fiyatı */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="year">Üretim Yılı *</label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  min="1960"
                  max={new Date().getFullYear() + 1}
                  className="form-input"
                  value={formData.year}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="starting_price">Başlangıç Fiyatı (₺) *</label>
                <input
                  id="starting_price"
                  name="starting_price"
                  type="number"
                  min="1000"
                  placeholder="Örn: 850000"
                  className="form-input"
                  value={formData.starting_price}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Açık Artırma Süresi */}
            <div className="form-group">
              <label className="form-label" htmlFor="durationDays">Açık Artırma Süresi</label>
              <select
                id="durationDays"
                name="durationDays"
                className="form-select"
                value={formData.durationDays}
                onChange={handleChange}
              >
                <option value="1">24 Saat</option>
                <option value="3">3 Gün</option>
                <option value="5">5 Gün</option>
                <option value="7">7 Gün</option>
              </select>
            </div>

            {/* Açıklama */}
            <div className="form-group">
              <label className="form-label" htmlFor="description">Ekspertiz ve Açıklama</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Araç durumu, hasar kaydı, donanım paketleri ve servis geçmişi..."
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
            >
              <span>{loading ? 'Yayınlanıyor...' : `İlanı (${formData.images.length} Fotoğrafla) Yayınla`}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
