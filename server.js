// server.js
// Main server for Nakiah's Closet. Serves the static site, a public JSON
// API for products/orders/payments, and a password-protected admin API for
// managing the product catalogue (add stock, edit prices, remove items).

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const {
  db,
  getProducts,
  getAllProductsForAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// The password used to log in to /admin. Change this via an environment
// variable in production — see .env.example.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "nakiah-admin-2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "nakiahs-closet-dev-secret-change-me";

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "\n[warning] ADMIN_PASSWORD is not set — using the default admin password.\n" +
      "Set ADMIN_PASSWORD in your .env file (or hosting provider's environment settings) before going live.\n"
  );
}

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

// ---------------------------------------------------------------------
// Image uploads (admin only) — saved into public/images/products
// ---------------------------------------------------------------------
const uploadDir = path.join(__dirname, "public", "images", "products");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(ext) ? ext : ".jpg";
    const stamp = Date.now();
    cb(null, `product-${stamp}${safeExt}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|svg\+xml)/.test(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP or SVG images are allowed."), ok);
  }
});

// ---------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please log in as admin first." });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Incorrect password." });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/session", (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

// Serve the admin pages themselves — dashboard requires login, login page is open
app.get("/admin", (req, res) => res.redirect("/admin/login.html"));
app.get("/admin/login.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin", "login.html"))
);
app.get("/admin/dashboard.html", requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin", "dashboard.html"))
);

// ---------------------------------------------------------------------
// Admin product management API
// ---------------------------------------------------------------------
app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(getAllProductsForAdmin());
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  try {
    const { category, name, price, description, image } = req.body || {};
    if (!category || !name || !price) {
      return res.status(400).json({ error: "Category, name and price are required." });
    }
    const product = createProduct({
      category,
      name,
      price: parseInt(price, 10),
      description,
      image
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add the product." });
  }
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  try {
    const { category, name, price, description, image, available } = req.body || {};
    const product = updateProduct(req.params.id, {
      category,
      name,
      price: price !== undefined ? parseInt(price, 10) : undefined,
      description,
      image,
      available
    });
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update the product." });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const ok = deleteProduct(req.params.id);
  if (!ok) return res.status(404).json({ error: "Product not found." });
  res.json({ ok: true });
});

app.post("/api/admin/upload", requireAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No image received." });
    res.json({ path: `/images/products/${req.file.filename}` });
  });
});

// ---------------------------------------------------------------------
// Static site (after admin route guards, so /admin/dashboard.html above wins)
// ---------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------
// Public: products
// ---------------------------------------------------------------------
app.get("/api/products", (req, res) => {
  res.json(getProducts());
});

app.get("/api/products/:id", (req, res) => {
  const product = getProductById(req.params.id);
  if (!product || !product.available) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// ---------------------------------------------------------------------
// Public: orders
// ---------------------------------------------------------------------
// Body: { fullName, phone, email, address, items: [{id, qty}], deliveryMethod, notes }
app.post("/api/orders", (req, res) => {
  try {
    const { fullName, phone, email, address, items, deliveryMethod, notes } = req.body;

    if (!fullName || !phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Full name, phone and at least one item are required." });
    }

    const resolvedItems = [];
    let total = 0;
    for (const line of items) {
      const product = getProductById(line.id);
      if (!product || !product.available) continue;
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);
      total += product.price * qty;
      resolvedItems.push({ id: product.id, name: product.name, price: product.price, qty });
    }

    if (resolvedItems.length === 0) {
      return res.status(400).json({ error: "No valid items in the order." });
    }

    const insertCustomer = db.prepare(
      "INSERT INTO customers (full_name, phone, email, address) VALUES (?, ?, ?, ?)"
    );
    const customerResult = insertCustomer.run(fullName, phone, email || null, address || null);

    const insertOrder = db.prepare(
      "INSERT INTO orders (customer_id, items_json, total_amount, delivery_method, notes) VALUES (?, ?, ?, ?, ?)"
    );
    const orderResult = insertOrder.run(
      customerResult.lastInsertRowid,
      JSON.stringify(resolvedItems),
      total,
      deliveryMethod || "pickup",
      notes || null
    );

    res.status(201).json({
      orderId: orderResult.lastInsertRowid,
      total,
      items: resolvedItems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the order. Please try again." });
  }
});

app.get("/api/orders/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(order.customer_id);
  res.json({ ...order, items: JSON.parse(order.items_json), customer });
});

// ---------------------------------------------------------------------
// Public: payments
// ---------------------------------------------------------------------
// Body: { orderId, method, payerName, payerPhone, transactionRef, amount }
app.post("/api/payments", (req, res) => {
  try {
    const { orderId, method, payerName, payerPhone, transactionRef, amount } = req.body;

    if (!orderId || !method || !payerName || !payerPhone || !amount) {
      return res.status(400).json({ error: "Order, method, payer name, phone and amount are required." });
    }

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) return res.status(404).json({ error: "That order number was not found." });

    const insertPayment = db.prepare(
      `INSERT INTO payments (order_id, method, payer_name, payer_phone, transaction_ref, amount)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = insertPayment.run(
      orderId,
      method,
      payerName,
      payerPhone,
      transactionRef || null,
      amount
    );

    db.prepare("UPDATE orders SET status = 'payment submitted' WHERE id = ?").run(orderId);

    res.status(201).json({ paymentId: result.lastInsertRowid, status: "awaiting confirmation" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not record the payment. Please try again." });
  }
});

// Friendly fallback for direct page loads
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const filePath = path.join(__dirname, "public", req.path === "/" ? "index.html" : req.path);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  });
});

app.listen(PORT, () => {
  console.log(`Nakiah's Closet running at http://localhost:${PORT}`);
});
