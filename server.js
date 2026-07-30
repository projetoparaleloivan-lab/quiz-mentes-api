require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const minds = require('./minds');
const { generatePDF } = require('./pdf');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 3000;
const META_PIXEL_ID  = process.env.META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN;
const EMAIL_USER     = process.env.EMAIL_USER;
const EMAIL_PASS     = process.env.EMAIL_PASS;  // Gmail App Password
const QUIZ_URL       = process.env.QUIZ_URL || 'https://quiz-mentes.vercel.app';

// ── Database ──────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || 'quiz.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    email      TEXT UNIQUE,
    top_mind   TEXT,
    paid       INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )
`);

// ── CAPI ──────────────────────────────────────────────────
async function sendCapiEvent(eventName, email, name, value, eventId, extra = {}) {
  if (!META_CAPI_TOKEN || !META_PIXEL_ID) {
    console.log('[CAPI] skipped — token/pixel not configured');
    return;
  }

  const hash = s => crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex');

  const userData = {
    em: [hash(email)],
    ...(name && { fn: [hash(name.split(' ')[0])] }),
    ...(name.split(' ')[1] && { ln: [hash(name.split(' ').slice(1).join(' '))] }),
    ...(extra.phone && { ph: [hash(extra.phone.replace(/\D/g, ''))] }),
    ...(extra.fbc   && { fbc: extra.fbc }),
    ...(extra.fbp   && { fbp: extra.fbp }),
  };

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || crypto.randomUUID(),
    action_source: 'website',
    event_source_url: QUIZ_URL,
    user_data: userData,
    ...(value != null && { custom_data: { value, currency: 'BRL' } }),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [event] }) }
    );
    const json = await res.json();
    console.log(`[CAPI] ${eventName}:`, JSON.stringify(json));
  } catch (e) {
    console.error('[CAPI] error:', e.message);
  }
}

// ── Email ─────────────────────────────────────────────────
async function sendResultEmail(name, email, topMind) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('[EMAIL] skipped — not configured');
    return;
  }

  const mind = minds[topMind];
  if (!mind) throw new Error(`Unknown mind: ${topMind}`);

  const pdfBuffer = await generatePDF(mind, name);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `Quiz Mentes Brilhantes <${EMAIL_USER}>`,
    to: email,
    subject: `${name}, seu resultado chegou — voce pensa como ${mind.name}!`,
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#12140f;color:#efe9d8;padding:40px 36px;border-radius:14px;">
        <p style="font-size:11px;letter-spacing:2px;color:#c9a227;margin-bottom:24px;">QUIZ MENTES BRILHANTES</p>
        <h1 style="font-size:24px;color:#ffffff;margin:0 0 8px;">Ola, ${name}!</h1>
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px;color:#b5aa8f;">
          Seu resultado chegou. Voce pensa como <strong style="color:#c9a227">${mind.name}</strong> (${mind.years}) —
          e isso revela muito sobre como voce processa o mundo.
        </p>
        <div style="background:#1a1c14;border-left:3px solid #c9a227;padding:16px 20px;border-radius:6px;margin-bottom:24px;">
          <p style="font-size:13px;font-style:italic;color:#efe9d8;margin:0;line-height:1.7;">"${mind.quote}"</p>
          <p style="font-size:11px;color:#8f7420;margin:8px 0 0;">— ${mind.name}</p>
        </div>
        <p style="font-size:14px;color:#b5aa8f;line-height:1.7;margin-bottom:28px;">
          O relatorio completo de 4 paginas esta em anexo. Acesse o quiz online para ver sua analise interativa.
        </p>
        <a href="${QUIZ_URL}" style="display:inline-block;background:#c9a227;color:#12140f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">
          Ver meu resultado online
        </a>
        <p style="font-size:11px;color:#444;margin-top:36px;">quizmentes.vercel.app</p>
      </div>
    `,
    attachments: [{
      filename: `resultado-${topMind}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  console.log(`[EMAIL] sent to ${email} (${topMind})`);
}

// ── Routes ────────────────────────────────────────────────

// Salva lead + dispara Lead via CAPI
app.post('/api/lead', async (req, res) => {
  const { name, email, topMind, eventId } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    db.prepare(`
      INSERT INTO leads (name, email, top_mind)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name, top_mind=excluded.top_mind
    `).run(name || '', email.toLowerCase().trim(), topMind || '');
  } catch (e) {
    console.error('[DB]', e.message);
  }

  sendCapiEvent('Lead', email, name, null, eventId).catch(console.error);
  res.json({ ok: true });
});

// Dispara InitiateCheckout via CAPI
app.post('/api/initiate-checkout', async (req, res) => {
  const { email, name, eventId } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  sendCapiEvent('InitiateCheckout', email, name, 9.99, eventId).catch(console.error);
  res.json({ ok: true });
});

// Webhook da Cakto — confirma pagamento
app.post('/api/webhook/cakto', async (req, res) => {
  console.log('[WEBHOOK] Cakto payload:', JSON.stringify(req.body));

  // Responde imediatamente pra Cakto nao fazer retry
  res.json({ ok: true });

  const body = req.body;

  // Formato Cakto oficial
  const data   = body?.data || {};
  const email  = data?.customer?.email;
  const name   = data?.customer?.name || '';
  const amount = data?.amount || data?.baseAmount || 9.99;
  const fbc    = data?.fbc || null;
  const fbp    = data?.fbp || null;
  const phone  = data?.customer?.phone || null;

  if (!email) {
    console.log('[WEBHOOK] no email in payload');
    return;
  }

  let lead = db.prepare('SELECT * FROM leads WHERE email = ?').get(email.toLowerCase().trim());
  if (!lead) {
    console.log('[WEBHOOK] lead not found for:', email, '— saving and sending recovery email');
    // Salva como pago mas sem topMind — manda email de recuperação
    db.prepare('INSERT OR IGNORE INTO leads (name, email, top_mind, paid) VALUES (?,?,?,1)')
      .run(name, email.toLowerCase().trim(), '');
    // Email de recuperação
    if (EMAIL_USER && EMAIL_PASS) {
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
      transporter.sendMail({
        from: `Quiz Mentes Brilhantes <${EMAIL_USER}>`,
        to: email,
        subject: `${name ? name.split(' ')[0] : 'Olá'}, seu acesso foi liberado!`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#12140f;color:#efe9d8;padding:40px 36px;border-radius:14px;">
            <p style="font-size:11px;letter-spacing:2px;color:#c9a227;">QUIZ MENTES BRILHANTES</p>
            <h1 style="font-size:22px;color:#fff;margin:16px 0 8px;">Pagamento confirmado!</h1>
            <p style="font-size:15px;line-height:1.7;color:#b5aa8f;margin-bottom:24px;">
              Recebemos seu pagamento. Para liberar seu resultado, clique no botão abaixo, refaça o quiz rapidinho e clique em <strong style="color:#c9a227">"Já paguei — liberar acesso"</strong>.
            </p>
            <a href="${QUIZ_URL}" style="display:inline-block;background:#c9a227;color:#12140f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">
              Acessar meu resultado
            </a>
            <p style="font-size:11px;color:#444;margin-top:36px;">quizmentes.vercel.app</p>
          </div>
        `
      }).catch(e => console.error('[EMAIL] recovery failed:', e.message));
    }
    return;
  }

  db.prepare('UPDATE leads SET paid = 1 WHERE email = ?').run(email.toLowerCase().trim());

  const value = typeof amountCents === 'number' && amountCents > 100
    ? amountCents / 100
    : amountCents;

  sendCapiEvent('Purchase', email, lead.name, value, null, { fbc, fbp, phone }).catch(console.error);

  sendResultEmail(lead.name, email, lead.top_mind).catch(e => {
    console.error('[EMAIL] failed:', e.message);
  });
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => console.log(`Quiz API running on port ${PORT}`));
