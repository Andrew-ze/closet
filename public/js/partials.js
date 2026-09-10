// partials.js
// Shared header, footer and floating WhatsApp button, injected on every page
// so the contact details (phone, WhatsApp, TikTok) only need to be edited
// in one place.

const STORE = {
  phone: "+256703920448",
  whatsapp: "256703920448", // international format, no leading +, no spaces
  tiktokHandle: "@Nakiahs closet",
  tiktokUrl: "https://vm.tiktok.com/ZS9S5PRfMxuLX-wGF7I/",
  email: "hello@nakiahscloset.com"
};

function waLink(prefill) {
  const text = prefill ? `?text=${encodeURIComponent(prefill)}` : "";
  return `https://wa.me/${STORE.whatsapp}${text}`;
}

function renderHeader(active) {
  const links = [
    ["Home", "/index.html"],
    ["View Closet", "/closet.html"],
    ["About", "/about.html"],
    ["Order Online", "/order.html"],
    ["Payments", "/payment.html"],
    ["Contacts", "/contact.html"]
  ];

  const linkHtml = links
    .map(([label, href]) => {
      const isActive = active === href ? " active" : "";
      return `<li><a href="${href}" class="${isActive.trim()}">${label}</a></li>`;
    })
    .join("");

  return `
  <div class="announce">Handmade-to-order modest wear for women &mdash; Jinja &amp; nationwide delivery</div>
  <header class="site-header">
    <nav class="nav">
      <a href="/index.html" class="brand">Nakiah's <span>Closet</span></a>
      <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navLinks">${linkHtml}</ul>
      <div class="nav-cta">
        <a class="btn btn-outline" href="/order.html">Order Online <span id="cartBadge" style="background:var(--gold);color:var(--bark);border-radius:50%;font-size:0.72rem;padding:1px 7px;margin-left:4px;">0</span></a>
      </div>
    </nav>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="/index.html" class="brand">Nakiah's <span>Closet</span></a>
          <p style="margin-top:14px;max-width:34ch;color:rgba(228,211,180,0.85);">
            Modest, well-made abayas, deras and veils for women &mdash; designed and
            stitched with care in Jinja, Uganda.
          </p>
          <div class="footer-social">
            <a class="social-btn" href="${STORE.tiktokUrl}" target="_blank" rel="noopener" aria-label="Nakiah's Closet on TikTok">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.6 5.82c-.9-.83-1.47-1.99-1.6-3.32h-2.98v13.1c0 1.35-1.1 2.45-2.46 2.45a2.46 2.46 0 0 1-2.46-2.45 2.46 2.46 0 0 1 2.46-2.46c.24 0 .48.04.7.1V10.2a5.46 5.46 0 0 0-.7-.05 5.46 5.46 0 0 0-5.46 5.46A5.46 5.46 0 0 0 9.56 21a5.46 5.46 0 0 0 5.46-5.46V8.9a8.06 8.06 0 0 0 4.62 1.45V7.37a5.1 5.1 0 0 1-2.94-1.55z" fill="#FAF6EF"/></svg>
            </a>
            <a class="social-btn" href="${waLink("Hello Nakiah's Closet, I would like to ask about your pieces.")}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.06-1.36A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-3 .8.8-2.93-.19-.3A8 8 0 1 1 12 20Zm4.4-5.6c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" fill="#FAF6EF"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <ul class="footer-links">
            <li><a href="/closet.html">View Closet</a></li>
            <li><a href="/order.html">Order Online</a></li>
            <li><a href="/payment.html">Payments</a></li>
            <li><a href="/about.html">About Us</a></li>
          </ul>
        </div>
        <div>
          <h4>Reach Us</h4>
          <ul class="footer-links">
            <li><a href="tel:${STORE.phone}">${STORE.phone}</a></li>
            <li><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp: ${STORE.phone}</a></li>
            <li><a href="${STORE.tiktokUrl}" target="_blank" rel="noopener">TikTok: Nakiahs closet</a></li>
            <li><a href="/contact.html">Contact page</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="year"></span> Nakiah's Closet. All rights reserved.</span>
        <span>Kampala, Uganda</span>
      </div>
    </div>
  </footer>
  <a class="wa-float" href="${waLink("Hello Nakiah's Closet, I would like to ask about your pieces.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.06-1.36A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-3 .8.8-2.93-.19-.3A8 8 0 1 1 12 20Zm4.4-5.6c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" fill="#241608"/></svg>
  </a>`;
}

function mountLayout(active) {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");
  if (headerMount) headerMount.innerHTML = renderHeader(active);
  if (footerMount) footerMount.innerHTML = renderFooter();

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountLayout(document.body.dataset.page || "");
});
