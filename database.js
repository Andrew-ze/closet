// database.js
// Sets up the SQLite database used to store products, customers, orders and
// payments for Nakiah's Closet. The database file (store.db) is created
// automatically the first time the server runs, and the product catalogue
// is seeded once so the admin panel has something to start from.

const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "store.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image TEXT,
    available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    items_json TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    delivery_method TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    method TEXT NOT NULL,
    payer_name TEXT NOT NULL,
    payer_phone TEXT NOT NULL,
    transaction_ref TEXT,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'awaiting confirmation',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

// ---- Seed the product catalogue (runs once, only if the table is empty) ----
const seedProducts = [
  {
    id: "abaya-classic-black",
    category: "Abaya",
    name: "Classic Flow Abaya",
    price: 180000,
    description: "Flowing everyday abaya in breathable crepe, finished with a soft gold-trimmed cuff.",
    image: "/images/products/abaya-classic-black.svg"
  },
  {
    id: "abaya-embroidered",
    category: "Abaya",
    name: "Gold-Embroidered Abaya",
    price: 260000,
    description: "Occasion abaya with hand-finished gold embroidery along the front panel and sleeves.",
    image: "/images/products/abaya-embroidered.svg"
  },
  {
    id: "abaya-butterfly",
    category: "Abaya",
    name: "Butterfly Open Abaya",
    price: 210000,
    description: "Open-front abaya worn over a slip dress, tied at the waist with a matching belt.",
    image: "/images/products/abaya-butterfly.svg"
  },
  {
    id: "dera-cotton",
    category: "Dera",
    name: "Everyday Cotton Dera",
    price: 130000,
    description: "Loose, breathable cotton dera for daily wear, with side pockets and a rounded neckline.",
    image: "/images/products/dera-cotton.svg"
  },
  {
    id: "dera-printed",
    category: "Dera",
    name: "Printed Ankara Dera",
    price: 150000,
    description: "Dera cut with bold local print panels at the sleeve and hem, modest and comfortable.",
    image: "/images/products/dera-printed.svg"
  },
  {
    id: "veil-chiffon-gold",
    category: "Veil",
    name: "Chiffon Veil - Gold Edge",
    price: 45000,
    description: "Lightweight chiffon veil with a delicate gold-thread edge, drapes without slipping.",
    image: "/images/products/veil-chiffon-gold.svg"
  },
  {
    id: "veil-jersey-plain",
    category: "Veil",
    name: "Jersey Everyday Veil",
    price: 30000,
    description: "Soft stretch jersey veil for daily wear - easy to style, holds its shape all day.",
    image: "/images/products/veil-jersey-plain.svg"
  },
  {
    id: "veil-instant",
    category: "Veil",
    name: "Instant Wrap Veil",
    price: 35000,
    description: "Pull-on instant veil with a built-in underscarf, ready in seconds.",
    image: "/images/products/veil-instant.svg"
  }
];

const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (productCount === 0) {
  const insertSeed = db.prepare(
    "INSERT INTO products (id, category, name, price, description, image, available) VALUES (?, ?, ?, ?, ?, ?, 1)"
  );
  const seedAll = db.transaction((items) => {
    for (const p of items) insertSeed.run(p.id, p.category, p.name, p.price, p.description, p.image);
  });
  seedAll(seedProducts);
}

// ---- Product helpers ---------------------------------------------------
function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

function uniqueId(baseName) {
  const base = slugify(baseName);
  let id = base;
  let n = 2;
  const exists = db.prepare("SELECT 1 FROM products WHERE id = ?");
  while (exists.get(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

// Public catalogue: only pieces marked available
function getProducts() {
  return db.prepare("SELECT * FROM products WHERE available = 1 ORDER BY created_at DESC").all();
}

// Full catalogue for the admin panel, available or not
function getAllProductsForAdmin() {
  return db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
}

function getProductById(id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
}

function createProduct({ category, name, price, description, image }) {
  const id = uniqueId(name);
  db.prepare(
    "INSERT INTO products (id, category, name, price, description, image, available) VALUES (?, ?, ?, ?, ?, ?, 1)"
  ).run(id, category, name, price, description || "", image || "");
  return getProductById(id);
}

function updateProduct(id, { category, name, price, description, image, available }) {
  const existing = getProductById(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE products SET category = ?, name = ?, price = ?, description = ?, image = ?, available = ?
     WHERE id = ?`
  ).run(
    category ?? existing.category,
    name ?? existing.name,
    price ?? existing.price,
    description ?? existing.description,
    image ?? existing.image,
    available === undefined ? existing.available : (available ? 1 : 0),
    id
  );
  return getProductById(id);
}

function deleteProduct(id) {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

// ---- Order & payment helpers (for the admin dashboard) -----------------
// Returns every order with its customer details and any payments attached,
// newest first — this is what the admin Orders tab lists.
function getAllOrdersForAdmin() {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  const getCustomer = db.prepare("SELECT * FROM customers WHERE id = ?");
  const getPayments = db.prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC");

  return orders.map((order) => ({
    ...order,
    items: JSON.parse(order.items_json),
    customer: getCustomer.get(order.customer_id),
    payments: getPayments.all(order.id)
  }));
}

const ORDER_STATUSES = ["pending", "payment submitted", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["awaiting confirmation", "confirmed", "failed"];

function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) return null;
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) return null;
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
}

function updatePaymentStatus(id, status) {
  if (!PAYMENT_STATUSES.includes(status)) return null;
  const result = db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) return null;
  return db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
}

module.exports = {
  db,
  getProducts,
  getAllProductsForAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrdersForAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES
};
