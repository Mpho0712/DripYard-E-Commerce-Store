const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const PAYFAST_CONFIG = {
  merchant_id: '32195945',
  merchant_key: 'q71tko5xqj1wf',
  return_url: 'https://dripyard.co.za/success.html',
  cancel_url: 'https://dripyard.co.za/cancel.html',
  notify_url: 'https://dripyard.co.za/api/payfast-notify',
  sandbox: false  // LIVE mode
};
// PayFast URLs
const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';
const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process';

let cartItems = [];
let cartTotal = 0;
let deliveryFee = 0;
let finalTotal = 0;
let deliveryInfo = {};
let userId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadCheckoutData();
  setupPayNowButton();
});

async function loadCheckoutData() {
  let cartData, totalData, deliveryFeeData, deliveryInfoData, finalTotalData;
  
  try {
    cartData = localStorage.getItem('cartItems') || sessionStorage.getItem('cartItems');
    totalData = localStorage.getItem('cartTotal') || sessionStorage.getItem('cartTotal');
    deliveryFeeData = localStorage.getItem('deliveryFee') || sessionStorage.getItem('deliveryFee');
    deliveryInfoData = localStorage.getItem('guestDeliveryInfo') || sessionStorage.getItem('guestDeliveryInfo');
    finalTotalData = localStorage.getItem('finalTotal') || sessionStorage.getItem('finalTotal');
  } catch (e) {
    console.log('⚠️ Storage access issue');
  }

  console.log('📦 Loading checkout...');

  if (!cartData || !totalData) {
    showEmptyCart();
    return;
  }

  try {
    cartItems = JSON.parse(cartData);
    cartTotal = parseFloat(totalData) || 0;
    deliveryFee = parseFloat(deliveryFeeData) || 0;
    finalTotal = parseFloat(finalTotalData) || (cartTotal + deliveryFee);
    deliveryInfo = JSON.parse(deliveryInfoData || '{}');
  } catch (e) {
    console.error('❌ Parse error:', e);
    showEmptyCart();
    return;
  }

  if (cartItems.length === 0) {
    showEmptyCart();
    return;
  }

  const { data: sessionData } = await client.auth.getSession();
  userId = sessionData?.session?.user?.id || null;

  console.log('✅ Checkout ready:');
  console.log('  Items:', cartItems.length);
  console.log('  Final Total: R' + finalTotal);
  console.log('  Sandbox Mode:', PAYFAST_CONFIG.sandbox ? 'ON (Testing)' : 'OFF (LIVE)');
  console.log('  Return URL:', PAYFAST_CONFIG.return_url);

  renderCartItems();
  updateOrderSummary();
  displayDeliveryInfo();
}

function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  container.innerHTML = cartItems.map(item => `
    <div class="cart-item-mini">
      <img src="${item.image || 'https://via.placeholder.com/55'}" 
           alt="${escapeHtml(item.name)}" 
           class="cart-item-image"
           onerror="this.src='https://via.placeholder.com/55?text=DY'" />
      <div class="cart-item-details">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-variant">
          ${item.color ? `Color: ${item.color} | ` : ''}${item.size ? `Size: ${item.size}` : ''}
        </div>
        <div class="item-price-row">
          <span class="item-qty">x${item.quantity || 1}</span>
          <span class="item-total">R${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function updateOrderSummary() {
  document.getElementById('summary-subtotal').textContent = `R${cartTotal.toFixed(2)}`;
  document.getElementById('summary-delivery-fee').textContent = deliveryFee > 0 ? `R${deliveryFee.toFixed(2)}` : 'FREE';
  document.getElementById('summary-total').textContent = `R${finalTotal.toFixed(2)}`;
}

function displayDeliveryInfo() {
  if (!deliveryInfo || !deliveryInfo.full_name) return;
  
  document.getElementById('delivery-method-display').textContent = deliveryInfo.method || 'Not specified';
  document.getElementById('delivery-name-display').textContent = deliveryInfo.full_name || '-';
  document.getElementById('delivery-address-display').textContent = 
    `${deliveryInfo.address || ''}, ${deliveryInfo.mall || ''}, ${deliveryInfo.province || ''} ${deliveryInfo.postal_code || ''}`;
  document.getElementById('delivery-email-display').textContent = deliveryInfo.email || '-';
  document.getElementById('delivery-phone-display').textContent = deliveryInfo.phone || '-';
}

function showEmptyCart() {
  document.getElementById('checkout-grid').style.display = 'none';
  document.getElementById('empty-cart-message').style.display = 'block';
}

function setupPayNowButton() {
  const payBtn = document.getElementById('pay-now-btn');
  if (!payBtn) return;

  payBtn.addEventListener('click', async () => {
    if (!deliveryInfo || !deliveryInfo.full_name || !deliveryInfo.email) {
      alert('Please complete your delivery information first.');
      window.location.href = 'delivery.html';
      return;
    }

    document.getElementById('loading-overlay').classList.add('active');
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
      // STEP 1: Save order to Supabase
      console.log('💾 Saving order to Supabase...');
      const orderId = await saveOrderToDatabase();
      
      if (!orderId) {
        alert('❌ Failed to create order. Please try again.');
        document.getElementById('loading-overlay').classList.remove('active');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now with PayFast';
        return;
      }

      console.log('✅ Order saved! ID:', orderId);
      
      // STEP 2: Save order data to storage for success page
      try {
        const orderData = {
          id: orderId,
          total: finalTotal,
          method: deliveryInfo.method || 'Standard',
          timestamp: Date.now()
        };
        localStorage.setItem('pendingOrderId', orderId);
        localStorage.setItem('pendingOrderData', JSON.stringify(orderData));
        localStorage.setItem('pendingFinalTotal', finalTotal.toString());
        localStorage.setItem('pendingDeliveryMethod', deliveryInfo.method || 'Standard');
        console.log('✅ Order data saved to storage');
      } catch (e) {
        console.log('⚠️ Could not save to storage');
      }

      // STEP 3: Build PayFast URL and redirect
      const paymentUrl = buildPayFastUrl(orderId);
      console.log('🔗 Redirecting to PayFast...');
      
      window.location.href = paymentUrl;
      
    } catch (err) {
      console.error('❌ Error:', err);
      alert('An error occurred. Please try again.');
      document.getElementById('loading-overlay').classList.remove('active');
      payBtn.disabled = false;
      payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now with PayFast';
    }
  });
}

async function saveOrderToDatabase() {
  console.log('💾 SAVING ORDER TO SUPABASE...');
  
  const itemsArray = cartItems.map(item => ({
    name: item.name,
    price: item.price,
    qty: item.quantity || 1,
    color: item.color || '',
    size: item.size || ''
  }));

  const orderData = {
    customer_name: deliveryInfo.full_name || 'Unknown',
    customer_email: deliveryInfo.email || 'unknown@email.com',
    customer_phone: deliveryInfo.phone || '',
    customer_address: deliveryInfo.address || '',
    customer_mall: deliveryInfo.mall || '',
    customer_province: deliveryInfo.province || '',
    customer_postal_code: deliveryInfo.postal_code || '',
    delivery_method: deliveryInfo.method || 'Standard',
    items: itemsArray,
    status: 'Pending Payment',
    final_total: finalTotal,
    payment_status: 'pending',
    created_at: new Date().toISOString()
  };

  if (userId) {
    orderData.user_id = userId;
  }

  try {
    const { data, error } = await client
      .from('orders')
      .insert([orderData])
      .select('id')
      .single();

    if (error) {
      console.error('❌ Save error:', error.message);
      return null;
    }

    if (data && data.id) {
      console.log('✅ Order saved! ID:', data.id);
      return data.id;
    }

    return null;
    
  } catch (err) {
    console.error('❌ Error:', err);
    return null;
  }
}

function buildPayFastUrl(orderId) {
  // Use sandbox URL for testing, live URL for production
  const baseUrl = PAYFAST_CONFIG.sandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL;
  
  const timestamp = Date.now();
  const paymentId = `DY-${timestamp}`;
  const formattedAmount = finalTotal.toFixed(2);
  
  const nameParts = (deliveryInfo.full_name || 'Customer').trim().split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'DripYard';
  const cellNumber = (deliveryInfo.phone || '0600000000').replace(/\D/g, '');
  
  const itemCount = cartItems.length;
  const itemDescription = `${itemCount} item${itemCount > 1 ? 's' : ''} from DripYard`;

  const paymentData = {
    merchant_id: PAYFAST_CONFIG.merchant_id,
    merchant_key: PAYFAST_CONFIG.merchant_key,
    return_url: PAYFAST_CONFIG.return_url,
    cancel_url: PAYFAST_CONFIG.cancel_url,
    notify_url: PAYFAST_CONFIG.notify_url,
    name_first: firstName,
    name_last: lastName,
    email_address: deliveryInfo.email || 'customer@dripyard.co.za',
    cell_number: cellNumber,
    m_payment_id: paymentId,
    amount: formattedAmount,
    item_name: 'DripYard Order',
    item_description: itemDescription,
    custom_int1: timestamp,
    custom_str1: orderId,
    custom_str2: userId || 'guest'
  };

  console.log('💳 PayFast Payment Data:');
  console.log('  Merchant ID:', paymentData.merchant_id);
  console.log('  Amount: R' + paymentData.amount);
  console.log('  Mode:', PAYFAST_CONFIG.sandbox ? 'SANDBOX' : 'LIVE');
  console.log('  Return URL:', paymentData.return_url);

  const queryString = Object.entries(paymentData)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('🛒 DripYard Checkout Ready');
console.log('🔑 Merchant ID:', PAYFAST_CONFIG.merchant_id);
console.log('🧪 Mode:', PAYFAST_CONFIG.sandbox ? 'SANDBOX (Testing)' : 'LIVE');
console.log('📍 Return URL:', PAYFAST_CONFIG.return_url);