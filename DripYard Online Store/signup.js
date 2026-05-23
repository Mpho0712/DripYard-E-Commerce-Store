const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

// Password strength meter
const password = document.getElementById('password');
const passwordStrength = document.getElementById('passwordStrength');

password.addEventListener('input', () => {
  const val = password.value;
  if (val.length < 6) {
    passwordStrength.textContent = 'Weak';
    passwordStrength.style.color = 'red';
  } else if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(val)) {
    passwordStrength.textContent = 'Strong';
    passwordStrength.style.color = 'green';
  } else {
    passwordStrength.textContent = 'Medium';
    passwordStrength.style.color = 'orange';
  }
});

// Check if email already exists in Auth system
async function isEmailRegistered(email) {
  // Try to sign in with a fake password - if it says "Invalid login credentials", the user exists
  const { error } = await client.auth.signInWithPassword({
    email: email,
    password: 'checking-if-email-exists-123456789'
  });

  if (error && (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed'))) {
    return true; // Email exists in Auth
  }

  return false; // Email doesn't exist in Auth
}

// Form submission
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const full_name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm-password').value;
  const address = document.getElementById('address').value.trim();
  const mall = document.getElementById('mall').value.trim();
  const postal_code = document.getElementById('postal_code').value.trim();
  const province = document.getElementById('province').value;

  // Validation
  if (full_name.length < 3) return showError('nameError', 'Full name must be at least 3 characters.');
  if (!/^\d{10,}$/.test(phone)) return showError('phoneError', 'Phone must be at least 10 digits.');
  if (!email.endsWith('@gmail.com')) return showError('emailError', 'Email must end with @gmail.com.');
  if (password.length < 6) return showError('passwordError', 'Password must be at least 6 characters.');
  if (password !== confirm) return showError('confirmError', 'Passwords do not match.');
  if (address.length < 5) return showError('addressError', 'Address must be at least 5 characters.');
  if (mall.length < 3) return showError('mallError', 'Mall name must be at least 3 characters.');
  if (!/^\d{4}$/.test(postal_code)) return showError('postal_codeError', 'Postal code must be exactly 4 digits.');
  if (!province) return showError('provinceError', 'Please select your province.');

  // Check if email already exists in Auth
  const emailExists = await isEmailRegistered(email);
  if (emailExists) {
    showError('emailError', 'An account with this email already exists. Please login instead.');
    return;
  }

  // Create the user
  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://dripyard.co.za/login.html'
    }
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('duplicate')) {
      showError('emailError', 'An account with this email already exists. Please login instead.');
    } else {
      alert('Signup failed: ' + error.message);
    }
    return;
  }

  // Save user details to localStorage
  const localKey = `user_${email}`;
  const userDetails = { full_name, phone, email, address, mall, postal_code, province };
  localStorage.setItem(localKey, JSON.stringify(userDetails));

  alert('Signup successful! A confirmation email has been sent. Please confirm your email before logging in.');
  window.location.href = 'login.html';
});

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.style.color = 'red';
  el.scrollIntoView({ behavior: 'smooth' });
}