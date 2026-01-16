// API Base URL & Auth
const API_BASE = '/api/v1';
let authToken = localStorage.getItem('token') || null;

const apiCall = async (endpoint, options = {}) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    },
    ...options
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
    return;
  }

  return response.json();
};

// 🔐 AUTH ENDPOINTS
export const auth = {
  register: (data) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiCall('/auth/me'),
  refresh: () => apiCall('/auth/refresh', { method: 'POST' })
};

// 🛍️ PRODUCTS (Public)
export const products = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/products?${params}`);
  },
  get: (id) => apiCall(`/products/${id}`),
  search: (query) => apiCall(`/products/search?q=${query}`)
};

// 🗂️ CATEGORIES (Public)
export const categories = {
  list: () => apiCall('/categories'),
  products: (id) => apiCall(`/categories/${id}/products`)
};

// 🛒 CART
export const cart = {
  get: () => apiCall('/cart'),
  add: (data) => apiCall('/cart/add', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/cart/update', { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiCall(`/cart/item/${id}`, { method: 'DELETE' }),
  coupon: (code) => apiCall('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) })
};

// 📦 ORDERS
export const orders = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/orders?${params}`);
  },
  create: (data) => apiCall('/orders', { method: 'POST', body: JSON.stringify(data) }),
  get: (id) => apiCall(`/orders/${id}`),
  updateStatus: (id, status) => apiCall(`/orders/${id}/status`, { 
    method: 'PATCH', 
    body: JSON.stringify({ status }) 
  })
};

// 💳 PAYMENTS
export const payments = {
  intent: (data) => apiCall('/payments/intent', { method: 'POST', body: JSON.stringify(data) }),
  confirm: (data) => apiCall('/payments/confirm', { method: 'POST', body: JSON.stringify(data) })
};

// ⭐ REVIEWS
export const reviews = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/reviews?${params}`);
  },
  product: (id, filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/reviews/product/${id}?${params}`);
  },
  create: (data) => apiCall('/reviews', { method: 'POST', body: JSON.stringify(data) })
};

// 🎟️ COUPONS
export const coupons = {
  list: () => apiCall('/coupons'),
  apply: (code) => apiCall('/coupons/apply', { method: 'POST', body: JSON.stringify({ code }) })
};

// 🔔 NOTIFICATIONS
export const notifications = {
  list: (page = 1) => apiCall(`/notifications?page=${page}`),
  read: (id) => apiCall(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => apiCall('/notifications/read-all', { method: 'PATCH' })
};

// 👑 ADMIN
export const admin = {
  stats: () => apiCall('/admin/stats'),
  revenue: (days = 30) => apiCall(`/admin/revenue?days=${days}`),
  topProducts: (days = 30) => apiCall(`/admin/top-products?days=${days}`),
  orders: () => apiCall('/admin/orders')
};

// 🛒 SELLER
export const seller = {
  products: () => apiCall('/seller/products'),
  createProduct: (data) => apiCall('/seller/products', { method: 'POST', body: JSON.stringify(data) })
};