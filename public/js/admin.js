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
});
