// main.js — product catalogue rendering, cart handling, and order/payment forms

const CART_KEY = "nakiahs-closet-cart";

function formatUGX(amount) {
  return "UGX " + Number(amount).toLocaleString("en-UG");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
}

function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = cartCount();
}

async function fetchProducts() {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Could not load products");
  return res.json();
}

// ---------------------------------------------------------------------
// Closet / product grid page
// ---------------------------------------------------------------------
async function initCloset() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const products = await fetchProducts();
  const filterBar = document.getElementById("filterBar");
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  let activeCategory = "All";

  function renderFilters() {
    filterBar.innerHTML = categories
      .map(
        (cat) =>
          `<button class="filter-btn${cat === activeCategory ? " active" : ""}" data-cat="${cat}">${cat}${cat !== "All" ? "s" : ""}</button>`
      )
      .join("");
    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderFilters();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const list = products.filter(
      (p) => activeCategory === "All" || p.category === activeCategory
    );
    grid.innerHTML = list
      .map(
        (p) => `
      <article class="product-card">
        <div class="product-photo"><img src="${p.image}" alt="${p.name}, a ${p.category.toLowerCase()} from Nakiah's Closet" loading="lazy"></div>
        <div class="product-body">
          <span class="product-cat">${p.category}</span>
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <span class="product-price">${formatUGX(p.price)}</span>
          <div class="product-actions">
            <input type="number" min="1" value="1" class="qty-input" id="qty-${p.id}" aria-label="Quantity for ${p.name}">
            <button class="btn btn-gold" data-add="${p.id}">Add to order</button>
          </div>
        </div>
      </article>`
      )
      .join("");

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.add;
        const qtyInput = document.getElementById(`qty-${id}`);
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        addToCart(id, qty);
        btn.textContent = "Added";
        setTimeout(() => (btn.textContent = "Add to order"), 1100);
      });
    });
  }

  renderFilters();
  renderGrid();
}

// ---------------------------------------------------------------------
// Order page
// ---------------------------------------------------------------------
async function initOrderPage() {
  const summaryEl = document.getElementById("orderSummary");
  const form = document.getElementById("orderForm");
  if (!summaryEl || !form) return;

  const products = await fetchProducts();

  function renderSummary() {
    const cart = getCart();
    const entries = Object.entries(cart);
    if (entries.length === 0) {
      summaryEl.innerHTML = `<h3>Your selection</h3><p class="empty-note">You have not added any pieces yet. Visit <a href="/closet.html" style="color:var(--gold-deep);">View Closet</a> to choose abayas, deras or veils.</p>`;
      form.querySelector("#placeOrderBtn").disabled = true;
      return;
    }

    let total = 0;
    const lines = entries
      .map(([id, qty]) => {
        const p = products.find((prod) => prod.id === id);
        if (!p) return "";
        const lineTotal = p.price * qty;
        total += lineTotal;
        return `<div class="order-line">
          <span>${p.name} &times; ${qty}</span>
          <span>${formatUGX(lineTotal)}</span>
        </div>`;
      })
      .join("");

    summaryEl.innerHTML = `
      <h3>Your selection</h3>
      ${lines}
      <div class="order-total"><span>Total</span><span>${formatUGX(total)}</span></div>
      <p class="empty-note" style="margin-top:14px;">Payment is arranged after your order is placed, on the Payments page.</p>
    `;
    form.querySelector("#placeOrderBtn").disabled = false;
    form.dataset.total = total;
  }

  renderSummary();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cart = getCart();
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    if (items.length === 0) return;

    const payload = {
      fullName: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      deliveryMethod: form.deliveryMethod.value,
      notes: form.notes.value.trim(),
      items
    };

    const btn = form.querySelector("#placeOrderBtn");
    btn.disabled = true;
    btn.textContent = "Placing order...";

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      clearCart();
      window.location.href = `/payment.html?order=${data.orderId}&total=${data.total}`;
    } catch (err) {
      showNotice(form, err.message, "error");
      btn.disabled = false;
      btn.textContent = "Place order";
    }
  });
}

function showNotice(form, message, type) {
  let notice = form.querySelector(".notice");
  if (!notice) {
    notice = document.createElement("div");
    form.prepend(notice);
  }
  notice.className = `notice ${type}`;
  notice.textContent = message;
}

// ---------------------------------------------------------------------
// Payment page
// ---------------------------------------------------------------------
async function initPaymentPage() {
  const form = document.getElementById("paymentForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");
  const total = params.get("total");
  const orderInfoEl = document.getElementById("orderInfo");
  const methodTiles = document.querySelectorAll(".pay-tile");
  const methodInput = document.getElementById("paymentMethod");
  const instructions = document.getElementById("payInstructions");

  const instructionText = {
    "Mobile Money": "Send the total amount to +256 703 920 448 (Mobile Money) and enter the transaction ID below. We confirm every payment on WhatsApp within a few hours.",
    "Cash on Delivery": "Pay in cash when your order is delivered or when you collect it in Jinja. No transaction ID needed, just submit the form to notify us.",
    "Bank Transfer": "Message us on WhatsApp at +256 703 920 448 for our bank details, then enter your bank transaction reference below."
  };

  if (orderId) {
    orderInfoEl.innerHTML = `
      <div class="order-line"><span>Order number</span><span>#${orderId}</span></div>
      <div class="order-total"><span>Amount due</span><span>${formatUGX(total || 0)}</span></div>
    `;
    document.getElementById("orderIdField").value = orderId;
    document.getElementById("amountField").value = total || 0;
  } else {
    orderInfoEl.innerHTML = `<p class="empty-note">No order number found. Place an order first from the <a href="/order.html" style="color:var(--gold-deep);">Order Online</a> page, or enter your order number below if you already have one.</p>
      <div class="form-row">
        <label for="manualOrderId">Order number</label>
        <input type="number" id="manualOrderId" placeholder="e.g. 12">
      </div>`;
  }

  methodTiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      methodTiles.forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
      const method = tile.dataset.method;
      methodInput.value = method;
      instructions.textContent = instructionText[method] || "";
      instructions.style.display = "block";
      document.getElementById("refField").required = method !== "Cash on Delivery";
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!methodInput.value) {
      showNotice(form, "Please choose a payment method above.", "error");
      return;
    }

    const manualOrderId = document.getElementById("manualOrderId");
    const finalOrderId = orderId || (manualOrderId && manualOrderId.value);
    if (!finalOrderId) {
      showNotice(form, "Please enter your order number.", "error");
      return;
    }

    const payload = {
      orderId: finalOrderId,
      method: methodInput.value,
      payerName: form.payerName.value.trim(),
      payerPhone: form.payerPhone.value.trim(),
      transactionRef: form.transactionRef.value.trim(),
      amount: total || document.getElementById("amountField").value || 0
    };

    const btn = form.querySelector("#submitPaymentBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      form.innerHTML = `<div class="notice success">
        Thank you. Your payment note for order #${finalOrderId} has been received and is awaiting confirmation.
        We will reach out on WhatsApp at ${form.payerPhone ? "" : ""}your number shortly. You're also welcome to
        message us directly at <a href="https://wa.me/256703920448" style="color:#3E5220;font-weight:600;">+256 703 920 448</a>.
      </div>`;
    } catch (err) {
      showNotice(form, err.message, "error");
      btn.disabled = false;
      btn.textContent = "Submit payment";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  initCloset();
  initOrderPage();
  initPaymentPage();
});
