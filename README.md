# Nakiah's Closet — Website

A ready-to-run website for Nakiah's Closet, an online shop selling abayas,
deras and veils for women. Built with a plain HTML/CSS/JS front end and a
small Node.js (Express) backend backed by a SQLite database, so it stores
customers, orders and payments for real.

## Pages

- **Home** (`index.html`)
- **View Closet** (`closet.html`) — the product catalogue, filterable by category
- **About** (`about.html`)
- **Order Online** (`order.html`) — collects customer details and saves the order
- **Payments** (`payment.html`) — records how and when an order was paid
- **Contacts** (`contact.html`) — phone, WhatsApp, TikTok, and a message form

## Running it locally

You need [Node.js](https://nodejs.org) version 18 or newer installed.

```bash
cd nakiahs-closet
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The database file
(`store.db`) is created automatically the first time you run the app — no
separate database setup needed.

## Managing products — the admin panel

You don't need to touch any code to add new stock, change prices, upload a
real photo, or take an item off the site. Go to **/admin** on your site
(e.g. `http://localhost:3000/admin` locally, or `yoursite.onrender.com/admin`
once deployed) and log in with the admin password.

**The admin password is set with the `ADMIN_PASSWORD` environment
variable** — see "Setting the admin password" below. Don't skip this before
going live; the site ships with a default password that anyone could guess.

From the admin dashboard (`/admin/dashboard.html`, reached after logging in)
you can:
- **Add a new piece** — name, category, price, description, and a photo upload
- **Edit** any existing piece, including its price
- **Hide** a piece so it disappears from View Closet without deleting it
  (handy when something is temporarily out of stock)
- **Delete** a piece for good
- **Upload a photo** directly from your phone or computer — no need to edit
  files by hand

Changes show up on the live site immediately, no redeploy needed.

### Setting the admin password

1. Copy `.env.example` to a new file named `.env` in the project folder.
2. Set `ADMIN_PASSWORD` to a password only you know, and `SESSION_SECRET` to
   any long random string.
3. Restart the server (`npm start`) for local use.

**On Render**, instead of a `.env` file, set `ADMIN_PASSWORD` and
`SESSION_SECRET` under your service's **Environment** tab, then redeploy.
Render's environment variables work the same way `.env` does locally.

### The old way — editing products by hand

Product photos that don't come through the admin upload are saved in
`public/images/products/`. The site ships with simple illustrated
placeholder images there in the gold/white/brown palette, so it looks
complete before real photography is ready — the quickest way to replace
them is the admin panel's photo upload described above.

## Where customer data is stored

All orders and payments are saved in `store.db`, a SQLite database file
created next to `server.js`. It has three tables:

- `customers` — name, phone, email, address
- `orders` — items ordered, total, delivery method, status
- `payments` — payment method, payer details, transaction reference, status

You (or a developer) can open `store.db` with any SQLite browser (for
example [DB Browser for SQLite](https://sqlitebrowser.org)) to view orders
and payments, or query it directly with the `sqlite3` command-line tool.

## Updating contact details

Phone number, WhatsApp number and TikTok link are all set in one place:
`public/js/partials.js`, in the `STORE` object near the top of the file.
Update them there and they will update across every page (header, footer,
contact page, and the floating WhatsApp button).

## Deploying the site

This app needs a Node.js host (not a static-only host), because it runs a
small backend. Good free/low-cost options:

### Option A — Render.com (recommended, simplest)
1. Push this project to a GitHub repository.
2. On [Render](https://render.com), create a new **Web Service** from that repo.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Deploy. Render gives you a live URL (e.g. `nakiahscloset.onrender.com`).

### Option B — Railway.app
1. Push this project to GitHub.
2. On [Railway](https://railway.app), create a new project from the repo.
3. Railway detects Node.js automatically and deploys with `npm start`.

### Option C — A VPS (DigitalOcean, etc.)
1. Copy the project to the server, run `npm install`.
2. Use a process manager such as `pm2` to keep it running: `pm2 start server.js --name nakiahs-closet`.
3. Put it behind Nginx with a free HTTPS certificate (e.g. via Certbot) and
   point your domain at it.

### A note on the database in production
SQLite stores everything in a single file (`store.db`). This works well for
a small shop, but on hosts with an ephemeral filesystem (where files reset
on redeploy, e.g. some free tiers) the database can be wiped on each deploy.
If that matters for you, either:
- use a host with a persistent disk (Render's paid plans support this), or
- upgrade later to a hosted database such as PostgreSQL — the `database.js`
  file is small and written so this swap is straightforward for a developer.

## Buying a domain

Once deployed, you can point a custom domain (e.g. `nakiahscloset.com`) at
the hosting provider by following their "custom domain" instructions and
updating your domain's DNS records.
