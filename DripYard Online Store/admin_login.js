const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.querySelector('#admin-login-form button[type="submit"]');
  
  // Clear previous error
  errorEl.textContent = '';
  
  // Validate inputs
  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password.';
    return;
  }
  
  // Disable button and show loading state
  const originalBtnText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  
  try {
    // Sign in with Supabase
    const { data, error } = await client.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      console.error('Login error:', error.message);
      errorEl.textContent = 'Invalid email or password. Please try again.';
      loginBtn.disabled = false;
      loginBtn.textContent = originalBtnText;
      return;
    }

    if (!data?.session) {
      errorEl.textContent = 'Login failed. Please try again.';
      loginBtn.disabled = false;
      loginBtn.textContent = originalBtnText;
      return;
    }

    // FIXED: Check if email matches admin email (simplest approach)
    if (email !== 'dipyard086@gmail.com') {
      errorEl.textContent = 'Access denied. Admin privileges required.';
      await client.auth.signOut();
      loginBtn.disabled = false;
      loginBtn.textContent = originalBtnText;
      return;
    }

    // Also check user metadata for admin role (as backup)
    const userMetadata = data.user.user_metadata || {};
    if (userMetadata.role !== 'admin' && email !== 'dipyard086@gmail.com') {
      errorEl.textContent = 'Access denied. Admin privileges required.';
      await client.auth.signOut();
      loginBtn.disabled = false;
      loginBtn.textContent = originalBtnText;
      return;
    }

    // Login successful - redirect to admin dashboard
    window.location.href = 'admin.html';
    
  } catch (err) {
    console.error('Unexpected error:', err);
    errorEl.textContent = 'An unexpected error occurred. Please try again.';
    loginBtn.disabled = false;
    loginBtn.textContent = originalBtnText;
  }
});

// Add password visibility toggle
const togglePassword = document.createElement('button');
togglePassword.type = 'button';
togglePassword.innerHTML = '👁️';
togglePassword.style.position = 'absolute';
togglePassword.style.right = '10px';
togglePassword.style.top = '50%';
togglePassword.style.transform = 'translateY(-50%)';
togglePassword.style.background = 'none';
togglePassword.style.border = 'none';
togglePassword.style.cursor = 'pointer';

const passwordInput = document.getElementById('admin-password');
if (passwordInput) {
  const passwordWrapper = passwordInput.parentElement;
  passwordWrapper.style.position = 'relative';
  passwordWrapper.appendChild(togglePassword);

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.innerHTML = type === 'password' ? '👁️' : '🙈';
  });
}