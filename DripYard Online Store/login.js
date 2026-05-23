const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const forgotLink = document.getElementById('forgot-password-link');
const passwordGroup = document.getElementById('password-group');
const loginBtn = document.getElementById('login-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn = document.getElementById('back-to-login-btn');
const forgotMessage = document.getElementById('forgot-message');
const loginForm = document.getElementById('loginForm');
let isResetMode = false;

forgotLink.addEventListener('click', function(e) {
  e.preventDefault();
  isResetMode = true;
  passwordGroup.style.display = 'none';
  loginBtn.style.display = 'none';
  resetBtn.style.display = 'block';
  backBtn.style.display = 'block';
  forgotLink.style.display = 'none';
  forgotMessage.style.display = 'none';
});

backBtn.addEventListener('click', function() {
  isResetMode = false;
  passwordGroup.style.display = 'block';
  loginBtn.style.display = 'block';
  resetBtn.style.display = 'none';
  backBtn.style.display = 'none';
  forgotLink.style.display = 'inline';
  forgotMessage.style.display = 'none';
});

resetBtn.addEventListener('click', async function() {
  const email = document.getElementById('email').value.trim().toLowerCase();
  if (!email) { alert('Please enter your email.'); return; }
  resetBtn.disabled = true;
  resetBtn.textContent = 'Sending...';
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://dripyard.co.za/reset-password.html'
  });
  forgotMessage.style.display = 'block';
  if (error) {
    forgotMessage.textContent = 'Error: ' + error.message;
    forgotMessage.style.background = '#fee2e2';
    forgotMessage.style.color = '#dc2626';
  } else {
    forgotMessage.textContent = '✅ If this email is registered, a reset link has been sent. Check your inbox.';
    forgotMessage.style.background = '#dbeafe';
    forgotMessage.style.color = '#1e40af';
  }
  resetBtn.disabled = false;
  resetBtn.textContent = 'Send Reset Link';
});

loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (isResetMode) return;
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) { alert(error.message); return; }
  if (!data?.user?.email_confirmed_at) { alert('Please confirm your email first.'); return; }
  localStorage.setItem('loggedInUser', email);
  window.location.href = 'store.html';
});

async function resendConfirmation() {
  const email = prompt('Enter your email to resend confirmation:');
  if (!email) return;
  const { error } = await client.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: 'https://dripyard.co.za/login.html' }
  });
  if (error) { alert('Error: ' + error.message); }
  else { alert('✅ Confirmation link sent! Check your inbox.'); }
}