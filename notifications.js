// notifications.js
// Notifies the shop's admins whenever a new order is placed — by email
// (via Gmail) and, if configured, by WhatsApp (via the free CallMeBot
// service). Every notification here is "best-effort": if credentials
// are missing or a send fails, it is logged and quietly skipped rather
// than breaking the customer's order placement.

const nodemailer = require("nodemailer");

function formatUGX(amount) {
  return "UGX " + Number(amount).toLocaleString("en-UG");
}

// ---------------------------------------------------------------------
// Email (Gmail SMTP via Nodemailer)
// ---------------------------------------------------------------------
let mailTransporter = null;
function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;

  mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  return mailTransporter;
}

async function sendOrderEmail({ order, customer, items }) {
  const transporter = getMailTransporter();
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!transporter || !to) {
    console.log("[notifications] Email not configured — skipping order email.");
    return;
  }

  const itemLines = items
    .map((it) => `  - ${it.name} x${it.qty} — ${formatUGX(it.price * it.qty)}`)
    .join("\n");

  const text = `New order #${order.id} — ${formatUGX(order.total)}

Customer: ${customer.fullName}
Phone: ${customer.phone}
${customer.email ? `Email: ${customer.email}\n` : ""}Address: ${customer.address || "(not provided)"}
Delivery method: ${customer.deliveryMethod || "pickup"}
${customer.notes ? `Notes: ${customer.notes}\n` : ""}
Items:
${itemLines}

Log in to the admin dashboard to view full details and update the order status.`;

  try {
    await transporter.sendMail({
      from: `"Nakiah's Closet" <${process.env.GMAIL_USER}>`,
      to,
      subject: `New order #${order.id} — ${formatUGX(order.total)}`,
      text,
    });
    console.log(`[notifications] Order email sent for order #${order.id}.`);
  } catch (err) {
    console.error("[notifications] Failed to send order email:", err.message);
  }
}

// ---------------------------------------------------------------------
// WhatsApp (via CallMeBot — a free, unofficial WhatsApp gateway)
// ---------------------------------------------------------------------
// Each recipient must have already activated CallMeBot once from their own
// WhatsApp (see setup steps below). Configure recipients as
// ADMIN_WHATSAPP_1_PHONE / ADMIN_WHATSAPP_1_APIKEY, and _2_ for a second
// admin, and so on — any that are unset are skipped.
function getWhatsAppRecipients() {
  const recipients = [];
  for (let i = 1; i <= 5; i++) {
    const phone = process.env[`ADMIN_WHATSAPP_${i}_PHONE`];
    const apikey = process.env[`ADMIN_WHATSAPP_${i}_APIKEY`];
    if (phone && apikey) recipients.push({ phone, apikey });
  }
  return recipients;
}

async function sendOrderWhatsApp({ order, customer }) {
  const recipients = getWhatsAppRecipients();
  if (recipients.length === 0) {
    console.log("[notifications] No WhatsApp recipients configured — skipping.");
    return;
  }

  const message =
    `New order #${order.id} - ${formatUGX(order.total)}\n` +
    `From: ${customer.fullName} (${customer.phone})\n` +
    `Check the admin dashboard for full details.`;

  for (const { phone, apikey } of recipients) {
    try {
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CallMeBot responded with status ${res.status}`);
      console.log(`[notifications] WhatsApp alert sent to ${phone} for order #${order.id}.`);
    } catch (err) {
      console.error(`[notifications] Failed to send WhatsApp alert to ${phone}:`, err.message);
    }
  }
}

// ---------------------------------------------------------------------
// Combined entry point — fire-and-forget from the order route
// ---------------------------------------------------------------------
function notifyNewOrder({ order, customer, items }) {
  sendOrderEmail({ order, customer, items });
  sendOrderWhatsApp({ order, customer });
}

module.exports = { notifyNewOrder };
