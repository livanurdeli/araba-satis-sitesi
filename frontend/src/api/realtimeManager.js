/**
 * Otopazar Realtime Manager
 * ─────────────────────────
 * WebSocket + HTTP Polling Fallback ile merkezi gerçek zamanlı bağlantı yöneticisi.
 *
 * Şirket ağlarında WebSocket engellendiğinde otomatik olarak HTTP polling'e geçer.
 * WebSocket tekrar kullanılabilir olduğunda geri döner.
 *
 * Kullanım:
 *   import { realtimeManager } from './realtimeManager';
 *
 *   // Abone ol (onMessage callback her olay geldiğinde çağrılır)
 *   const unsub = realtimeManager.subscribe({ user_id: 5 }, (event) => {
 *     console.log(event.type, event.payload);
 *   });
 *
 *   // Temizlik (component unmount)
 *   unsub();
 */

import { WS_BASE_URL } from './client';

const POLL_ENDPOINT = '/api/ws/poll';
const WS_MAX_RETRIES = 3;        // WebSocket bu kadar ardışık başarısızlıktan sonra polling'e geçer
const POLL_INTERVAL_MS = 3000;    // Polling aralığı (3 saniye)
const WS_RETRY_DELAY_MS = 2000;  // WebSocket yeniden bağlanma gecikmesi
const WS_HEALTH_CHECK_MS = 30000; // Polling modundayken WebSocket'i tekrar deneme aralığı

class RealtimeManager {
  constructor() {
    /** @type {WebSocket|null} */
    this._ws = null;
    /** @type {'ws'|'polling'|'connecting'|'idle'} */
    this._mode = 'idle';
    /** @type {Map<number, {params: Object, callback: Function}>} */
    this._subscribers = new Map();
    this._nextSubId = 1;
    this._wsFailCount = 0;
    this._lastSeqId = 0;
    this._pollTimer = null;
    this._wsRetryTimer = null;
    this._wsHealthTimer = null;
    this._destroyed = false;
    this._wsParams = {};
  }

  /**
   * Abone ol: gerçek zamanlı olaylar için callback kaydet.
   * @param {Object} params - Filtre parametreleri { user_id?, listing_id? }
   * @param {Function} callback - Her olay için çağrılacak fonksiyon (event) => void
   * @returns {Function} Abonelikten çıkma fonksiyonu
   */
  subscribe(params, callback) {
    const subId = this._nextSubId++;
    this._subscribers.set(subId, { params, callback });

    // Bağlantı parametrelerini güncelle (en geniş filtreye göre)
    this._recalculateParams();

    // İlk abone ise bağlantıyı başlat
    if (this._subscribers.size === 1) {
      this._startConnection();
    }

    // Abonelikten çıkma fonksiyonu
    return () => {
      this._subscribers.delete(subId);
      this._recalculateParams();

      // Son abone de çıktıysa bağlantıyı kapat
      if (this._subscribers.size === 0) {
        this._stopAll();
      }
    };
  }

  /** Mevcut bağlantı modunu döndürür */
  getMode() {
    return this._mode;
  }

  // ─── İç Yardımcılar ───

  /** Tüm abonelerin parametrelerini birleştir */
  _recalculateParams() {
    let userIds = new Set();
    let listingIds = new Set();

    for (const [, sub] of this._subscribers) {
      if (sub.params.user_id) userIds.add(sub.params.user_id);
      if (sub.params.listing_id) listingIds.add(sub.params.listing_id);
    }

    // Birden fazla farklı filtre varsa → genel dinleme (filtre yok)
    this._wsParams = {
      user_id: userIds.size === 1 ? [...userIds][0] : 0,
      listing_id: listingIds.size === 1 ? [...listingIds][0] : 0,
    };
  }

  /** Bağlantıyı başlat (önce WebSocket dene) */
  _startConnection() {
    this._destroyed = false;
    this._wsFailCount = 0;
    this._connectWS();
  }

  /** Tüm bağlantıları ve zamanlayıcıları temizle */
  _stopAll() {
    this._destroyed = true;
    this._mode = 'idle';

    if (this._ws) {
      try { this._ws.close(); } catch (_) { /* ignore */ }
      this._ws = null;
    }
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._wsRetryTimer) {
      clearTimeout(this._wsRetryTimer);
      this._wsRetryTimer = null;
    }
    if (this._wsHealthTimer) {
      clearInterval(this._wsHealthTimer);
      this._wsHealthTimer = null;
    }
  }

  // ─── WebSocket ───

  _connectWS() {
    if (this._destroyed || this._subscribers.size === 0) return;

    this._mode = 'connecting';

    const params = new URLSearchParams();
    if (this._wsParams.user_id) params.set('user_id', this._wsParams.user_id);
    if (this._wsParams.listing_id) params.set('listing_id', this._wsParams.listing_id);

    const wsUrl = params.toString() ? `${WS_BASE_URL}?${params}` : WS_BASE_URL;

    try {
      this._ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('[Realtime] WebSocket oluşturulamadı:', err.message);
      this._handleWSFail();
      return;
    }

    // Bağlantı zaman aşımı (5 saniye içinde açılmazsa başarısız say)
    const connectTimeout = setTimeout(() => {
      if (this._ws && this._ws.readyState === WebSocket.CONNECTING) {
        console.warn('[Realtime] WebSocket bağlantı zaman aşımı');
        this._ws.close();
      }
    }, 5000);

    this._ws.onopen = () => {
      clearTimeout(connectTimeout);
      this._wsFailCount = 0;
      this._mode = 'ws';
      console.log('⚡ [Realtime] WebSocket bağlandı');

      // Polling'den geçiş yapıldıysa polling'i durdur
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
      if (this._wsHealthTimer) {
        clearInterval(this._wsHealthTimer);
        this._wsHealthTimer = null;
      }
    };

    this._ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._dispatchEvent(data);
      } catch (err) {
        console.error('[Realtime] WS mesaj ayrıştırma hatası:', err);
      }
    };

    this._ws.onclose = () => {
      clearTimeout(connectTimeout);
      if (this._destroyed) return;

      if (this._mode === 'ws') {
        // Daha önce çalışıyordu, yeniden bağlanmayı dene
        console.log('[Realtime] WebSocket bağlantısı koptu, yeniden bağlanılıyor...');
        this._wsRetryTimer = setTimeout(() => this._connectWS(), WS_RETRY_DELAY_MS);
      } else {
        this._handleWSFail();
      }
    };

    this._ws.onerror = () => {
      clearTimeout(connectTimeout);
      // onclose tetiklenecek, orada handle edilecek
    };
  }

  _handleWSFail() {
    this._wsFailCount++;
    console.warn(`[Realtime] WebSocket başarısız (${this._wsFailCount}/${WS_MAX_RETRIES})`);

    if (this._wsFailCount >= WS_MAX_RETRIES) {
      console.log('🔄 [Realtime] Polling moduna geçiliyor (WebSocket erişilemez)');
      this._startPolling();
    } else {
      // Tekrar dene
      this._wsRetryTimer = setTimeout(() => this._connectWS(), WS_RETRY_DELAY_MS);
    }
  }

  // ─── HTTP Polling ───

  _startPolling() {
    if (this._destroyed) return;
    this._mode = 'polling';

    // İlk poll'da mevcut en son seq ID'yi al (geçmiş verileri yeniden göndermeyelim)
    this._initPolling();
  }

  async _initPolling() {
    try {
      const url = this._buildPollUrl(0);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this._lastSeqId = data.latest_seq || 0;
      }
    } catch (_) {
      // İlk sefer başarısız olsa da devam et
    }

    // Periyodik polling başlat
    if (!this._pollTimer && !this._destroyed) {
      this._pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
    }

    // Arka planda WebSocket'i periyodik olarak tekrar dene
    if (!this._wsHealthTimer && !this._destroyed) {
      this._wsHealthTimer = setInterval(() => this._tryWsRecovery(), WS_HEALTH_CHECK_MS);
    }
  }

  async _poll() {
    if (this._destroyed || this._mode !== 'polling') return;

    try {
      const url = this._buildPollUrl(this._lastSeqId);
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      if (data.latest_seq) {
        this._lastSeqId = data.latest_seq;
      }

      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          this._dispatchEvent(event);
        }
      }
    } catch (err) {
      // Polling hatası sessizce atlanır, sonraki iterasyonda tekrar dener
    }
  }

  _buildPollUrl(sinceSeqId) {
    const baseUrl = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${POLL_ENDPOINT}`
      : POLL_ENDPOINT;

    const params = new URLSearchParams();
    params.set('since', sinceSeqId.toString());

    // Tüm abone parametrelerini topla
    const userIds = new Set();
    const listingIds = new Set();

    for (const [, sub] of this._subscribers) {
      if (sub.params.user_id) userIds.add(sub.params.user_id);
      if (sub.params.listing_id) listingIds.add(sub.params.listing_id);
    }

    // Tek bir user_id veya listing_id varsa filtre olarak gönder
    if (userIds.size === 1) params.set('user_id', [...userIds][0]);
    if (listingIds.size === 1) params.set('listing_id', [...listingIds][0]);

    return `${baseUrl}?${params}`;
  }

  /** Polling modundayken WebSocket'in tekrar kullanılabilir olup olmadığını test et */
  _tryWsRecovery() {
    if (this._destroyed || this._mode !== 'polling') return;

    console.log('[Realtime] WebSocket kurtarma denemesi...');

    const params = new URLSearchParams();
    if (this._wsParams.user_id) params.set('user_id', this._wsParams.user_id);
    if (this._wsParams.listing_id) params.set('listing_id', this._wsParams.listing_id);
    const wsUrl = params.toString() ? `${WS_BASE_URL}?${params}` : WS_BASE_URL;

    try {
      const testWs = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        if (testWs.readyState === WebSocket.CONNECTING) {
          testWs.close();
        }
      }, 5000);

      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        console.log('✅ [Realtime] WebSocket tekrar erişilebilir! Geçiş yapılıyor...');

        // Polling'i durdur ve WebSocket'e geri dön
        if (this._pollTimer) {
          clearInterval(this._pollTimer);
          this._pollTimer = null;
        }
        if (this._wsHealthTimer) {
          clearInterval(this._wsHealthTimer);
          this._wsHealthTimer = null;
        }
        this._wsFailCount = 0;
        this._connectWS();
      };

      testWs.onerror = () => {
        clearTimeout(timeout);
        try { testWs.close(); } catch (_) { /* ignore */ }
      };

      testWs.onclose = () => {
        clearTimeout(timeout);
      };
    } catch (_) {
      // WebSocket hâlâ erişilemez
    }
  }

  // ─── Event Dispatch ───

  /**
   * Gelen olayı tüm uygun abonelere ilet.
   * Polling event'leri { seq_id, type, listing_id, user_id, payload } formatında,
   * WebSocket event'leri { type, listing_id, user_id, payload } formatındadır.
   * İkisini de normalize edip aynı formatta ileteceğiz.
   */
  _dispatchEvent(rawEvent) {
    // Normalize: polling ve WS aynı formatta olsun
    const event = {
      type: rawEvent.type,
      listing_id: rawEvent.listing_id || rawEvent.payload?.listing_id || 0,
      user_id: rawEvent.user_id || 0,
      payload: rawEvent.payload,
    };

    for (const [, sub] of this._subscribers) {
      try {
        sub.callback(event);
      } catch (err) {
        console.error('[Realtime] Subscriber callback hatası:', err);
      }
    }
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();
