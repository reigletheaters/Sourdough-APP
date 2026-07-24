/* =========================================================
   Mariah's Sourdough Co. — App
   Single-page app: hash router, cart, Venmo checkout,
   3D hero + effects (Showcase mode) or subtle polish (Sleek).
   ========================================================= */

'use strict';

/* ---------------- Catalog ---------------- */
const PRICE_PER_LOAF = 14;
const CART_KEY = 'mariahs_cart_v1';
const MODE_KEY = 'mariahs_mode';

const PRODUCTS = {
  classic: {
    id: 'classic', name: 'Classic', price: 12, img: 'classic.jpg',
    badge: 'Flagship — $12',
    alt: 'Classic Sourdough loaf on parchment',
    short: 'Crackling crust, open crumb, deep tangy flavor. Our flagship loaf.',
    long: 'A 36-hour cold ferment gives this loaf its trademark crackling crust and big, open crumb. Tangy, complex, and endlessly versatile.'
  },
  pretzel: {
    id: 'pretzel', name: 'Pretzel', price: PRICE_PER_LOAF,
    img: 'https://images.unsplash.com/photo-1617059584410-6b0fb5ae5b37?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80',
    badge: 'New',
    alt: 'Pretzel loaf with deep mahogany crust',
    short: 'Deep mahogany crust, soft chewy center, a sprinkle of coarse salt.',
    long: 'Our sourdough meets the pretzel: dipped for that deep mahogany crust and finished with coarse salt. Soft, chewy, and dangerously good with mustard or melted cheese.'
  },
  olive: {
    id: 'olive', name: 'Olive', price: PRICE_PER_LOAF,
    img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=600&q=80',
    badge: 'Savory',
    alt: 'Olive sourdough loaf',
    short: 'Briny Kalamatas folded into a savory, tender crumb.',
    long: 'Brined Kalamata olives baked into every slice. Mediterranean-inspired and unapologetically savory.'
  },
  chocolate: {
    id: 'chocolate', name: 'Chocolate Chip', price: PRICE_PER_LOAF, img: 'chocolate.jpg',
    badge: 'Sweet',
    alt: 'Sliced chocolate chip sourdough',
    short: 'Dark chocolate chunks in a slightly sweet sourdough — dessert-meets-bread.',
    long: 'Generous chunks of dark chocolate folded through a lightly sweetened sourdough. Toast it, butter it, thank us later.'
  },
  cinnamon: {
    id: 'cinnamon', name: 'Cinnamon Raisin', price: PRICE_PER_LOAF, img: 'cinnamon.webp',
    badge: 'Fan favorite',
    alt: 'Sliced cinnamon raisin swirl sourdough',
    short: 'Plump organic raisins, warm cinnamon swirl. Toasts like a dream.',
    long: 'Plump organic raisins and a generous cinnamon swirl. Perfect with butter, or French-toasted on a slow Sunday morning.'
  }
};

/* ---------------- Cart persistence ---------------- */
const _memoryCart = {};
let _useMemory = false;

function loadCart() {
  if (_useMemory) return { ..._memoryCart };
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { _useMemory = true; return { ..._memoryCart }; }
}
function saveCart(cart) {
  if (_useMemory) {
    Object.keys(_memoryCart).forEach(k => delete _memoryCart[k]);
    Object.assign(_memoryCart, cart);
    return;
  }
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch (e) { _useMemory = true; Object.assign(_memoryCart, cart); }
}
const getCart = () => loadCart();

function totalLoaves(cart) {
  cart = cart || getCart();
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

/* Discounts: 2–3 loaves = 10%, 4+ = 20% */
function discountRate(count) {
  if (count >= 4) return 0.20;
  if (count >= 2) return 0.10;
  return 0;
}

function cartTotals(cart) {
  cart = cart || getCart();
  let subtotal = 0;
  Object.keys(cart).forEach(id => {
    const p = PRODUCTS[id];
    if (p) subtotal += p.price * cart[id];
  });
  const count = totalLoaves(cart);
  const rate = discountRate(count);
  const discount = subtotal * rate;
  return { count, subtotal, rate, discount, total: subtotal - discount };
}

/* ---------------- Cart mutations ---------------- */
function addToCart(productId) {
  if (!PRODUCTS[productId]) return;
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart(cart);
  updateCartBadge(true);
  showToast(`${PRODUCTS[productId].name} added to cart`);
}
function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
  renderCart();
  updateCartBadge();
}
function setQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[productId];
  else cart[productId] = qty;
  saveCart(cart);
  renderCart();
  updateCartBadge();
}
function clearCart() {
  saveCart({});
  updateCartBadge();
}

function updateCartBadge(bump) {
  const count = totalLoaves();
  ['cart-badge', 'tab-cart-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.hidden = count === 0;
  });
  if (bump) {
    const link = document.querySelector('.cart-link');
    if (link) {
      link.classList.remove('bump');
      void link.offsetWidth;
      link.classList.add('bump');
    }
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/* =========================================================
   Router
   ========================================================= */
const ROUTES = {
  '': 'home', '/': 'home', '/shop': 'shop', '/about': 'about',
  '/why': 'why', '/cart': 'cart', '/checkout': 'checkout'
};

function currentRoute() {
  const hash = location.hash.replace(/^#/, '');
  return ROUTES[hash] !== undefined ? ROUTES[hash] : 'home';
}

function render() {
  const route = currentRoute();
  const tpl = document.getElementById('view-' + route);
  const app = document.getElementById('app');
  if (!tpl || !app) return;

  destroyHero3D();
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  // View transition
  app.classList.remove('view-enter');
  void app.offsetWidth;
  app.classList.add('view-enter');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  // Active nav state
  document.querySelectorAll('[data-route]').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  // Per-view setup
  document.querySelectorAll('[data-product-grid]').forEach(grid => {
    renderProductGrid(grid, grid.dataset.productGrid);
  });
  if (route === 'cart') renderCart();
  if (route === 'checkout') { renderVenmoCheckout(); wireVenmoForm(); }
  if (route === 'home' && isShowcase()) initHero3D();

  wireAddButtons(app);
  wireCopyButtons(app);
  observeReveals(app);
  applyCardTilt(app);
}

/* ---------------- Product grid ---------------- */
function renderProductGrid(grid, descKey) {
  grid.innerHTML = Object.values(PRODUCTS).map(p => `
    <article class="product-card reveal">
      <div class="product-img-wrap">
        <img class="product-img" src="${p.img}" alt="${escapeHtml(p.alt)}" loading="lazy">
        <span class="product-badge">${escapeHtml(p.badge)}</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(descKey === 'long' ? p.long : p.short)}</p>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <button class="add-btn" data-product="${p.id}">Add to cart</button>
      </div>
    </article>`).join('');
}

function wireAddButtons(scope) {
  (scope || document).querySelectorAll('.add-btn[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.product;
      addToCart(id);
      flyToCart(btn, id);
      const original = btn.textContent;
      btn.textContent = 'Added!';
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('added');
      }, 1100);
    });
  });
}

/* Fly-to-cart animation (Showcase mode) */
function flyToCart(btn, productId) {
  if (!isShowcase()) return;
  const card = btn.closest('.product-card');
  const img = card && card.querySelector('.product-img');
  const target = document.querySelector('.tab-bar a.tab-cart:not([hidden])') &&
                 getComputedStyle(document.querySelector('.tab-bar')).display !== 'none'
                 ? document.querySelector('.tab-cart') : document.querySelector('.cart-link');
  if (!img || !target) return;

  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = document.createElement('img');
  ghost.src = img.src;
  ghost.className = 'fly-img';
  ghost.style.left = (from.left + from.width / 2 - 32) + 'px';
  ghost.style.top = (from.top + from.height / 2 - 32) + 'px';
  document.body.appendChild(ghost);

  requestAnimationFrame(() => {
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.15) rotate(180deg)`;
    ghost.style.opacity = '0.2';
  });
  setTimeout(() => ghost.remove(), 750);
}

/* ---------------- Copy buttons ---------------- */
function wireCopyButtons(scope) {
  (scope || document).querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      navigator.clipboard.writeText(el.innerText).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1200);
      });
    });
  });
}

/* =========================================================
   Cart view
   ========================================================= */
function renderCart() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  const cart = getCart();
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Pick up a loaf (or four — that's 20% off!) from our shop.</p>
        <a class="btn" href="#/shop" data-link>Browse loaves</a>
      </div>`;
    return;
  }

  let rowsHtml = '';
  ids.forEach(id => {
    const p = PRODUCTS[id];
    if (!p) return;
    const qty = cart[id];
    rowsHtml += `
      <tr>
        <td><img class="cart-thumb" src="${p.img}" alt="${escapeHtml(p.name)}"></td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <div class="qty-ctrl">
            <button data-qty="${id}:${qty - 1}" aria-label="Decrease">−</button>
            <span>${qty}</span>
            <button data-qty="${id}:${qty + 1}" aria-label="Increase">+</button>
          </div>
        </td>
        <td>$${(p.price * qty).toFixed(2)}</td>
        <td><button class="remove-btn" data-remove="${id}">Remove</button></td>
      </tr>`;
  });

  const { count, subtotal, rate, discount, total } = cartTotals(cart);

  let dealMsg = '';
  if (count === 1) dealMsg = `<p class="discount">Add 1 more loaf to unlock 10% off!</p>`;
  else if (count === 2 || count === 3) dealMsg = `<p class="discount">You're saving 10%! Add ${4 - count} more for 20% off.</p>`;
  else if (count >= 4) dealMsg = `<p class="discount">You're saving 20% — nice haul!</p>`;

  const meterPct = Math.min(100, (count / 4) * 100);
  const meterLabel = count >= 4 ? 'Maximum savings unlocked 🎉'
    : count >= 2 ? `${4 - count} more ${4 - count > 1 ? 'loaves' : 'loaf'} to 20% off`
    : `${2 - count} more ${2 - count > 1 ? 'loaves' : 'loaf'} to 10% off`;

  container.innerHTML = `
    <table class="cart-table">
      <thead><tr><th></th><th>Loaf</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="discount-meter">
      <div class="dm-track"><div class="dm-fill" style="width:${meterPct}%"></div></div>
      <div class="dm-label">${meterLabel}</div>
    </div>

    <div class="cart-summary">
      <div class="row"><span>Loaves</span><span>${count}</span></div>
      <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      ${rate > 0 ? `<div class="row discount"><span>Discount (${(rate * 100).toFixed(0)}% off)</span><span>−$${discount.toFixed(2)}</span></div>` : ''}
      <div class="row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      ${dealMsg}
      <a class="btn w-100 mt-14 center" style="display:block;" href="#/checkout" data-link>Checkout</a>
    </div>`;

  container.querySelectorAll('[data-qty]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [id, qty] = btn.dataset.qty.split(':');
      setQty(id, parseInt(qty, 10));
    });
  });
  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
  });
}

/* =========================================================
   Checkout view (Venmo + Formspree)
   ========================================================= */
function renderVenmoCheckout() {
  const cart = getCart();
  const ids = Object.keys(cart);
  const main = document.getElementById('checkout-main');
  if (!main) return;

  if (ids.length === 0) {
    main.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Nothing to check out yet!</p>
        <a class="btn" href="#/shop" data-link>Browse loaves</a>
      </div>`;
    return;
  }

  const totals = cartTotals(cart);
  let itemsHtml = '';
  let orderItemsText = '';
  ids.forEach(id => {
    const p = PRODUCTS[id];
    if (!p) return;
    const qty = cart[id];
    itemsHtml += `
      <div class="co-line">
        <img src="${p.img}" alt="${escapeHtml(p.name)}">
        <div class="co-line-body">
          <div class="co-line-name">${escapeHtml(p.name)}</div>
          <div class="co-line-qty">Qty ${qty} × $${p.price.toFixed(2)}</div>
        </div>
        <div class="co-line-total">$${(p.price * qty).toFixed(2)}</div>
      </div>`;
    orderItemsText += `${p.name} × ${qty} = $${(p.price * qty).toFixed(2)}\n`;
  });
  document.getElementById('summary-lines').innerHTML = itemsHtml;

  let totalsHtml = `
    <div class="row"><span>Loaves</span><span>${totals.count}</span></div>
    <div class="row"><span>Subtotal</span><span>$${totals.subtotal.toFixed(2)}</span></div>`;
  if (totals.rate > 0) {
    totalsHtml += `<div class="row discount"><span>Discount (${(totals.rate * 100).toFixed(0)}% off)</span><span>−$${totals.discount.toFixed(2)}</span></div>`;
  }
  totalsHtml += `
    <div class="row"><span>Delivery</span><span>$0.00</span></div>
    <div class="row total"><span>Total</span><span>$${totals.total.toFixed(2)}</span></div>`;
  document.getElementById('summary-totals').innerHTML = totalsHtml;

  document.getElementById('amount-display').textContent = `$${totals.total.toFixed(2)}`;
  document.getElementById('hidden-order-items').value = orderItemsText.trim();
  document.getElementById('hidden-subtotal').value = `$${totals.subtotal.toFixed(2)}`;
  document.getElementById('hidden-discount').value = totals.rate > 0
    ? `${(totals.rate * 100).toFixed(0)}% off (−$${totals.discount.toFixed(2)})` : 'none';
  document.getElementById('hidden-total').value = `$${totals.total.toFixed(2)}`;
  document.getElementById('hidden-count').value = totals.count;
}

function wireVenmoForm() {
  const form = document.getElementById('venmo-order-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const errorBox = document.getElementById('submit-error');
    errorBox.classList.remove('show');

    const name = (form.querySelector('[name="full_name"]').value || '').trim();
    if (!name) {
      errorBox.textContent = 'Please enter your full name so Mariah knows who the order is from.';
      errorBox.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    const data = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        showOrderConfirmation(
          data.get('full_name') || 'friend',
          data.get('order_total') || '',
          data.get('loaf_count') || ''
        );
        clearCart();
      } else {
        const errData = await response.json().catch(() => ({}));
        errorBox.textContent = (errData.error || 'Something went wrong submitting your order. Please try again, or text Mariah directly.');
        errorBox.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = "I've sent payment — submit order";
      }
    } catch (err) {
      errorBox.textContent = 'Network error — please check your connection and try again.';
      errorBox.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = "I've sent payment — submit order";
    }
  });
}

function showOrderConfirmation(name, total, count) {
  const main = document.getElementById('checkout-main');
  const orderNum = 'MSC-' + Date.now().toString().slice(-7);
  main.innerHTML = `
    <div class="co-success">
      <div class="co-success-icon">✓</div>
      <h1>Order received!</h1>
      <p class="co-success-sub">Thanks, ${escapeHtml(name)}. We've got your order for <strong>${escapeHtml(count)} ${count == 1 ? 'loaf' : 'loaves'}</strong> totaling <strong>${escapeHtml(total)}</strong>.</p>
      <div class="co-order-num">Order number: <strong>${orderNum}</strong></div>
      <p>Mariah will text you within a few hours to confirm the Venmo payment came through.</p>
      <a class="btn" href="#/" data-link>Back to home</a>
      &nbsp;
      <a class="btn secondary" href="#/shop" data-link>Keep shopping</a>
    </div>`;
  updateCartBadge();
  if (isShowcase()) launchConfetti();
}

function launchConfetti() {
  const colors = ['#E8B14B', '#D9542B', '#6B8A4E', '#F4E6C9', '#C9892B'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
    c.style.animationDelay = (Math.random() * 0.8) + 's';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5500);
  }
}

/* =========================================================
   Visual mode (Showcase / Sleek)
   ========================================================= */
function isShowcase() { return document.body.classList.contains('mode-showcase'); }

function setMode(mode, persist) {
  document.body.classList.toggle('mode-showcase', mode === 'showcase');
  document.body.classList.toggle('mode-sleek', mode === 'sleek');
  const label = document.getElementById('mode-label');
  if (label) label.textContent = mode === 'showcase' ? 'Showcase' : 'Sleek';
  if (persist) {
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  }
  // Rebuild current view so mode-specific pieces (3D hero, particles) mount/unmount
  if (mode === 'showcase') { startParticles(); if (currentRoute() === 'home') initHero3D(); }
  else { stopParticles(); destroyHero3D(); }
}

function wireModeToggle() {
  const btn = document.getElementById('mode-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = isShowcase() ? 'sleek' : 'showcase';
    setMode(next, true);
    showToast(next === 'showcase' ? '✨ Showcase mode — full experience' : '🌿 Sleek mode — fast & subtle');
  });
}

/* =========================================================
   Scroll reveals
   ========================================================= */
let _revealObserver = null;
function observeReveals(scope) {
  if (!('IntersectionObserver' in window)) {
    (scope || document).querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  if (!_revealObserver) {
    _revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
  }
  (scope || document).querySelectorAll('.reveal').forEach(el => _revealObserver.observe(el));
}

/* =========================================================
   3D card tilt (Showcase, fine pointers only)
   ========================================================= */
function applyCardTilt(scope) {
  if (!window.matchMedia || !matchMedia('(pointer: fine)').matches) return;
  (scope || document).querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      if (!isShowcase()) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* =========================================================
   Ambient flour particles (2D canvas, Showcase)
   ========================================================= */
let _particlesRAF = null;
function startParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas || _particlesRAF) return;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof requestAnimationFrame === 'undefined') return;
  let w, h, motes;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  motes = Array.from({ length: 42 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.8 + Math.random() * 2.2,
    vx: -0.08 + Math.random() * 0.16,
    vy: 0.05 + Math.random() * 0.22,
    o: 0.15 + Math.random() * 0.4
  }));

  function tick() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#E8B14B';
    motes.forEach(m => {
      m.x += m.vx; m.y += m.vy;
      if (m.y > h + 5) { m.y = -5; m.x = Math.random() * w; }
      if (m.x < -5) m.x = w + 5;
      if (m.x > w + 5) m.x = -5;
      ctx.globalAlpha = m.o;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    _particlesRAF = requestAnimationFrame(tick);
  }
  tick();
}
function stopParticles() {
  if (_particlesRAF) { cancelAnimationFrame(_particlesRAF); _particlesRAF = null; }
  const canvas = document.getElementById('particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* =========================================================
   Three.js 3D bread hero (Showcase, home route)
   ========================================================= */
let _hero3d = null;

function initHero3D() {
  const mount = document.getElementById('hero-3d');
  if (!mount || typeof THREE === 'undefined' || _hero3d) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) { return; } // no WebGL → photo hero still shows

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 1.35, 6.8);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  mount.appendChild(renderer.domElement);

  // Lighting — soft warm daylight, no glow
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x6b5335, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dd, 0.95);
  key.position.set(3.5, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe6c2, 0.22);
  fill.position.set(-4, 2, 3);
  scene.add(fill);

  // ---- Procedural sourdough textures ----
  // Texture space: X = around the loaf (512 = top), Y = along the length.
  function makeLoafTextures() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');

    // Floured crust base: pale on top, deeper tan around the sides/bottom
    for (let x = 0; x < 1024; x++) {
      const d = Math.abs(x - 512) / 512; // 0 = top of loaf, 1 = bottom
      const r = Math.round(211 - d * 63);
      const gr = Math.round(180 - d * 84);
      const b = Math.round(132 - d * 88);
      g.fillStyle = 'rgb(' + r + ',' + gr + ',' + b + ')';
      g.fillRect(x, 0, 1, 1024);
    }

    // Brown bake mottling under the flour
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const rr = 2 + Math.random() * 12;
      g.globalAlpha = 0.04 + Math.random() * 0.05;
      g.fillStyle = Math.random() > 0.45 ? '#8a5a24' : '#e9d6ae';
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    // Larger toasted patches
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const rr = 14 + Math.random() * 36;
      g.globalAlpha = 0.03 + Math.random() * 0.05;
      g.fillStyle = '#a5641f';
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    // Lengthwise bake streaks
    for (let i = 0; i < 130; i++) {
      const x = Math.random() * 1024;
      const y0 = Math.random() * 900;
      g.globalAlpha = 0.04 + Math.random() * 0.05;
      g.strokeStyle = '#8a5a24';
      g.lineWidth = 1.5 + Math.random() * 3;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x + (Math.random() - 0.5) * 30, y0 + 60 + Math.random() * 160);
      g.stroke();
    }

    // Heavy flour / semolina speckle (denser near the top)
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 1024;
      const d = Math.abs(x - 512) / 512;
      if (Math.random() < d * 0.55) continue;
      g.globalAlpha = 0.08 + Math.random() * 0.15;
      g.fillStyle = Math.random() > 0.5 ? '#f3e6c8' : '#efe0bd';
      const s = 0.7 + Math.random() * 1.9;
      g.fillRect(x, Math.random() * 1024, s, s);
    }

    // ---- The burst: big open score with golden crumb showing ----
    const yTop = 280, yBot = 760;
    const leftPts = [], rightPts = [];
    for (let y = yTop; y <= yBot; y += 10) {
      const t = (y - yTop) / (yBot - yTop);
      const half = 58 * Math.pow(Math.sin(Math.PI * t), 0.55)
                 + Math.sin(y * 0.045) * 5 + (Math.random() - 0.5) * 8;
      leftPts.push([512 - half, y]);
      rightPts.push([512 + half, y]);
    }

    function tracePoly() {
      g.beginPath();
      g.moveTo(leftPts[0][0], leftPts[0][1]);
      leftPts.forEach(p => g.lineTo(p[0], p[1]));
      for (let i = rightPts.length - 1; i >= 0; i--) g.lineTo(rightPts[i][0], rightPts[i][1]);
      g.closePath();
    }

    // Crumb base
    g.globalAlpha = 1;
    tracePoly();
    g.fillStyle = '#d08434';
    g.fill();

    // Warm glow toward the center of the burst
    const glow = g.createRadialGradient(512, 520, 20, 512, 520, 250);
    glow.addColorStop(0, 'rgba(255,195,110,0.75)');
    glow.addColorStop(1, 'rgba(255,190,105,0)');
    tracePoly();
    g.fillStyle = glow;
    g.fill();

    // Crumb bubbles + shiny spots (clip to the burst)
    g.save();
    tracePoly();
    g.clip();
    for (let i = 0; i < 620; i++) {
      const y = yTop + Math.random() * (yBot - yTop);
      const x = 512 + (Math.random() - 0.5) * 112;
      g.globalAlpha = 0.15 + Math.random() * 0.25;
      g.fillStyle = '#9c5a1c';
      const rr = 1 + Math.random() * 5;
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 260; i++) {
      const y = yTop + Math.random() * (yBot - yTop);
      const x = 512 + (Math.random() - 0.5) * 104;
      g.globalAlpha = 0.15 + Math.random() * 0.28;
      g.fillStyle = '#ffd894';
      const rr = 0.8 + Math.random() * 2.6;
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    // Torn crust lip: pale flour ridge outside, dark crust edge inside
    function strokeEdge(pts) {
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.globalAlpha = 0.85;
      g.strokeStyle = '#ecd9ae';
      g.lineWidth = 17;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(p => g.lineTo(p[0], p[1]));
      g.stroke();
      g.globalAlpha = 0.95;
      g.strokeStyle = '#5a2f0e';
      g.lineWidth = 8;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(p => g.lineTo(p[0], p[1]));
      g.stroke();
      g.globalAlpha = 0.5;
      g.strokeStyle = '#f4c274';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(pts[0][0] + 4, pts[0][1]);
      pts.forEach(p => g.lineTo(p[0] + 4, p[1]));
      g.stroke();
    }
    strokeEdge(leftPts);
    strokeEdge(rightPts);

    // ---- Wheat-stalk scoring on the floured shoulder ----
    [380, 644].forEach(function (stalkX) {
    g.globalAlpha = 0.75;
    g.strokeStyle = '#6b3c14';
    g.lineWidth = 3;
    g.beginPath();
    for (let y = 165; y <= 860; y += 8) {
      const x = stalkX + Math.sin(y * 0.02) * 6;
      y === 165 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    for (let k = 0; k < 13; k++) {
      const y = 190 + k * 52;
      const side = k % 2 === 0 ? -1 : 1;
      const x = stalkX + Math.sin(y * 0.02) * 6 + side * 15;
      g.save();
      g.translate(x, y);
      g.rotate(side * 0.62);
      g.globalAlpha = 0.85;
      g.fillStyle = '#6f3f16';
      g.beginPath(); g.ellipse(0, 0, 10, 25, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.45;
      g.strokeStyle = '#efe0bd';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, 0, 11.5, 27, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    });

    // Darker rounded ends of the loaf
    [[0, 135], [889, 1024]].forEach(([a, b]) => {
      const eg = g.createLinearGradient(0, a === 0 ? b : a, 0, a === 0 ? a : b);
      eg.addColorStop(0, 'rgba(110,62,22,0)');
      eg.addColorStop(1, 'rgba(110,62,22,0.28)');
      g.globalAlpha = 1;
      g.fillStyle = eg;
      g.fillRect(0, a, 1024, b - a);
    });

    const map = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) map.encoding = THREE.sRGBEncoding;

    // ---- Bump: crumb bubbles, crust lip ridge, leaf cuts, fine grain ----
    const b2 = document.createElement('canvas');
    b2.width = b2.height = 512;
    const bg = b2.getContext('2d');
    bg.fillStyle = '#808080';
    bg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(112 + Math.random() * 34);
      bg.globalAlpha = 0.5;
      bg.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      bg.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    // burst raised + bubbly
    bg.globalAlpha = 0.5;
    bg.fillStyle = '#a6a6a6';
    bg.fillRect(227, 140, 58, 240);
    for (let i = 0; i < 420; i++) {
      const x = 256 + (Math.random() - 0.5) * 54;
      const y = 140 + Math.random() * 240;
      bg.globalAlpha = 0.35 + Math.random() * 0.3;
      bg.fillStyle = '#565656';
      const rr = 0.8 + Math.random() * 2.8;
      bg.beginPath(); bg.arc(x, y, rr, 0, Math.PI * 2); bg.fill();
    }
    // crust lip ridges
    bg.globalAlpha = 0.85;
    bg.strokeStyle = '#e2e2e2';
    bg.lineWidth = 5;
    [227, 285].forEach(x => {
      bg.beginPath(); bg.moveTo(x, 140); bg.lineTo(x, 380); bg.stroke();
    });
    // leaf cuts recessed
    [190, 322].forEach(function (bx) {
    for (let k = 0; k < 13; k++) {
      const y = (190 + k * 52) / 2;
      const side = k % 2 === 0 ? -1 : 1;
      const x = bx + side * 8;
      bg.save();
      bg.translate(x, y);
      bg.rotate(side * 0.62);
      bg.globalAlpha = 0.8;
      bg.fillStyle = '#4a4a4a';
      bg.beginPath(); bg.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2); bg.fill();
      bg.restore();
    }
    });
    const bump = new THREE.CanvasTexture(b2);

    // ---- Roughness: crust matte, exposed crumb glossier ----
    const r2 = document.createElement('canvas');
    r2.width = r2.height = 256;
    const rg2 = r2.getContext('2d');
    rg2.fillStyle = '#d6d6d6';
    rg2.fillRect(0, 0, 256, 256);
    rg2.fillStyle = '#6f6f6f';
    rg2.fillRect(114, 70, 28, 120);
    const rough = new THREE.CanvasTexture(r2);

    return { map, bump, rough };
  }

  // ---- The loaf: batard (oval), poles at the ends, flat bottom ----
  const loaf = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(1.5, 96, 64);
  bodyGeo.rotateZ(Math.PI / 2); // poles now at the ends of the loaf

  const pos = bodyGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      0.016 * Math.sin(3.1 * v.x + 1.7) * Math.sin(2.7 * v.z - 0.8) +
      0.010 * Math.sin(5.3 * v.y + 2.1) * Math.sin(4.1 * v.x + 0.6);
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  bodyGeo.scale(1.5, 0.85, 0.92);

  // Flat bottom
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -1.02) pos.setY(i, -1.02 + (y + 1.02) * 0.2);
  }
  bodyGeo.computeVertexNormals();

  const loafTex = makeLoafTextures();
  const crustMat = new THREE.MeshStandardMaterial({
    map: loafTex.map,
    bumpMap: loafTex.bump,
    bumpScale: 0.03,
    roughnessMap: loafTex.rough,
    roughness: 1.0,
    metalness: 0.0
  });
  const body = new THREE.Mesh(bodyGeo, crustMat);
  loaf.add(body);

  // Flour dust ring around the loaf
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 160;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.4 + Math.random() * 2.4;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.4) * 2.6;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xfff8ec, size: 0.045, transparent: true, opacity: 0.65
  }));
  scene.add(dust);

  loaf.position.y = -0.35;
  scene.add(loaf);

  // Soft contact shadow beneath the loaf (grounds it)
  const shCanvas = document.createElement('canvas');
  shCanvas.width = shCanvas.height = 256;
  const shCtx = shCanvas.getContext('2d');
  const shGrad = shCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
  shGrad.addColorStop(0, 'rgba(30,16,5,0.42)');
  shGrad.addColorStop(0.6, 'rgba(30,16,5,0.18)');
  shGrad.addColorStop(1, 'rgba(30,16,5,0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 256, 256);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shCanvas),
    transparent: true,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.2), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.62;
  scene.add(shadow);

  // Mouse parallax
  let targetRX = 0, targetRY = 0;
  const onMove = (e) => {
    const nx = (e.clientX / window.innerWidth) - 0.5;
    const ny = (e.clientY / window.innerHeight) - 0.5;
    targetRY = nx * 0.5;
    targetRX = ny * 0.25;
  };
  window.addEventListener('mousemove', onMove);

  const onResize = () => {
    if (!mount.clientWidth) return;
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  window.addEventListener('resize', onResize);

  const clock = new THREE.Clock();
  let raf = null;
  function animate() {
    raf = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    loaf.rotation.y += 0.0035;
    loaf.rotation.x += (targetRX * 0.35 - loaf.rotation.x) * 0.04;
    const bob = Math.sin(t * 0.9) * 0.07;
    loaf.position.y = -0.35 + bob;
    shadowMat.opacity = 0.85 - bob * 1.6;
    shadow.scale.setScalar(1 - bob * 0.12);

    dust.rotation.y = t * 0.05;

    camera.position.x += (targetRY * 1.4 - camera.position.x) * 0.04;
    camera.position.y += (1.35 - targetRX * 1.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  _hero3d = {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };
}

function destroyHero3D() {
  if (_hero3d) { _hero3d.destroy(); _hero3d = null; }
}

/* Pause heavy work when the tab is hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopParticles(); }
  else if (isShowcase()) { startParticles(); }
});

/* =========================================================
   PWA: service worker + install prompt
   ========================================================= */
function initPWA() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  let deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    showToast('🍞 App installed — welcome to the bakery!');
  });
}

/* =========================================================
   Boot
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Restore visual mode
  let saved = 'showcase';
  try { saved = localStorage.getItem(MODE_KEY) || 'showcase'; } catch (e) {}
  setMode(saved, false);

  wireModeToggle();
  updateCartBadge();
  initPWA();
  render();

  window.addEventListener('hashchange', render);
});
