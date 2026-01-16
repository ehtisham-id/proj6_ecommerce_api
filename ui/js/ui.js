// Universal render functions
function renderProducts(products, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = products.map(p => `
    <div class="product-card">
      <h3>${p.name}</h3>
      <p>$${p.price}</p>
      <a href="product.html?id=${p.id}">View</a>
    </div>
  `).join('');
}

function renderCategories(categories, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = categories.map(c => `
    <div>${c.name}</div>
  `).join('');
}

function renderCartItems(items) {
    document.getElementById('cart-items').innerHTML = items.map(item => `
    <div class="cart-item">
      ${item.product.name} x${item.quantity}
      <button onclick="cart.remove('${item.id}')">Remove</button>
    </div>
  `).join('');
}

function updateCartTotal(total) {
    document.getElementById('cart-total').textContent = total.toFixed(2);
}
