// ============================================
// LOGIN PAGE LOGIC — Server API Version
// ============================================
// NO Supabase keys in this file. All data goes
// through the Express server at /api/login.

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const phoneInput = document.getElementById('phoneInput');
  const passwordInput = document.getElementById('passwordInput');
  const passwordToggle = document.getElementById('passwordToggle');
  const eyeOpen = document.getElementById('eyeOpen');
  const eyeClosed = document.getElementById('eyeClosed');
  const rememberCheckbox = document.getElementById('rememberCheckbox');
  const agreementCheckbox = document.getElementById('agreementCheckbox');
  const loginBtn = document.getElementById('loginBtn');

  // Load remembered credentials
  loadRemembered();

  // --- Password Visibility Toggle ---
  passwordToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeOpen.style.display = isPassword ? 'block' : 'none';
    eyeClosed.style.display = isPassword ? 'none' : 'block';
  });

  // --- Agreement Checkbox Toggle ---
  agreementCheckbox.addEventListener('click', () => {
    agreementCheckbox.classList.toggle('checked');
  });

  // --- Login Button ---
  loginBtn.addEventListener('click', handleLogin);

  // Enter key support
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') passwordInput.focus();
  });

  // --- Login Handler ---
  async function handleLogin() {
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();

    // Validations
    if (!phone) {
      showToast('Please enter phone number', 'error');
      phoneInput.focus();
      return;
    }

    if (!password) {
      showToast('Please enter password', 'error');
      passwordInput.focus();
      return;
    }

    if (!agreementCheckbox.classList.contains('checked')) {
      showToast('Please agree to User Agreement and Privacy Policy', 'error');
      return;
    }

    // Show loading state
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    try {
      // Send to server API (no Supabase keys exposed)
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+63' + phone,
          password: password
        })
      });

      const result = await response.json();

      // Remember credentials if checked
      if (rememberCheckbox.checked) {
        localStorage.setItem('remembered_phone', phone);
        localStorage.setItem('remembered_password', password);
      } else {
        localStorage.removeItem('remembered_phone');
        localStorage.removeItem('remembered_password');
      }

      // Show the server's response message
      if (result.success) {
        if (result.data && result.data.token) {
          localStorage.setItem('token', result.data.token);
          // Some common auth keys in case the app checks these
          localStorage.setItem('Authori-zation', 'Bearer ' + result.data.token);
          localStorage.setItem('auth_token', result.data.token);
        }
        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => location.href = '/spin', 1500);
      } else {
        showToast(result.message || 'The account or password is incorrect. Please try again.', 'error');
      }

    } catch (err) {
      console.error('Login error:', err);
      showToast('Network error. Please try again.', 'error');
    } finally {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
  }

  // --- Load Remembered Credentials ---
  function loadRemembered() {
    const savedPhone = localStorage.getItem('remembered_phone');
    const savedPassword = localStorage.getItem('remembered_password');
    if (savedPhone) {
      phoneInput.value = savedPhone;
      rememberCheckbox.checked = true;
    }
    if (savedPassword) {
      passwordInput.value = savedPassword;
    }
  }
});

// --- Toast Notification ---
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
