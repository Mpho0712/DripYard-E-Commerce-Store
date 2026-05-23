 const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

let currentUser = null;
let userOrders = [];
let originalValues = {};

// Check authentication
async function checkAuth() {
  const { data: sessionData } = await client.auth.getSession();
  
  if (!sessionData.session) {
    alert('Please log in to view your profile.');
    window.location.href = 'login.html';
    return false;
  }
  
  currentUser = sessionData.session.user;
  return true;
}

// Load user profile
async function loadProfile() {
  if (!currentUser) return;
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error loading profile:', error);
    return;
  }
  
  const profile = data || {};
  
  document.getElementById('full-name').value = profile.full_name || currentUser.email?.split('@')[0] || '';
  document.getElementById('email').value = currentUser.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('mall').value = profile.mall || '';
  document.getElementById('postal_code').value = profile.postal_code || '';
  document.getElementById('province').value = profile.province || '';
  
  document.getElementById('welcome-name').textContent = `Welcome, ${profile.full_name || currentUser.email?.split('@')[0] || 'User'}!`;
  
  const memberDate = new Date(currentUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  document.getElementById('member-since').textContent = `Member since ${memberDate}`;
  
  // Store original values
  originalValues = {
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    address: profile.address || '',
    mall: profile.mall || '',
    postal_code: profile.postal_code || '',
    province: profile.province || ''
  };
  
  // Load profile photo if exists
  if (profile.avatar_url && profile.avatar_url !== '') {
    const avatarCircle = document.getElementById('avatar-circle');
    if (avatarCircle) {
      avatarCircle.innerHTML = `<img src="${profile.avatar_url}" alt="Profile">`;
    }
  }
  
  // Load notification preference
  const notificationToggle = document.getElementById('notifications-toggle');
  if (notificationToggle) {
    notificationToggle.checked = profile.email_notifications !== false;
  }
}

// Load user orders
async function loadOrders() {
  if (!currentUser) return;
  
  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;
  
  ordersList.innerHTML = '<div class="loading-orders">Loading your orders...</div>';
  
  const { data, error } = await client
    .from('orders')
    .select(`
      id,
      status,
      final_total,
      created_at,
      items,
      tracking_number
    `)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading orders:', error);
    ordersList.innerHTML = '<div class="no-orders">Failed to load orders. Please try again.</div>';
    return;
  }
  
  userOrders = data || [];
  displayOrders();
}

// Display orders with filter and Track Order button
function displayOrders() {
  const filter = document.getElementById('order-filter')?.value || 'all';
  const ordersList = document.getElementById('orders-list');
  
  if (!ordersList) return;
  
  let filteredOrders = userOrders;
  if (filter !== 'all') {
    filteredOrders = userOrders.filter(order => order.status === filter);
  }
  
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = '<div class="no-orders">No orders found.</div>';
    return;
  }
  
  ordersList.innerHTML = filteredOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-id">Order #${order.id}</span>
          <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <span class="order-status ${order.status.replace(/ /g, '-')}">${order.status}</span>
      </div>
      <div class="order-items">
        ${Array.isArray(order.items) ? order.items.map(item => `
          <div class="order-item">
            <span>${escapeHtml(item.name)} x${item.qty || 1}</span>
            <span>R${item.price}</span>
          </div>
        `).join('') : ''}
      </div>
      <div class="order-footer">
        <div class="order-tracking">
          <i class="fas fa-truck"></i>
          <span>Tracking: ${order.tracking_number || 'Not available'}</span>
        </div>
        <div class="order-total">
          <strong>Total: R${order.final_total}</strong>
        </div>
        <div class="order-buttons">
          <button class="view-order-btn" onclick="viewOrderDetails('${order.id}')">View Details</button>
          <button class="track-order-btn" onclick="goToTrackOrder('${order.id}')">
            <i class="fas fa-map-marker-alt"></i> Track Order
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Go to track order page
function goToTrackOrder(orderId) {
  window.location.href = `track-order.html?order=${orderId}`;
}

// View order details
function viewOrderDetails(orderId) {
  const order = userOrders.find(o => o.id == orderId);
  if (!order) return;
  
  const itemsList = Array.isArray(order.items) 
    ? order.items.map(item => `${item.name} x${item.qty || 1} - R${item.price}`).join('\n')
    : 'No items';
  
  alert(`Order #${order.id}\n\nStatus: ${order.status}\nTotal: R${order.final_total}\nTracking: ${order.tracking_number || 'Not available'}\nDate: ${new Date(order.created_at).toLocaleString()}\n\nItems:\n${itemsList}`);
}

// Save profile
async function saveProfile(event) {
  event.preventDefault();
  
  const full_name = document.getElementById('full-name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const mall = document.getElementById('mall').value.trim();
  const postal_code = document.getElementById('postal_code').value.trim();
  const province = document.getElementById('province').value.trim();
  
  // Validation
  if (phone && !/^\d{10,}$/.test(phone)) {
    alert('Phone must be at least 10 digits.');
    return;
  }
  
  if (postal_code && !/^\d{4}$/.test(postal_code)) {
    alert('Postal code must be exactly 4 digits.');
    return;
  }
  
  const { error } = await client
    .from('profiles')
    .update({ 
      full_name, 
      phone, 
      address, 
      mall, 
      postal_code, 
      province,
      updated_at: new Date()
    })
    .eq('id', currentUser.id);
  
  if (error) {
    console.error('Update error:', error);
    alert('Failed to update profile: ' + error.message);
  } else {
    alert('Profile updated successfully!');
    disableEdit();
    originalValues = { full_name, phone, address, mall, postal_code, province };
    document.getElementById('welcome-name').textContent = `Welcome, ${full_name || currentUser.email?.split('@')[0] || 'User'}!`;
  }
}

// Enable edit mode
function enableEdit() {
  const inputs = ['full-name', 'phone', 'address', 'mall', 'postal_code', 'province'];
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.readOnly = false;
  });
  const formActions = document.getElementById('form-actions');
  if (formActions) formActions.style.display = 'flex';
  const editBtn = document.querySelector('.edit-btn');
  if (editBtn) editBtn.style.display = 'none';
}

// Disable edit mode
function disableEdit() {
  const inputs = ['full-name', 'phone', 'address', 'mall', 'postal_code', 'province'];
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.readOnly = true;
  });
  const formActions = document.getElementById('form-actions');
  if (formActions) formActions.style.display = 'none';
  const editBtn = document.querySelector('.edit-btn');
  if (editBtn) editBtn.style.display = 'inline-flex';
}

// Cancel edit
function cancelEdit() {
  for (const key in originalValues) {
    const inputId = key.replace('_', '-');
    const element = document.getElementById(inputId);
    if (element) {
      element.value = originalValues[key];
      element.readOnly = true;
    }
  }
  const formActions = document.getElementById('form-actions');
  if (formActions) formActions.style.display = 'none';
  const editBtn = document.querySelector('.edit-btn');
  if (editBtn) editBtn.style.display = 'inline-flex';
}

// Change password modal
function showChangePassword() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.style.display = 'flex';
}

function closePasswordModal() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.style.display = 'none';
  const currentPw = document.getElementById('current-password');
  const newPw = document.getElementById('new-password');
  const confirmPw = document.getElementById('confirm-password');
  if (currentPw) currentPw.value = '';
  if (newPw) newPw.value = '';
  if (confirmPw) confirmPw.value = '';
}

async function changePassword() {
  const currentPassword = document.getElementById('current-password')?.value || '';
  const newPassword = document.getElementById('new-password')?.value || '';
  const confirmPassword = document.getElementById('confirm-password')?.value || '';
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Please fill in all fields');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  // First verify current password by trying to sign in
  const { error: signInError } = await client.auth.signInWithPassword({
    email: currentUser.email,
    password: currentPassword
  });
  
  if (signInError) {
    alert('Current password is incorrect');
    return;
  }
  
  // Update password
  const { error } = await client.auth.updateUser({ password: newPassword });
  
  if (error) {
    alert('Error changing password: ' + error.message);
  } else {
    alert('Password changed successfully! Please login again.');
    await client.auth.signOut();
    window.location.href = 'login.html';
  }
}

// Delete account modal
function showDeleteAccount() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.style.display = 'none';
  const confirmInput = document.getElementById('delete-confirm');
  if (confirmInput) confirmInput.value = '';
}

async function deleteAccount() {
  const confirmText = document.getElementById('delete-confirm')?.value || '';
  
  if (confirmText !== 'DELETE') {
    alert('Please type "DELETE" to confirm account deletion');
    return;
  }
  
  if (!confirm('Are you absolutely sure? This will delete all your data forever.')) return;
  
  try {
    // Delete user data from profiles
    await client.from('profiles').delete().eq('id', currentUser.id);
    await client.from('cart').delete().eq('user_id', currentUser.id);
    
    // Sign out and redirect
    await client.auth.signOut();
    alert('Account deleted successfully');
    window.location.href = 'signup.html';
  } catch (error) {
    alert('Error deleting account: ' + error.message);
  }
}

// Toggle notifications
async function toggleNotifications(e) {
  const isChecked = e.target.checked;
  const { error } = await client
    .from('profiles')
    .update({ email_notifications: isChecked })
    .eq('id', currentUser.id);
  
  if (error) console.error('Error saving notification preference:', error);
}

// Profile photo upload
function setupPhotoUpload() {
  const changePhotoBtn = document.getElementById('change-photo-btn');
  const photoInput = document.getElementById('profile-photo-input');
  
  if (!changePhotoBtn || !photoInput) return;
  
  changePhotoBtn.addEventListener('click', () => {
    photoInput.click();
  });
  
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Please select an image under 2MB.');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async function() {
      const avatarUrl = reader.result;
      
      const { error } = await client
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);
      
      if (error) {
        alert('Error uploading photo: ' + error.message);
      } else {
        const avatarCircle = document.getElementById('avatar-circle');
        if (avatarCircle) {
          avatarCircle.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
        }
        alert('Profile photo updated!');
      }
    };
    reader.readAsDataURL(file);
  });
}

// Tab switching
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  if (!tabs.length) return;
  
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      tabs.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      btn.classList.add('active');
      const activeTab = document.getElementById(`${tabId}-tab`);
      if (activeTab) activeTab.classList.add('active');
      
      if (tabId === 'orders') {
        loadOrders();
      }
    });
  });
}

// Logout
async function logout() {
  const confirmLogout = confirm('Are you sure you want to logout?');
  if (!confirmLogout) return;
  
  await client.auth.signOut();
  window.location.href = 'store.html';
}

// Sidebar functions
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

// Update cart count
async function updateCartCount() {
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  const cartCountSpan = document.getElementById('cart-count');
  
  if (!cartCountSpan) return;
  
  if (userId) {
    const { data } = await client
      .from('cart')
      .select('quantity')
      .eq('user_id', userId);
    
    const total = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    cartCountSpan.textContent = total;
  } else {
    const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    const total = guestCart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountSpan.textContent = total;
  }
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await loadProfile();
    await updateCartCount();
    setupPhotoUpload();
    setupTabs();
    
    // Form event listeners
    const profileForm = document.getElementById('profile-form');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);
    
    const cancelEditBtn = document.getElementById('cancel-edit');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
    
    const notificationsToggle = document.getElementById('notifications-toggle');
    if (notificationsToggle) notificationsToggle.addEventListener('change', toggleNotifications);
    
    const orderFilter = document.getElementById('order-filter');
    if (orderFilter) orderFilter.addEventListener('change', displayOrders);
    
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) cartIcon.addEventListener('click', () => window.location.href = 'cart.html');
  }
});

// Expose functions globally
window.enableEdit = enableEdit;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showChangePassword = showChangePassword;
window.closePasswordModal = closePasswordModal;
window.changePassword = changePassword;
window.showDeleteAccount = showDeleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.deleteAccount = deleteAccount;
window.viewOrderDetails = viewOrderDetails;
window.goToTrackOrder = goToTrackOrder;