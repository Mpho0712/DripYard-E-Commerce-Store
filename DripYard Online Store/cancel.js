const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

document.addEventListener('DOMContentLoaded', async () => {
  await handleCancelledPayment();
});

async function handleCancelledPayment() {
  // PRIMARY: Get order ID from localStorage
  let orderId = localStorage.getItem('pendingOrderId');
  
  console.log('❌ Payment cancelled');
  console.log('📋 Order ID from localStorage:', orderId);
  
  // SECONDARY: Try URL parameters
  if (!orderId) {
    const urlParams = new URLSearchParams(window.location.search);
    const orderRef = urlParams.get('orderref');
    orderId = localStorage.getItem(`order_${orderRef}`);
    console.log('🔍 Fallback - Order ID from URL ref:', orderId);
  }
  
  if (orderId) {
    try {
      // Delete the pending order from database
      const { error } = await client
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('status', 'Pending Payment');

      if (error) {
        console.error('❌ Error deleting cancelled order:', error);
      } else {
        console.log('✅ Cancelled order deleted successfully');
      }
      
    } catch (err) {
      console.error('❌ Error:', err);
    }
  }

  // Clean up checkout localStorage BUT KEEP CART ITEMS
  // This allows the user to try again with the same cart
  localStorage.removeItem('pendingOrderId');
  localStorage.removeItem('pendingOrderData');
  localStorage.removeItem('pendingCartItems');
  localStorage.removeItem('pendingFinalTotal');
  localStorage.removeItem('pendingDeliveryMethod');
  
  // Also clean up any URL reference mappings
  const urlParams = new URLSearchParams(window.location.search);
  const orderRef = urlParams.get('orderref');
  if (orderRef) {
    localStorage.removeItem(`order_${orderRef}`);
  }
  
  console.log('🛒 Cart preserved for retry - only payment data cleared');
}

console.log('🎯 Cancel page ready');