// admin.js — powers the /admin/dashboard.html product manager

function formatUGX(amount) {
  return "UGX " + Number(amount).toLocaleString("en-UG");
}

function showTopNotice(message, type) {
  const el = document.getElementById("topNotice");
  el.innerHTML = `<div class="notice ${type}">${message}</div>`;
  if (type === "success") setTimeout(() => (el.innerHTML = ""), 3500);
}

async function checkSession() {
  const res = await fetch("/api/admin/session");
  const data = await res.json();
  if (!data.isAdmin) {
    window.location.href = "/admin/login.html";
  }
}

async function loadProducts() {
  const tbody = document.getElementById("productRows");
  const res = await fetch("/api/admin/products");
  if (res.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }
  const products = await res.json();

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No products yet — add your first piece on the left.</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr data-id="${p.id}">
      <td><img class="admin-thumb" src="${p.image || "/images/products/category-abaya.svg"}" alt=""></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${formatUGX(p.price)}</td>
      <td><span class="pill ${p.available ? "" : "off"}">${p.available ? "In stock" : "Hidden"}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit="${p.id}">Edit</button>
          <button type="button" data-toggle="${p.id}" data-available="${p.available}">${p.available ? "Hide" : "Show"}</button>
          <button type="button" class="danger" data-delete="${p.id}">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => startEdit(products.find((p) => p.id === btn.dataset.edit)))
  );
  tbody.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => toggleAvailable(btn.dataset.toggle, btn.dataset.available === "1"))
  );
  tbody.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteProduct(btn.dataset.delete))
  );
}

function startEdit(product) {
  document.getElementById("formTitle").textContent = `Editing: ${product.name}`;
  document.getElementById("productId").value = product.id;
  document.getElementById("name").value = product.name;
  document.getElementById("category").value = product.category;
  document.getElementById("price").value = product.price;
  document.getElementById("description").value = product.description || "";
  document.getElementById("available").checked = Boolean(product.available);
  document.getElementById("submitBtn").textContent = "Save changes";
  document.getElementById("cancelEditBtn").style.display = "inline-flex";
  document.getElementById("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  document.getElementById("formTitle").textContent = "Add a new piece";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("available").checked = true;
  document.getElementById("submitBtn").textContent = "Add product";
  document.getElementById("cancelEditBtn").style.display = "none";
}

async function toggleAvailable(id, currentlyAvailable) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available: !currentlyAvailable })
  });
  if (res.ok) {
    loadProducts();
  } else {
    const data = await res.json();
    showTopNotice(data.error || "Could not update the product.", "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Remove this product for good? This cannot be undone.")) return;
  const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
  if (res.ok) {
    showTopNotice("Product removed.", "success");
    loadProducts();
  } else {
    const data = await res.json();
    showTopNotice(data.error || "Could not delete the product.", "error");
  }
}

async function uploadImageIfNeeded() {
  const fileInput = document.getElementById("imageFile");
  if (!fileInput.files || fileInput.files.length === 0) return null;
  const formData = new FormData();
  formData.append("image", fileInput.files[0]);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Image upload failed.");
  return data.path;
}

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  loadProducts();

  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login.html";
  });

  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";

    try {
      const imagePath = await uploadImageIfNeeded();
      const id = document.getElementById("productId").value;
      const payload = {
        name: document.getElementById("name").value.trim(),
        category: document.getElementById("category").value,
        price: document.getElementById("price").value,
        description: document.getElementById("description").value.trim(),
        available: document.getElementById("available").checked
      };
      if (imagePath) payload.image = imagePath;

      const res = await fetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the product.");

      showTopNotice(id ? "Product updated." : "Product added.", "success");
      resetForm();
      loadProducts();
    } catch (err) {
      showTopNotice(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // ---- Tabs ----
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "orders") loadOrders();
    });
  });
});

// ---------------------------------------------------------------------
// Orders & payments
// ---------------------------------------------------------------------
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" });
}

function statusOptions(list, current) {
  return list
    .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`)
    .join("");
}

async function loadOrders() {
  const listEl = document.getElementById("ordersList");
  const res = await fetch("/api/admin/orders");
  if (res.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }
  const { orders, orderStatuses, paymentStatuses } = await res.json();

  if (orders.length === 0) {
    listEl.innerHTML = `<p class="empty-note">No orders yet — they'll show up here as soon as a customer checks out.</p>`;
    return;
  }

  listEl.innerHTML = orders
    .map((order) => {
      const itemsHtml = order.items
        .map((it) => `<li>${it.name} &times; ${it.qty} &mdash; ${formatUGX(it.price * it.qty)}</li>`)
        .join("");

      const paymentsHtml = order.payments.length
        ? order.payments
            .map(
              (p) => `
          <div class="payment-block">
            <strong>${p.method}</strong> &mdash; ${formatUGX(p.amount)}<br>
            Paid by: ${p.payer_name} (${p.payer_phone})<br>
            ${p.transaction_ref ? `Reference: ${p.transaction_ref}<br>` : ""}
            Submitted: ${formatDate(p.created_at)}<br>
            Status:
            <select class="status-select" data-payment-status="${p.id}">
              ${statusOptions(paymentStatuses, p.status)}
            </select>
          </div>`
            )
            .join("")
        : `<p class="empty-note" style="margin:0;">No payment submitted yet for this order.</p>`;

      return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-head">
          <div>
            <h4>Order #${order.id} &mdash; ${formatUGX(order.total_amount)}</h4>
            <div class="order-meta">${formatDate(order.created_at)} &middot; ${order.delivery_method || "pickup"}</div>
          </div>
          <div>
            <label style="font-size:0.8rem;color:#5a4636;">Order status</label><br>
            <select class="status-select" data-order-status="${order.id}">
              ${statusOptions(orderStatuses, order.status)}
            </select>
          </div>
        </div>
        <div class="order-cols">
          <div>
            <h5>Customer</h5>
            <p style="margin:0 0 4px;"><strong>${order.customer?.full_name || "Unknown"}</strong></p>
            <p style="margin:0 0 4px;">${order.customer?.phone || ""}</p>
            ${order.customer?.email ? `<p style="margin:0 0 4px;">${order.customer.email}</p>` : ""}
            ${order.customer?.address ? `<p style="margin:0 0 4px;">${order.customer.address}</p>` : ""}
            ${order.notes ? `<p style="margin:8px 0 0;color:#5a4636;"><em>Note: ${order.notes}</em></p>` : ""}
          </div>
          <div>
            <h5>Items</h5>
            <ul class="order-items-list">${itemsHtml}</ul>
            <h5 style="margin-top:14px;">Payment</h5>
            ${paymentsHtml}
          </div>
        </div>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll("[data-order-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.orderStatus;
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      if (res.ok) {
        showTopNotice(`Order #${id} status updated.`, "success");
      } else {
        const data = await res.json();
        showTopNotice(data.error || "Could not update order status.", "error");
      }
    });
  });

  listEl.querySelectorAll("[data-payment-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.paymentStatus;
      const res = await fetch(`/api/admin/payments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      if (res.ok) {
        showTopNotice("Payment status updated.", "success");
      } else {
        const data = await res.json();
        showTopNotice(data.error || "Could not update payment status.", "error");
      }
    });
  });
}
