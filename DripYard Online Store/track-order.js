const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

document.addEventListener('DOMContentLoaded', () => {
  const orderInput = document.getElementById('order-number');
  const trackBtn = document.getElementById('track-btn');
  const searchError = document.getElementById('search-error');
  const orderDetails = document.getElementById('order-details');

  // Check if order ID is passed in URL (from profile page)
  const urlParams = new URLSearchParams(window.location.search);
  const urlOrderId = urlParams.get('order');
  
  if (urlOrderId) {
    orderInput.value = urlOrderId;
    // Auto-track the order
    setTimeout(() => {
      trackOrder();
    }, 500);
  }

  // Status order mapping - matches admin panel
  const statusOrder = {
    'Order Placed': 1,
    'Order Confirmed': 2,
    'Processing': 3,
    'Shipped': 4,
    'Delivered': 5
  };

  function getStatusStep(status) {
    const stepMap = {
      'Order Placed': 1,
      'Order Confirmed': 2,
      'Processing': 3,
      'Shipped': 4,
      'Delivered': 5
    };
    return stepMap[status] || 1;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  function updateStatusTracker(currentStatus) {
    const steps = ['step-placed', 'step-confirmed', 'step-processing', 'step-shipped', 'step-delivered'];
    const statusLevel = getStatusStep(currentStatus);
    
    // Reset all steps
    steps.forEach(step => {
      const element = document.getElementById(step);
      if (element) {
        element.classList.remove('completed', 'active');
        const icon = element.querySelector('.status-icon i');
        if (icon) {
          if (step === 'step-placed') icon.className = 'fas fa-receipt';
          else if (step === 'step-confirmed') icon.className = 'fas fa-check-circle';
          else if (step === 'step-processing') icon.className = 'fas fa-box';
          else if (step === 'step-shipped') icon.className = 'fas fa-truck';
          else if (step === 'step-delivered') icon.className = 'fas fa-home';
        }
      }
    });
    
    // Reset lines
    for (let i = 1; i <= 4; i++) {
      const line = document.getElementById(`line${i}`);
      if (line) line.classList.remove('completed');
    }
    
    // Mark completed steps
    for (let i = 0; i < statusLevel; i++) {
      const step = document.getElementById(steps[i]);
      if (step) {
        step.classList.add('completed');
        const icon = step.querySelector('.status-icon i');
        if (icon && i < statusLevel - 1) {
          icon.className = 'fas fa-check-circle';
        } else if (icon && i === statusLevel - 1) {
          icon.className = 'fas fa-circle-notch fa-spin';
        }
      }
    }
    
    // Mark completed lines
    for (let i = 1; i < statusLevel; i++) {
      const line = document.getElementById(`line${i}`);
      if (line) line.classList.add('completed');
    }
    
    // Set the placed date
    if (window.currentOrder && window.currentOrder.created_at) {
      const placedDateSpan = document.querySelector('#step-placed .status-text span');
      if (placedDateSpan && placedDateSpan.id !== 'placed-date') {
        // Don't override if it's the special span
      }
    }
    
    // Update status text for current step
    if (statusLevel <= steps.length) {
      const currentStep = document.getElementById(steps[statusLevel - 1]);
      if (currentStep) {
        const statusText = currentStep.querySelector('.status-text span');
        if (statusText) {
          const statusMessages = {
            1: 'Your order has been placed. Awaiting confirmation.',
            2: 'Your order has been confirmed and is being processed.',
            3: 'Your items are being prepared for shipping.',
            4: 'Your order is on the way! Track your shipment.',
            5: 'Your order has been delivered. Enjoy your purchase!'
          };
          statusText.textContent = statusMessages[statusLevel] || '';
        }
      }
    }
  }

  async function trackOrder() {
    const orderNumber = orderInput.value.trim();
    
    if (!orderNumber) {
      searchError.textContent = 'Please enter an order id.';
      orderDetails.style.display = 'none';
      return;
    }
    
    searchError.textContent = '';
    trackBtn.disabled = true;
    trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    
    try {
      // Search for order by ID using the new orders table structure
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('id', orderNumber)
        .single();
      
      if (error || !data) {
        searchError.textContent = 'Order not found. Please check your order number and try again.';
        orderDetails.style.display = 'none';
        return;
      }
      
      // Store current order for reference
      window.currentOrder = data;
      
      // Display order details
      displayOrderDetails(data);
      
    } catch (err) {
      console.error('Error tracking order:', err);
      searchError.textContent = 'An error occurred. Please try again later.';
      orderDetails.style.display = 'none';
    } finally {
      trackBtn.disabled = false;
      trackBtn.innerHTML = 'Track Order';
    }
  }

  function displayOrderDetails(order) {
    // Order header
    document.getElementById('display-order-id').textContent = `Order #${order.id}`;
    document.getElementById('order-date').textContent = formatDate(order.created_at);
    
    // Set placed date in status tracker
    const placedDateSpan = document.getElementById('placed-date');
    if (placedDateSpan) {
      placedDateSpan.textContent = formatDate(order.created_at);
    }
    
    // Status tracker - using order status
    updateStatusTracker(order.status || 'Order Placed');
    
    // Info cards - using new column names
    document.getElementById('tracking-number').textContent = order.tracking_number || 'Not available yet';
    document.getElementById('order-total').textContent = `R${order.final_total?.toFixed(2) || '0.00'}`;
    
    // Items count
    const items = order.items || [];
    document.getElementById('item-count').textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    
    // Items list
    const itemsList = document.getElementById('items-list');
    if (items.length > 0) {
      itemsList.innerHTML = items.map(item => `
        <div class="order-item">
          <div class="item-info">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="item-details">
              <span>Color: ${item.color || 'N/A'}</span>
              <span>Size: ${item.size || 'N/A'}</span>
            </div>
          </div>
          <div class="item-quantity">x${item.quantity || 1}</div>
          <div class="item-price">R${item.price}</div>
        </div>
      `).join('');
    } else {
      itemsList.innerHTML = '<p class="no-items">No items found</p>';
    }
    
    // Delivery address - using customer_* columns from new table
    const address = order.customer_address || 'Not provided';
    const mall = order.customer_mall || '';
    const province = order.customer_province || '';
    const postalCode = order.customer_postal_code || '';
    const customerName = order.customer_name || 'Customer';
    const customerPhone = order.customer_phone || 'Not provided';
    const customerEmail = order.customer_email || 'Not provided';
    
    let addressHtml = `<p><strong>${escapeHtml(customerName)}</strong></p>`;
    addressHtml += `<p>📧 ${escapeHtml(customerEmail)}</p>`;
    addressHtml += `<p>${escapeHtml(address)}</p>`;
    if (mall) addressHtml += `<p>📍 ${escapeHtml(mall)}</p>`;
    if (province) addressHtml += `<p>${escapeHtml(province)}</p>`;
    if (postalCode) addressHtml += `<p>📮 Code: ${escapeHtml(postalCode)}</p>`;
    addressHtml += `<p>📞 ${escapeHtml(customerPhone)}</p>`;
    
    document.getElementById('delivery-address').innerHTML = addressHtml;
    
    // Show order details
    orderDetails.style.display = 'block';
    
    // Scroll to order details
    orderDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Event listeners
  trackBtn.addEventListener('click', trackOrder);
  orderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      trackOrder();
    }
  });
});