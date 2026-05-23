const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

async function preloadUserInfo() {
  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const { data, error } = await client
    .from('profiles')
    .select('full_name, email, phone, address, mall, postal_code, province')
    .eq('id', user.id)
    .single();

  if (error || !data) return;

  document.getElementById('full-name').value = data.full_name || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('address').value = data.address || '';
  document.getElementById('mall').value = data.mall || '';
  document.getElementById('postal-code').value = data.postal_code || '';
  document.getElementById('province').value = data.province || '';
}

document.addEventListener('DOMContentLoaded', preloadUserInfo);

document.querySelector('.delivery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const selected = document.querySelector('input[name="delivery"]:checked');
  if (!selected) {
    showError('error-delivery', 'Please select a delivery method.');
    return;
  }

  const fullName = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const mall = document.getElementById('mall').value.trim();
  const postal_code = document.getElementById('postal-code').value.trim();
  const province = document.getElementById('province').value;
  const method = selected.value;

  let valid = true;

  if (fullName.length < 2) {
    showError('error-full-name', 'Full name must be at least 2 characters.');
    valid = false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('error-email', 'Invalid email format.');
    valid = false;
  }

  if (!/^\d{10}$/.test(phone)) {
    showError('error-phone', 'Phone number must be 10 digits.');
    valid = false;
  }

  if (address.length < 5) {
    showError('error-address', 'Address must be at least 5 characters.');
    valid = false;
  }

  if (mall.length < 2) {
    showError('error-mall', 'Mall name must be at least 2 characters.');
    valid = false;
  }

  if (!/^\d{4}$/.test(postal_code)) {
    showError('error-postal-code', 'Postal code must be 4 digits.');
    valid = false;
  }

  if (!province) {
    showError('error-province', 'Please select a province.');
    valid = false;
  }

  if (!valid) return;

  // ===== GET CART TOTAL =====
  const cartTotal = parseFloat(localStorage.getItem('cartTotal')) || 0;

  // ===== FREE SHIPPING LOGIC =====
  let deliveryFee = 0;
  let displayMethod = '';
  const FREE_SHIPPING_THRESHOLD = 3500;
  
  if (method === 'Collect') {
    // Collect is always free
    deliveryFee = 0;
    displayMethod = 'Collect — FREE';
  } else if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
    // Orders over R3500 get FREE shipping
    deliveryFee = 0;
    if (method === 'PAXI_7_9') {
      displayMethod = 'FREE SHIPPING 🎉';
    } else if (method === 'PAXI_3_5') {
      displayMethod = 'FREE SHIPPING 🎉';
    }
  } else {
    // Normal pricing for orders under R3500
    if (method === 'PAXI_7_9') {
      deliveryFee = 60;
      displayMethod = 'PAXI Standard (7-9 days) — R60';
    } else if (method === 'PAXI_3_5') {
      deliveryFee = 110;
      displayMethod = 'PAXI Express (3-5 days) — R110';
    }
  }

  // ===== FINAL TOTAL =====
  const finalTotal = cartTotal + deliveryFee;

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData?.session?.user;

  // Save delivery info to localStorage
  const deliveryInfo = {
    user_id: user?.id || null,
    full_name: fullName,
    email: email,
    phone: phone,
    address: address,
    mall: mall,
    postal_code: postal_code,
    province: province,
    method: displayMethod,
    fee: deliveryFee,
    cartTotal: cartTotal,
    finalTotal: finalTotal,
    freeShipping: cartTotal >= FREE_SHIPPING_THRESHOLD
  };
  
  localStorage.setItem('guestDeliveryInfo', JSON.stringify(deliveryInfo));
  localStorage.setItem('deliveryMethod', displayMethod);
  localStorage.setItem('deliveryFee', deliveryFee);
  localStorage.setItem('finalTotal', finalTotal);

  // For logged-in users, also save to delivery table
  if (user) {
    try {
      const { error: deliveryError } = await client
        .from('delivery')
        .insert([{
          full_name: fullName,
          email: email,
          phone: phone,
          address: address,
          mall: mall,
          postal_code: postal_code,
          province: province,
          method: displayMethod
        }]);
      
      if (deliveryError) {
        console.error('Error saving delivery:', deliveryError);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }

  window.location.href = 'checkout.html';
});