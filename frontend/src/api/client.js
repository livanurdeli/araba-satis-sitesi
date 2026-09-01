const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return '/api';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined' && window.location?.host) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws`;
  }
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return 'ws://localhost:8080/ws';
};

const BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || (typeof data === 'string' ? data : 'Bir hata oluştu'));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authAPI = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me', { method: 'GET' }),
};

export const listingAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.brand) searchParams.append('brand', params.brand);
    if (params.status) searchParams.append('status', params.status);
    if (params.min_price) searchParams.append('min_price', params.min_price);
    if (params.max_price) searchParams.append('max_price', params.max_price);
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/listings${query}`, { method: 'GET' });
  },
  getById: (id) => request(`/listings/${id}`, { method: 'GET' }),
  create: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
};

export const bidAPI = {
  placeBid: (listingId, amount) => 
    request(`/listings/${listingId}/bids`, { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }),
  getBids: (listingId) => 
    request(`/listings/${listingId}/bids`, { method: 'GET' }),
};

export const userAPI = {
  getMyListings: () => request('/users/me/listings', { method: 'GET' }),
  getMyBids: () => request('/users/me/bids', { method: 'GET' }),
};

export const messageAPI = {
  sendMessage: (data) => request('/messages', { method: 'POST', body: JSON.stringify(data) }),
  getConversations: () => request('/messages/conversations', { method: 'GET' }),
  getMessages: (listingId, otherUserId) => {
    let url = `/messages?listing_id=${listingId}`;
    if (otherUserId) url += `&other_user_id=${otherUserId}`;
    return request(url, { method: 'GET' });
  },
  getUnreadCount: () => request('/messages/unread-count', { method: 'GET' }),
};

export const agentAPI = {
  chat: (data) => request('/agent/chat', { method: 'POST', body: JSON.stringify(data) }),
};

export const uploadAPI = {
  uploadFiles: async (formData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Dosya yükleme başarısız');
    }
    return await response.json();
  },
};

export { BASE_URL };

