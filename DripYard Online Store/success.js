const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DripYard Success Page Loaded');
  
  await processPayment();
  setupWhatsAppButton();
});

async function processPayment() {
  const displayOrderId = document.getElementById('display-order-id');
  const displayTotal = document.getElementById('display-total');
  const displayDelivery = document.getElementById('display-delivery');
  const displayStatus = document.getElementById('display-status');
  const statusMessage = document.getElementById('status-message');

  console.log('🔍 Searching for order...');
  
  let orderId = null;
  let orderData = null;
  
  try {
    orderId = localStorage.getItem('pendingOrderId');
    const orderDataStr = localStorage.getItem('pendingOrderData');
    if (orderDataStr) {
      try { orderData = JSON.parse(orderDataStr); } catch (e) {}
    }
    console.log('📋 Storage Order ID:', orderId);
  } catch (e) {
    console.log('⚠️ localStorage not accessible');
  }
  
  if (!orderId) {
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get('custom_str1');
    console.log('📋 URL Order ID:', orderId);
  }
  
  if (!orderId) {
    console.log('🔍 Searching database for pending orders...');
    try {
      const { data: pendingOrders, error } = await client
        .from('orders')
        .select('*')
        .eq('status', 'Pending Payment')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('❌ Search error:', error);
      } else if (pendingOrders && pendingOrders.length > 0) {
        orderData = pendingOrders[0];
        orderId = orderData.id;
        console.log('✅ Found pending order:', orderId);
      } else {
        console.log('⚠️ No pending orders found');
      }
    } catch (e) {
      console.error('❌ Error:', e);
    }
  }
  
  if (orderId && !orderData) {
    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (data) {
        orderData = data;
        console.log('✅ Fetched order');
      }
    } catch (e) {
      console.log('⚠️ Could not fetch order:', e);
    }
  }
  
  if (orderId) {
    console.log('🔄 Updating order status...');
    
    try {
      const { data: updated, error } = await client
        .from('orders')
        .update({
          status: 'Order Placed',
          payment_status: 'paid'
        })
        .eq('id', orderId)
        .select('*')
        .single();
      
      if (error) {
        console.log('⚠️ Update error:', error.message);
      } else if (updated) {
        orderData = updated;
        console.log('✅ Order updated');
      }
    } catch (e) {
      console.log('⚠️ Update error:', e);
    }
    
    // DISPLAY FULL ORDER ID
    if (displayOrderId) displayOrderId.textContent = orderId;
    if (displayTotal) displayTotal.textContent = 'R' + parseFloat(orderData?.final_total || 0).toFixed(2);
    if (displayDelivery) displayDelivery.textContent = orderData?.delivery_method || 'Standard Delivery';
    if (displayStatus) {
      displayStatus.textContent = 'Order Placed ✓';
      displayStatus.style.color = '#10b981';
    }
    if (statusMessage) {
      statusMessage.textContent = 'Thank you for your purchase! Your order has been confirmed.';
    }
    
    const trackBtn = document.getElementById('track-btn');
    if (trackBtn) trackBtn.href = 'track-order.html?order=' + orderId;
    
    console.log('✅ Order ID displayed:', orderId);
    
  } else {
    console.log('⚠️ No order found');
    
    if (displayOrderId) displayOrderId.textContent = 'Order Confirmed';
    if (displayTotal) displayTotal.textContent = 'Thank you!';
    if (displayDelivery) displayDelivery.textContent = 'Standard Delivery';
    if (displayStatus) {
      displayStatus.textContent = 'Confirmed ✓';
      displayStatus.style.color = '#10b981';
    }
    if (statusMessage) {
      statusMessage.textContent = 'Your payment was successful! Contact us if you have any questions.';
    }
  }
  
  console.log('🧹 Cleaning up...');
  
  try {
    const { data: session } = await client.auth.getSession();
    const userId = session?.session?.user?.id;
    if (userId) {
      await client.from('cart').delete().eq('user_id', userId);
    }
  } catch (e) {}
  
  const keysToRemove = [
    'cartItems', 'cartTotal', 'deliveryFee', 'finalTotal',
    'guestDeliveryInfo', 'guestCart', 'deliveryMethod',
    'pendingOrderId', 'pendingOrderData', 'pendingCartItems',
    'pendingFinalTotal', 'pendingDeliveryMethod'
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {}
  });
  
  console.log('✅ Cleanup complete');
}

function setupWhatsAppButton() {
  const whatsappBtn = document.getElementById('whatsapp-btn');
  if (!whatsappBtn) return;
  
  whatsappBtn.href = 'https://wa.me/276700601977?text=Hi%20DripYard!%20I%20just%20placed%20an%20order.';
  whatsappBtn.target = '_blank';
}