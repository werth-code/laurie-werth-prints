/* ═══════════════════════════════════════════════
   Laurie Werth Fine Art — Site Application
   ═══════════════════════════════════════════════

   PRINT SERVICE CONFIGURATION
   ───────────────────────────
   Change `provider` below to connect a different
   checkout/fulfillment service. Each provider has
   its own setup requirements — see README.md.
*/

const PrintServiceConfig = {
  provider: 'manual',
  // ─── Provider-specific settings ───

  // Snipcart: JS-based cart, works on static sites
  // 1. Sign up at snipcart.com
  // 2. Paste your public API key below
  // 3. Snipcart handles cart UI, checkout, payment
  // 4. Set up webhook to forward orders to Prodigi/Printful
  snipcart: {
    apiKey: '',
    currency: 'usd',
    webhookUrl: ''
  },

  // Stripe Checkout: redirect to Stripe-hosted page
  // 1. Create products in Stripe Dashboard
  // 2. Map each SKU to a Stripe Price ID below
  // 3. Deploy a tiny serverless function to create Checkout Sessions
  stripe: {
    publishableKey: '',
    checkoutEndpoint: '',
    priceMap: {}
  },

  // Prodigi: print-on-demand fulfillment
  // 1. Sign up at prodigi.com
  // 2. Connect Wix/Shopify store OR use API
  // 3. Deploy serverless function to proxy orders
  prodigi: {
    apiKey: '',
    environment: 'sandbox',
    orderEndpoint: ''
  },

  // Manual: sends order details via email (works immediately)
  manual: {
    email: 'hello@lauriewerth.com',
    formAction: 'https://formspree.io/f/YOUR_FORM_ID'
  }
};


/* ═══ State ═══ */
let products = [];
let cart = JSON.parse(localStorage.getItem('lw-cart') || '[]');
let activeFilter = 'all';
let currentModal = null;

/* Display labels for collection keys (museum-caption style) */
const COLLECTION_LABELS = {
  botanical: 'Ink, Watercolor & Salt',
  animals: 'Animal Portrait',
  landscape: 'Landscape'
};
const collectionLabel = key => COLLECTION_LABELS[key] || key;


/* ═══ Init ═══ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderProducts();
  updateCartUI();
  initHeader();
  initFilters();
  initCollectionCards();
  initCart();
  initModal();
  initScrollReveal();
  initMobileMenu();
  initForms();
  initPrintService();
});


/* ═══ Product Loading ═══ */
async function loadProducts() {
  try {
    const res = await fetch('data/products.json');
    products = await res.json();
  } catch {
    products = [];
  }
}


/* ═══ Product Rendering ═══ */
function renderProducts(filter = 'all') {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  const filtered = filter === 'all'
    ? products
    : products.filter(p => {
        if (filter === 'limited') return p.limited;
        return p.collection === filter;
      });

  grid.innerHTML = filtered.map((p, i) => {
    const minPrice = Math.min(...p.variants.map(v => v.price));
    const maxPrice = Math.max(...p.variants.map(v => v.price));
    const priceDisplay = minPrice === maxPrice
      ? `$${minPrice}`
      : `$${minPrice} – $${maxPrice}`;

    return `
      <article class="product-card reveal reveal--delay-${(i % 4) + 1}"
               data-product-id="${p.id}"
               data-collection="${p.collection}">
        ${p.badge ? `<span class="product-card__badge ${p.limited ? 'product-card__badge--limited' : ''}">${p.badge}</span>` : ''}
        <div class="product-card__image" data-action="quickview" data-product="${p.id}">
          <img src="${p.image}" alt="${p.title} — ${p.description}" width="600" height="750" loading="lazy">
          <button class="product-card__quick-view" aria-label="View ${p.title} details">Quick View</button>
        </div>
        <div class="product-card__body">
          <h3 class="product-card__title">${p.title}</h3>
          <p class="product-card__collection">${collectionLabel(p.collection)}</p>
          <p class="product-card__price">
            ${priceDisplay}
            ${p.variants.length > 1 ? `<span class="product-card__price-range">${p.variants.length} sizes</span>` : ''}
          </p>
        </div>
      </article>
    `;
  }).join('');

  observeReveals();
}


/* ═══ Filtering ═══ */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.filter-btn--active')?.classList.remove('filter-btn--active');
      btn.classList.add('filter-btn--active');
      activeFilter = btn.dataset.filter;
      renderProducts(activeFilter);
    });
  });
}

function initCollectionCards() {
  document.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (!filter) return;

      document.querySelector('.filter-btn--active')?.classList.remove('filter-btn--active');
      const matchBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
      if (matchBtn) matchBtn.classList.add('filter-btn--active');
      else {
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.classList.add('filter-btn--active');
      }

      activeFilter = filter;
      renderProducts(filter);

      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}


/* ═══ Product Modal ═══ */
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('productModal');
  const close = document.getElementById('modalClose');

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-action="quickview"]');
    if (trigger) {
      const id = trigger.dataset.product;
      openModal(id);
    }
  });

  close?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentModal = { product, selectedVariant: 0 };
  renderModal();

  document.getElementById('modalOverlay')?.classList.add('active');
  document.getElementById('productModal')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('active');
  document.getElementById('productModal')?.classList.remove('active');
  document.body.style.overflow = '';
  currentModal = null;
}

function renderModal() {
  if (!currentModal) return;
  const { product, selectedVariant } = currentModal;
  const content = document.getElementById('modalContent');
  if (!content) return;

  content.innerHTML = `
    <div class="modal__image">
      <img src="${product.image}" alt="${product.title}" width="600" height="750">
    </div>
    <div class="modal__content">
      ${product.badge ? `<span class="product-card__badge modal__badge ${product.limited ? 'product-card__badge--limited' : ''}">${product.badge}</span>` : ''}
      <h2 class="modal__title">${product.title}</h2>
      <p class="modal__collection">${collectionLabel(product.collection)}</p>
      <p class="modal__description">${product.description}</p>
      ${product.artistNote ? `<blockquote class="modal__artist-note">"${product.artistNote}"</blockquote>` : ''}
      <div class="modal__variants">
        ${product.variants.map((v, i) => `
          <button class="variant-btn ${i === selectedVariant ? 'variant-btn--active' : ''}"
                  data-variant-index="${i}">
            <div>
              <span class="variant-btn__label">${v.label}</span>
              <span class="variant-btn__stock">${v.stock > 5 ? 'In stock' : v.stock > 0 ? `Only ${v.stock} left` : 'Sold out'}</span>
            </div>
            <span class="variant-btn__price">$${v.price}</span>
          </button>
        `).join('')}
      </div>
      <button class="btn btn--primary modal__add-to-cart" id="modalAddToCart"
              ${product.variants[selectedVariant].stock <= 0 ? 'disabled' : ''}>
        ${product.variants[selectedVariant].stock <= 0 ? 'Sold Out' : `Add to Cart — $${product.variants[selectedVariant].price}`}
      </button>
      ${product.process ? `
        <div class="modal__process">
          ${product.process.map(p => `<span class="process-tag">${p}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  content.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentModal.selectedVariant = parseInt(btn.dataset.variantIndex);
      renderModal();
    });
  });

  document.getElementById('modalAddToCart')?.addEventListener('click', () => {
    const variant = product.variants[selectedVariant];
    if (variant.stock <= 0) return;
    addToCart(product, variant);
    closeModal();
    openCart();
  });
}


/* ═══ Cart System ═══ */
function initCart() {
  document.getElementById('cartToggle')?.addEventListener('click', toggleCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  drawer?.classList.contains('active') ? closeCart() : openCart();
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('active');
  document.getElementById('cartOverlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('active');
  document.getElementById('cartOverlay')?.classList.remove('active');
  if (!document.getElementById('productModal')?.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

function addToCart(product, variant) {
  const existing = cart.find(item => item.sku === variant.sku);
  if (existing) {
    if (existing.qty < variant.stock) existing.qty++;
  } else {
    cart.push({
      productId: product.id,
      title: product.title,
      image: product.image,
      sku: variant.sku,
      label: variant.label,
      price: variant.price,
      weight: variant.weight,
      prodigiSku: variant.prodigiSku,
      qty: 1,
      maxQty: variant.stock
    });
  }
  saveCart();
  updateCartUI();
  showToast(`${product.title} added to cart`);
}

function removeFromCart(sku) {
  cart = cart.filter(item => item.sku !== sku);
  saveCart();
  updateCartUI();
}

function updateQty(sku, delta) {
  const item = cart.find(i => i.sku === sku);
  if (!item) return;
  item.qty = Math.max(1, Math.min(item.maxQty, item.qty + delta));
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('lw-cart', JSON.stringify(cart));
}

function updateCartUI() {
  const countEl = document.getElementById('cartCount');
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (countEl) {
    countEl.textContent = totalItems;
    countEl.dataset.count = totalItems;
    countEl.classList.remove('header__cart-count--bounce');
    void countEl.offsetWidth;
    if (totalItems > 0) countEl.classList.add('header__cart-count--bounce');
  }

  if (footerEl) footerEl.style.display = cart.length > 0 ? 'block' : 'none';
  if (subtotalEl) subtotalEl.textContent = `$${subtotal}`;

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-drawer__empty">
        <img class="cart-drawer__empty-icon" src="assets/brand/signature-ink.png" alt="">
        <p class="cart-drawer__empty-text">Your cart is empty</p>
        <a href="#shop" class="btn btn--outline btn--sm" onclick="document.getElementById('cartDrawer').classList.remove('active');document.getElementById('cartOverlay').classList.remove('active');document.body.style.overflow='';">Browse the Work</a>
      </div>
    `;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-sku="${item.sku}">
      <div class="cart-item__image">
        <img src="${item.image}" alt="${item.title}" width="80" height="100" loading="lazy">
      </div>
      <div>
        <h4 class="cart-item__title">${item.title}</h4>
        <p class="cart-item__variant">${item.label}</p>
        <div class="cart-item__qty">
          <button class="qty-btn" data-action="qty" data-sku="${item.sku}" data-delta="-1" aria-label="Decrease quantity">−</button>
          <span class="cart-item__count">${item.qty}</span>
          <button class="qty-btn" data-action="qty" data-sku="${item.sku}" data-delta="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div>
        <p class="cart-item__price">$${item.price * item.qty}</p>
        <button class="cart-item__remove" data-action="remove" data-sku="${item.sku}">Remove</button>
      </div>
    </div>
  `).join('');

  itemsEl.querySelectorAll('[data-action="qty"]').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQty(btn.dataset.sku, parseInt(btn.dataset.delta));
    });
  });

  itemsEl.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.sku);
    });
  });
}


/* ═══ Print Service Integration ═══ */
function initPrintService() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  const providerNote = document.getElementById('providerNote');
  const provider = PrintServiceConfig.provider;

  const labels = {
    snipcart: 'Secure checkout via Snipcart',
    stripe: 'Secure checkout via Stripe',
    prodigi: 'Fulfilled by Prodigi',
    manual: 'Order sent via email'
  };

  if (providerNote) providerNote.textContent = labels[provider] || '';

  if (provider === 'snipcart' && PrintServiceConfig.snipcart.apiKey) {
    loadSnipcart(PrintServiceConfig.snipcart.apiKey);
  }

  checkoutBtn?.addEventListener('click', () => handleCheckout());
}

function handleCheckout() {
  if (cart.length === 0) return;
  const provider = PrintServiceConfig.provider;

  switch (provider) {
    case 'snipcart':
      checkoutSnipcart();
      break;
    case 'stripe':
      checkoutStripe();
      break;
    case 'prodigi':
      checkoutProdigi();
      break;
    case 'manual':
    default:
      checkoutManual();
  }
}

function checkoutSnipcart() {
  if (typeof Snipcart !== 'undefined') {
    cart.forEach(item => {
      Snipcart.api.cart.items.add({
        id: item.sku,
        name: `${item.title} — ${item.label}`,
        price: item.price,
        quantity: item.qty,
        url: window.location.href,
        image: item.image,
        weight: item.weight
      });
    });
  }
}

async function checkoutStripe() {
  const { checkoutEndpoint, priceMap } = PrintServiceConfig.stripe;
  if (!checkoutEndpoint) {
    showToast('Stripe not configured — see README.md');
    return;
  }
  try {
    const lineItems = cart.map(item => ({
      price: priceMap[item.sku],
      quantity: item.qty
    })).filter(li => li.price);

    const res = await fetch(checkoutEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItems })
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch {
    showToast('Checkout failed — please try again');
  }
}

async function checkoutProdigi() {
  const { orderEndpoint } = PrintServiceConfig.prodigi;
  if (!orderEndpoint) {
    showToast('Prodigi not configured — see README.md');
    return;
  }
  showToast('Redirecting to checkout…');
}

function checkoutManual() {
  const subject = encodeURIComponent('Print Order — Laurie Werth Fine Art');
  const body = encodeURIComponent(
    `New Order Request\n${'═'.repeat(30)}\n\n` +
    cart.map(item =>
      `${item.title}\n  ${item.label}\n  Qty: ${item.qty}  |  $${item.price * item.qty}\n  SKU: ${item.sku}`
    ).join('\n\n') +
    `\n\n${'─'.repeat(30)}\nSubtotal: $${cart.reduce((s, i) => s + i.price * i.qty, 0)}\n\nPlease reply with shipping details and payment instructions.`
  );

  const email = PrintServiceConfig.manual.email;
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  showToast('Opening your email client…');
}

function loadSnipcart(apiKey) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.js';
  script.setAttribute('data-api-key', apiKey);
  document.body.appendChild(script);
}


/* ═══ Header ═══ */
function initHeader() {
  const header = document.getElementById('header');
  let lastScroll = 0;

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('header--scrolled', y > 50);
    lastScroll = y;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


/* ═══ Mobile Menu ═══ */
function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const nav = document.getElementById('mainNav');

  toggle?.addEventListener('click', () => {
    toggle.classList.toggle('active');
    nav?.classList.toggle('header__nav--mobile');
  });

  nav?.addEventListener('click', e => {
    if (e.target.classList.contains('header__link')) {
      toggle?.classList.remove('active');
      nav?.classList.remove('header__nav--mobile');
    }
  });
}


/* ═══ Scroll Reveal ═══ */
function initScrollReveal() {
  observeReveals();
}

function observeReveals() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal:not(.reveal--visible)').forEach(el => {
    observer.observe(el);
  });
}


/* ═══ Forms ═══ */
function initForms() {
  const commForm = document.getElementById('commissionForm');
  commForm?.addEventListener('submit', e => {
    const honeypot = commForm.querySelector('[name="_gotcha"]');
    if (honeypot?.value) {
      e.preventDefault();
      return;
    }
    showToast('Sending your inquiry…');
  });

  const signupForm = document.getElementById('signupForm');
  signupForm?.addEventListener('submit', e => {
    showToast('Joining the studio list…');
  });
}


/* ═══ Toast ═══ */
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('active');

  toastTimer = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}
