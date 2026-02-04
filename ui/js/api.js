// API Base URL & Auth
// If `window.API_BASE` is pre-set (for example by the backend-served UI), keep it.
// When the static UI is served via Live Server (port 5500) we need to point
// API calls to the backend running on localhost:3000 so requests don't hit the
// static server (which only serves GET/HEAD/OPTIONS and returns 405 for POST).
window.API_BASE = (function () {
  if (window.API_BASE) return window.API_BASE;
  try {
    const port = location.port;
    if (port === '5500' || port === '5501') return 'http://localhost:3000/api/v1';
  } catch (e) {
    // ignore
  }
  return '/api/v1';
})();

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || null;
  const headers = Object.assign({ 'Content-Type': 'application/json' }, (token ? { Authorization: `Bearer ${token}` } : {}));
  const config = Object.assign({}, options, { headers });

  const response = await fetch(`${window.API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
    return;
  }

  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};

// Expose as globals for non-module pages
window.auth = {
  register: (data) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiCall('/auth/me'),
  refresh: (data) => apiCall('/auth/refresh', { method: 'POST', body: JSON.stringify(data) })
};

window.products = {
  list: (filters = {}) => { const params = new URLSearchParams(filters); return apiCall(`/products?${params}`); },
  get: (id) => apiCall(`/products/${id}`),
  search: (query) => apiCall(`/products/search?q=${query}`)
};

window.categories = {
  list: () => apiCall('/categories'),
  products: (id) => apiCall(`/categories/${id}/products`)
};

window.cart = {
  get: () => apiCall('/cart'),
  add: (data) => apiCall('/cart/add', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/cart/update', { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiCall(`/cart/item/${id}`, { method: 'DELETE' }),
  coupon: (code) => apiCall('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) })
};

window.orders = {
  list: (filters = {}) => { const params = new URLSearchParams(filters); return apiCall(`/orders?${params}`); },
  create: (data) => apiCall('/orders', { method: 'POST', body: JSON.stringify(data) }),
  get: (id) => apiCall(`/orders/${id}`),
  updateStatus: (id, status) => apiCall(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
};

window.payments = {
  intent: (data) => apiCall('/payments/intent', { method: 'POST', body: JSON.stringify(data) }),
  confirm: (data) => apiCall('/payments/confirm', { method: 'POST', body: JSON.stringify(data) })
};

window.reviews = {
  list: (filters = {}) => { const params = new URLSearchParams(filters); return apiCall(`/reviews?${params}`); },
  product: (id, filters = {}) => { const params = new URLSearchParams(filters); return apiCall(`/reviews/product/${id}?${params}`); },
  create: (data) => apiCall('/reviews', { method: 'POST', body: JSON.stringify(data) })
};

window.coupons = {
  list: () => apiCall('/coupons'),
  apply: (code) => apiCall('/coupons/apply', { method: 'POST', body: JSON.stringify({ code }) })
};

window.notifications = {
  list: (page = 1) => apiCall(`/notifications?page=${page}`),
  read: (id) => apiCall(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => apiCall('/notifications/read-all', { method: 'PATCH' })
};

window.admin = {
  stats: () => apiCall('/admin/stats'),
  revenue: (days = 30) => apiCall(`/admin/revenue?days=${days}`),
  topProducts: (days = 30) => apiCall(`/admin/top-products?days=${days}`),
  orders: () => apiCall('/admin/orders')
};

window.seller = {
  products: () => apiCall('/seller/products'),
  createProduct: (data) => apiCall('/seller/products', { method: 'POST', body: JSON.stringify(data) })
};