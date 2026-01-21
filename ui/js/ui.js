// Universal render functions
function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = products.map(p => `
    <div class="col-12 col-sm-6 col-md-4" data-aos="fade-up">
      <div class="card h-100">
        <img src="${p.image || 'https://via.placeholder.com/400x250'}" class="card-img-top" alt="${p.name}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.name}</h5>
          <p class="card-text text-muted mb-2">$${p.price.toFixed ? p.price.toFixed(2) : p.price}</p>
          <div class="mt-auto">
            <a class="btn btn-primary btn-sm" href="product.html?id=${p.id}">View</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategories(categories, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = categories.map(c => `
    <button class="btn btn-outline-secondary btn-sm" onclick="location.href='index.html?category=${c.id}'">${c.name}</button>
  `).join('');
}

function renderCartItems(items) {
  const el = document.getElementById('cart-items');
  if (!el) return;
  el.innerHTML = items.map(item => `
    <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
      <div>
        <strong>${item.product.name}</strong>
        <div class="text-muted small">Qty: ${item.quantity}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger" onclick="cart.remove('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function updateCartTotal(total) {
  const el = document.getElementById('cart-total');
  if (el) el.textContent = total.toFixed(2);
}

// Initialize AOS when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.AOS) AOS.init({ duration: 500, once: true });
});
