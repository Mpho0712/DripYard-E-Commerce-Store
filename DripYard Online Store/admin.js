const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const tableBody = document.querySelector('#orders-table tbody');
const statusFilter = document.getElementById('status-filter');
const exportBtn = document.getElementById('export-csv');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const notesInput = document.getElementById('admin-notes-input');
const saveNotesBtn = document.getElementById('save-admin-notes');

let orders = [];
let isAdmin = false;
let orderToDelete = null;

const statusOptions = [
  'Order Placed',
  'Order Confirmed',
  'Processing',
  'Shipped',
  'Delivered'
];

const paymentStatusOptions = ['pending', 'paid', 'refunded'];

async function checkAdminAuth() {
  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.warn("No session found. Redirecting to admin login...");
      window.location.href = 'admin_login.html';
      return false;
    }
    
    const userEmail = sessionData.session.user.email;
    const userMetadata = sessionData.session.user.user_metadata || {};
    
    if (userEmail === 'dipyard086@gmail.com' || userMetadata.role === 'admin') {
      console.log("Admin access granted");
      isAdmin = true;
      return true;
    }
    
    console.warn("User is not an admin. Redirecting...");
    alert("Access denied. Admin privileges required.");
    await client.auth.signOut();
    window.location.href = 'admin_login.html';
    return false;
    
  } catch (err) {
    console.error("Auth check error:", err);
    window.location.href = 'admin_login.html';
    return false;
  }
}

async function fetchOrders() {
  if (!isAdmin) return;
  
  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error.message);
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">❌ Failed to load orders. ${error.message}</td></tr>`;
      }
      return;
    }

    orders = data || [];
    console.log(`Loaded ${orders.length} orders`);
    renderTable();
    loadAdminNotes();
    
  } catch (err) {
    console.error("Fetch orders error:", err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">❌ Error loading orders. Please refresh.</td></tr>`;
    }
  }
}

async function deleteOrder(orderId) {
  try {
    console.log("🔍 Attempting to delete order:", orderId);
    
    const { data: existingOrder, error: checkError } = await client
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();
    
    if (checkError) {
      console.error("❌ Order not found:", checkError);
      alert("❌ Order not found in database.");
      return false;
    }
    
    console.log("✅ Order found, deleting...");
    
    const { error: deleteError } = await client
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (deleteError) {
      console.error("❌ Delete error:", deleteError);
      alert("❌ Failed to delete order: " + deleteError.message);
      return false;
    }
    
    console.log("✅ Order deleted successfully from database");
    
    orders = orders.filter(o => o.id != orderId);
    renderTable();
    
    alert("✅ Order has been permanently deleted from the database!");
    return true;
    
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    alert("❌ An error occurred while deleting the order.");
    return false;
  }
}

function showDeleteModal(orderId) {
  orderToDelete = orderId;
  const modal = document.getElementById('delete-modal');
  const orderIdDisplay = document.getElementById('delete-order-id');
  if (orderIdDisplay) {
    orderIdDisplay.textContent = `Order ID: ${orderId}`;
  }
  modal.style.display = 'flex';
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  modal.style.display = 'none';
  orderToDelete = null;
}

function renderTable() {
  if (!tableBody) return;
  
  const selectedStatus = statusFilter ? statusFilter.value : 'all';
  const searchTerm = searchBar ? searchBar.value.toLowerCase() : '';

  const filtered = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      order.id.toString().includes(searchTerm) ||
      (order.customer_name?.toLowerCase().includes(searchTerm) ?? false) ||
      (order.customer_email?.toLowerCase().includes(searchTerm) ?? false);
    return matchesStatus && matchesSearch;
  });

  tableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No orders found.</td></tr>`;
    return;
  }
  
  filtered.forEach(order => {
    const row = document.createElement('tr');
    const paymentStatus = order.payment_status || 'pending';
    const paymentBadge = paymentStatus === 'paid' 
      ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:10px;font-size:0.7rem;">Paid</span>'
      : paymentStatus === 'refunded'
      ? '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:10px;font-size:0.7rem;">Refunded</span>'
      : '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:10px;font-size:0.7rem;">Pending</span>';

    row.innerHTML = `
      <td data-label="Order ID">${order.id}
      <td data-label="Customer Info">
        <strong>${escapeHtml(order.customer_name || '—')}</strong><br>
        <small>📧 ${escapeHtml(order.customer_email || '—')}</small><br>
        <small>📞 ${escapeHtml(order.customer_phone || '—')}</small>
      
      <td data-label="Items">
        ${Array.isArray(order.items) && order.items.length > 0
          ? order.items.map(item => `
              <div class="item-entry">
                <strong>${escapeHtml(item.name)}</strong> ×${item.qty ?? 1}<br>
                <small>R${item.price} | ${escapeHtml(item.color || '—')} / ${escapeHtml(item.size || '—')}</small>
              </div>
            `).join('')
          : '—'}
      
      <td data-label="Address">
        ${escapeHtml(order.customer_address || '—')}<br>
        <small>${escapeHtml(order.customer_mall || '—')}, ${escapeHtml(order.customer_province || '—')}</small><br>
        <small>${escapeHtml(order.customer_postal_code || '—')}</small>
      
      <td data-label="Method">${escapeHtml(order.delivery_method || '—')}
      
      <td data-label="Payment">${paymentBadge}
      
      <td data-label="Status">
        <select data-order-id="${order.id}" class="status-dropdown">
          ${statusOptions.map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
        <div class="status-message" id="status-msg-${order.id}">
          ${escapeHtml(order.status)}
        </div>
      
      <td data-label="Tracking #">
        <div class="tracking-controls">
          <input type="text"
                 class="tracking-input"
                 data-order-id="${order.id}"
                 value="${escapeHtml(order.tracking_number || '')}"
                 placeholder="Enter tracking #" />
          <button class="save-tracking-btn" data-order-id="${order.id}">
            <i class="fas fa-save"></i>
          </button>
        </div>
        <div class="tracking-message" id="tracking-msg-${order.id}">
          ${order.tracking_number || 'No tracking number'}
        </div>
      
      <td data-label="Total" class="total-cell">R${order.final_total}
      <td data-label="Placed">${new Date(order.created_at).toLocaleString()}
      <td data-label="Actions" class="actions-cell">
        <button class="pdf-btn" data-order-id="${order.id}">
          <i class="fas fa-file-pdf"></i> PDF
        </button>
        <button class="send-email-btn" data-order-id="${order.id}">
          <i class="fas fa-envelope"></i> Email
        </button>
        <button class="delete-order-btn" data-order-id="${order.id}">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      
    `;

    tableBody.appendChild(row);
  });

  attachStatusListeners();
  attachTrackingListeners();
  attachPDFListeners();
  attachDeleteListeners();
  attachEmailListeners();
}

function attachPDFListeners() {
  document.querySelectorAll('.pdf-btn').forEach(btn => {
    btn.removeEventListener('click', handlePDFClick);
    btn.addEventListener('click', handlePDFClick);
  });
}

function handlePDFClick(e) {
  const orderId = e.currentTarget.getAttribute('data-order-id');
  const order = orders.find(o => o.id == orderId);
  if (order) {
    downloadOrderPDF(order);
  }
}

function attachEmailListeners() {
  document.querySelectorAll('.send-email-btn').forEach(btn => {
    btn.removeEventListener('click', handleEmailClick);
    btn.addEventListener('click', handleEmailClick);
  });
}

function handleEmailClick(e) {
  const orderId = e.currentTarget.getAttribute('data-order-id');
  const order = orders.find(o => o.id == orderId);
  if (order && order.customer_email) {
    const subject = encodeURIComponent(`DripYard Order #${order.id} Update`);
    const body = encodeURIComponent(`Hi ${order.customer_name},\n\nYour order #${order.id} is ${order.status}.\nTracking: ${order.tracking_number || 'Not available'}\n\nThank you for shopping with DripYard!`);
    window.open(`mailto:${order.customer_email}?subject=${subject}&body=${body}`);
  }
}

function attachDeleteListeners() {
  document.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.removeEventListener('click', handleDeleteClick);
    btn.addEventListener('click', handleDeleteClick);
  });
}

function handleDeleteClick(e) {
  const orderId = e.currentTarget.getAttribute('data-order-id');
  showDeleteModal(orderId);
}

function downloadOrderPDF(order) {
  if (typeof window.jspdf === 'undefined') {
    console.error("jsPDF not loaded");
    alert("PDF library not loaded. Please refresh the page.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const items = Array.isArray(order.items) ? order.items : [];
  
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 45, 'F');
  
  try {
    const logoImg = 'images/logo.png';
    doc.addImage(logoImg, 'PNG', 15, 8, 25, 25, undefined, 'FAST');
  } catch (e) {
    console.log("Logo not found, using text only");
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DRIPYARD', 105, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Streetwear Inspired by the Streets', 105, 32, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER INVOICE', 20, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order #: ${order.id}`, 20, 70);
  doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 20, 77);
  doc.text(`Payment Status: ${order.payment_status || 'pending'}`, 20, 84);
  
  const statusColors = {
    'Order Placed': [108, 117, 125],
    'Order Confirmed': [0, 123, 255],
    'Processing': [255, 193, 7],
    'Shipped': [0, 123, 255],
    'Delivered': [40, 167, 69]
  };
  const statusColor = statusColors[order.status] || [108, 117, 125];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(150, 65, 45, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(order.status.toUpperCase(), 172.5, 72, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 95, 170, 40, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 25, 107);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name: ${order.customer_name || '—'}`, 25, 117);
  doc.text(`Email: ${order.customer_email || '—'}`, 25, 124);
  doc.text(`Phone: ${order.customer_phone || '—'}`, 120, 117);
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 145, 170, 40, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERY INFORMATION', 25, 157);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Method: ${order.delivery_method || '—'}`, 25, 167);
  
  const addressText = `Address: ${order.customer_address || '—'}, ${order.customer_mall || '—'}, ${order.customer_province || '—'}`;
  let yPos = 174;
  const wrappedLines = doc.splitTextToSize(addressText, 150);
  doc.text(wrappedLines, 25, yPos);
  yPos += (wrappedLines.length * 5);
  
  doc.text(`Tracking #: ${order.tracking_number || 'Not available'}`, 25, yPos + 5);
  
  yPos = 200;
  doc.setFillColor(15, 23, 42);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', 25, yPos + 5.5);
  doc.text('QTY', 130, yPos + 5.5);
  doc.text('PRICE', 155, yPos + 5.5);
  doc.text('TOTAL', 175, yPos + 5.5);
  
  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  items.forEach((item) => {
    if (yPos > 265) {
      doc.addPage();
      yPos = 20;
      doc.setFillColor(15, 23, 42);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ITEM', 25, yPos + 5.5);
      doc.text('QTY', 130, yPos + 5.5);
      doc.text('PRICE', 155, yPos + 5.5);
      doc.text('TOTAL', 175, yPos + 5.5);
      yPos += 8;
      doc.setTextColor(0, 0, 0);
    }
    
    const itemTotal = (item.qty || 1) * item.price;
    const itemName = (item.name || '').substring(0, 30);
    doc.text(itemName, 25, yPos + 3);
    doc.text(`${item.qty || 1}`, 132, yPos + 3);
    doc.text(`R${item.price}`, 155, yPos + 3);
    doc.text(`R${itemTotal}`, 175, yPos + 3);
    doc.setFontSize(7);
    doc.text(`Color: ${item.color || '—'} | Size: ${item.size || '—'}`, 25, yPos + 7);
    doc.setFontSize(8);
    yPos += 12;
  });
  
  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL: R${order.final_total}`, 160, yPos + 5);
  
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for shopping with DripYard!', 105, 275, { align: 'center' });
  doc.text('For any inquiries, contact: dipyard086@gmail.com', 105, 282, { align: 'center' });
  
  doc.save(`DripYard_Order_${order.id}.pdf`);
}

function attachStatusListeners() {
  document.querySelectorAll('.status-dropdown').forEach(dropdown => {
    dropdown.removeEventListener('change', handleStatusChange);
    dropdown.addEventListener('change', handleStatusChange);
  });
}

async function handleStatusChange(e) {
  const orderId = e.target.getAttribute('data-order-id');
  const newStatus = e.target.value;

  const { error } = await client
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    alert("❌ Failed to update status");
    console.error(error.message);
    return;
  }

  const order = orders.find(o => o.id == orderId);
  if (order) order.status = newStatus;

  const msgDiv = document.getElementById(`status-msg-${orderId}`);
  if (msgDiv) msgDiv.textContent = newStatus;

  alert("✅ Status updated successfully!");
}

function attachTrackingListeners() {
  document.querySelectorAll('.save-tracking-btn').forEach(button => {
    button.removeEventListener('click', handleTrackingSave);
    button.addEventListener('click', handleTrackingSave);
  });
}

async function handleTrackingSave(e) {
  const orderId = e.currentTarget.getAttribute('data-order-id');
  const input = document.querySelector(`.tracking-input[data-order-id="${orderId}"]`);
  const newTracking = input ? input.value.trim() : '';

  const { error } = await client
    .from('orders')
    .update({ tracking_number: newTracking })
    .eq('id', orderId);

  if (error) {
    alert("❌ Failed to update tracking number");
    console.error(error.message);
  } else {
    const order = orders.find(o => o.id == orderId);
    if (order) order.tracking_number = newTracking;

    const msgDiv = document.getElementById(`tracking-msg-${orderId}`);
    if (msgDiv) msgDiv.textContent = newTracking || 'No tracking number';

    alert("✅ Tracking number updated");
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadAdminNotes() {
  if (!notesInput) return;
  
  try {
    const { data, error } = await client
      .from('admin_notes')
      .select('notes')
      .eq('id', 'dashboard')
      .single();

    if (!error && data) {
      notesInput.value = data.notes || '';
      const displayDiv = document.getElementById('admin-notes-display');
      if (displayDiv && data.notes) {
        displayDiv.innerHTML = `<i class="fas fa-comment"></i> ${escapeHtml(data.notes)}`;
      }
    }
  } catch (err) {
    console.error("Error loading notes:", err);
  }
}

if (saveNotesBtn) {
  saveNotesBtn.addEventListener('click', async () => {
    const newNotes = notesInput ? notesInput.value.trim() : '';

    const { error } = await client
      .from('admin_notes')
      .upsert({ id: 'dashboard', notes: newNotes });

    if (error) {
      alert("❌ Failed to save notes");
      console.error(error.message);
    } else {
      alert("✅ Notes saved");
      const displayDiv = document.getElementById('admin-notes-display');
      if (displayDiv && newNotes) {
        displayDiv.innerHTML = `<i class="fas fa-comment"></i> ${escapeHtml(newNotes)}`;
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    const { error } = await client.auth.signOut();

    if (error) {
      alert("❌ Logout failed");
      console.error(error.message);
      return;
    }

    alert("✅ You've been logged out. Redirecting to store...");
    window.location.href = "store.html";
  });
}

const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (orderToDelete) {
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';
      
      await deleteOrder(orderToDelete);
      
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete Order';
      closeDeleteModal();
    }
  });
}

window.addEventListener('click', (e) => {
  const modal = document.getElementById('delete-modal');
  if (e.target === modal) {
    closeDeleteModal();
  }
});

function exportToCSV() {
  const rows = [
    ['Order ID', 'Customer', 'Email', 'Phone', 'Address', 'Mall', 'Province', 'Postal Code', 'Method', 'Payment Status', 'Status', 'Tracking #', 'Total', 'Placed']
  ];

  orders.forEach(order => {
    rows.push([
      order.id,
      order.customer_name || '',
      order.customer_email || '',
      order.customer_phone || '',
      order.customer_address || '',
      order.customer_mall || '',
      order.customer_province || '',
      order.customer_postal_code || '',
      order.delivery_method || '',
      order.payment_status || '',
      order.status || '',
      order.tracking_number || '',
      order.final_total || '',
      new Date(order.created_at).toLocaleString()
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "dripyard_orders.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

if (statusFilter) statusFilter.addEventListener('change', renderTable);
if (searchBar) searchBar.addEventListener('input', renderTable);
if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

// ========== ADDED NEWSLETTER SUBSCRIBERS FUNCTIONALITY ==========

// Load subscriber count
async function loadSubscriberCount() {
  const countEl = document.getElementById('subscriber-count'); 
  if (!countEl) return;
  
  const { count, error } = await client.from('newsletter_subscribers').select('*', { count: 'exact', head: true });
  if (error) {
    console.error("Error loading subscriber count:", error);
    return;
  }
  if (count !== null) {
    countEl.innerHTML = `<strong>${count}</strong> total subscriber${count !== 1 ? 's' : ''}`;
  }
}

// Open subscribers modal
async function openSubscribersModal() {
  const modal = document.getElementById('subscribers-modal'); 
  const list = document.getElementById('subscribers-list');
  if (!modal || !list) return;
  
  modal.style.display = 'flex'; 
  list.innerHTML = '<p style="text-align:center;color:#94a3b8;">Loading...</p>';
  
  const { data: subscribers, error } = await client.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false });
  
  if (error) {
    console.error("Error loading subscribers:", error);
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading subscribers.</p></div>';
    return;
  }
  
  if (!subscribers || !subscribers.length) { 
    list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No subscribers yet.</p></div>'; 
    return; 
  }
  
  list.innerHTML = subscribers.map(sub => `
    <div class="subscriber-row">
      <div>
        <div class="subscriber-email">📧 ${escapeHtml(sub.email)}</div>
        <div class="subscriber-date">Subscribed: ${new Date(sub.subscribed_at).toLocaleString()}</div>
      </div>
      <button class="subscriber-delete" onclick="deleteSubscriber('${sub.id}')">
        <i class="fas fa-trash"></i> Remove
      </button>
    </div>
  `).join('');
}

// Close subscribers modal
function closeSubscribersModal() { 
  const m = document.getElementById('subscribers-modal'); 
  if (m) m.style.display = 'none'; 
}

// Delete single subscriber
async function deleteSubscriber(id) { 
  if (!confirm('Remove this subscriber?')) return; 
  const { error } = await client.from('newsletter_subscribers').delete().eq('id', id); 
  if (error) {
    alert("❌ Failed to delete subscriber");
    return;
  }
  openSubscribersModal(); 
  loadSubscriberCount(); 
}

// Export subscribers to CSV
function exportSubscribersCSV() {
  client.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }).then(({ data, error }) => {
    if (error) {
      alert('Error loading subscribers.');
      return;
    }
    if (!data.length) { 
      alert('No subscribers.'); 
      return; 
    }
    const rows = [['Email', 'Subscribed Date']];
    data.forEach(s => rows.push([s.email, new Date(s.subscribed_at).toLocaleString()]));
    const csv = "data:text/csv;charset=utf-8," + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); 
    a.href = encodeURI(csv); 
    a.download = "dripyard_subscribers.csv"; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
  });
}

// ========== EMAIL TYPE SELECTION & PREVIEW ==========

var currentEmailType = 'new-drop';

function selectEmailType(type) {
  currentEmailType = type;
  
  // Update active button - find which button was clicked
  const buttons = document.querySelectorAll('.email-type-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  // Add active class to clicked button
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    // Fallback: find button with matching data-type
    buttons.forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      }
    });
  }
  
  // Set content based on type
  var subject = '', heading = '', body = '', btnText = 'SHOP NOW';
  
  if (type === 'new-drop') {
    subject = '🆕 New Drop Just Landed!';
    heading = 'NEW DROP ALERT';
    body = 'We just dropped fresh styles that you need to see. Limited stock available - get yours before they sell out!';
    btnText = 'SHOP THE DROP';
  } else if (type === 'sale') {
    subject = '🔥 Sale Alert - Limited Time!';
    heading = 'SALE IS LIVE';
    body = 'For a limited time, save big on your favorite streetwear. Don\'t miss out on these deals!';
    btnText = 'SHOP SALE';
  } else if (type === 'special') {
    subject = '⭐ Special Offer Just For You!';
    heading = 'EXCLUSIVE OFFER';
    body = 'As a DripYard subscriber, you get exclusive access to this special deal. Use code SUBSCRIBER at checkout.';
    btnText = 'CLAIM OFFER';
  }
  
  const subjectInput = document.getElementById('email-subject');
  const headingInput = document.getElementById('email-heading');
  const bodyInput = document.getElementById('email-body');
  const btnTextInput = document.getElementById('email-button-text');
  
  if (subjectInput) subjectInput.value = subject;
  if (headingInput) headingInput.value = heading;
  if (bodyInput) bodyInput.value = body;
  if (btnTextInput) btnTextInput.value = btnText;
  
  updateEmailPreview();
}

// Update email preview
function updateEmailPreview() {
  var type = currentEmailType;
  var heading = document.getElementById('email-heading')?.value || 'HEADING';
  var body = document.getElementById('email-body')?.value || 'Your message here...';
  var btnText = document.getElementById('email-button-text')?.value || 'SHOP NOW';
  var btnLink = document.getElementById('email-button-link')?.value || '#';
  
  var preview = '<div style="font-family:Arial,sans-serif;max-width:320px;margin:0 auto;">';
  
  // New Drop style
  if (type === 'new-drop') {
    preview += '<div style="background:#0f172a;padding:20px;text-align:center;">';
    preview += '<p style="color:#ccc;font-size:10px;letter-spacing:2px;margin:0;">DRIPYARD</p>';
    preview += '<h2 style="color:white;margin:10px 0;font-size:20px;">' + escapeHtml(heading) + '</h2>';
    preview += '<div style="width:200px;height:120px;background:#1e293b;margin:10px auto;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:30px;">👕</div>';
    preview += '<p style="color:#ccc;font-size:12px;">' + escapeHtml(body) + '</p>';
    preview += '<a href="#" style="display:inline-block;padding:10px 25px;background:white;color:#0f172a;text-decoration:none;border-radius:25px;font-weight:bold;font-size:12px;margin-top:10px;">' + escapeHtml(btnText) + '</a>';
    preview += '</div>';
  }
  
  // Sale style
  else if (type === 'sale') {
    preview += '<div style="background:#fff5f5;padding:20px;text-align:center;border:2px solid #ef4444;">';
    preview += '<span style="background:#ef4444;color:white;padding:3px 10px;border-radius:10px;font-size:9px;font-weight:bold;">🔥 LIMITED TIME</span>';
    preview += '<h2 style="color:#ef4444;margin:10px 0;font-size:22px;">' + escapeHtml(heading) + '</h2>';
    preview += '<div style="font-size:40px;margin:10px 0;">🏷️</div>';
    preview += '<p style="color:#444;font-size:12px;">' + escapeHtml(body) + '</p>';
    preview += '<a href="#" style="display:inline-block;padding:10px 25px;background:#ef4444;color:white;text-decoration:none;border-radius:25px;font-weight:bold;font-size:12px;margin-top:10px;">' + escapeHtml(btnText) + '</a>';
    preview += '</div>';
  }
  
  // Special style
  else if (type === 'special') {
    preview += '<div style="background:#fffbeb;padding:20px;text-align:center;border:2px solid #f59e0b;border-radius:12px;">';
    preview += '<div style="font-size:40px;margin-bottom:5px;">⭐</div>';
    preview += '<span style="background:#f59e0b;color:white;padding:3px 10px;border-radius:10px;font-size:9px;font-weight:bold;">⭐ EXCLUSIVE</span>';
    preview += '<h2 style="color:#f59e0b;margin:10px 0;font-size:20px;">' + escapeHtml(heading) + '</h2>';
    preview += '<p style="color:#444;font-size:12px;">' + escapeHtml(body) + '</p>';
    preview += '<div style="background:white;display:inline-block;padding:8px 15px;border-radius:8px;border:2px dashed #f59e0b;margin:10px 0;">';
    preview += '<span style="font-size:10px;color:#666;">USE CODE: </span><span style="font-size:14px;font-weight:bold;color:#f59e0b;">SUBSCRIBER</span>';
    preview += '</div><br>';
    preview += '<a href="#" style="display:inline-block;padding:10px 25px;background:#f59e0b;color:white;text-decoration:none;border-radius:25px;font-weight:bold;font-size:12px;">' + escapeHtml(btnText) + '</a>';
    preview += '</div>';
  }
  
  preview += '</div>';
  
  const previewContainer = document.getElementById('email-preview-content');
  if (previewContainer) previewContainer.innerHTML = preview;
}

// ========== SEND BULK EMAIL VIA EDGE FUNCTION ==========

async function sendBulkEmail() {
  const subject = document.getElementById('email-subject')?.value.trim();
  const body = document.getElementById('email-body')?.value.trim();
  const heading = document.getElementById('email-heading')?.value.trim();
  const btnText = document.getElementById('email-button-text')?.value.trim();
  const btnLink = document.getElementById('email-button-link')?.value.trim();
  const statusEl = document.getElementById('bulk-email-status');
  const sendBtn = document.getElementById('send-bulk-email-btn');
  
  if (!subject || !body) { 
    if (statusEl) {
      statusEl.textContent = 'Please enter subject and message.'; 
      statusEl.style.color = '#ef4444';
    }
    return; 
  }
  if (!confirm('Send this email to ALL subscribers?')) return;
  
  if (sendBtn) {
    sendBtn.disabled = true; 
    sendBtn.textContent = 'Sending...';
  }
  if (statusEl) {
    statusEl.textContent = 'Fetching subscribers...'; 
    statusEl.style.color = '#64748b';
  }
  
  const { data: subscribers, error } = await client.from('newsletter_subscribers').select('email');
  
  if (error || !subscribers || !subscribers.length) { 
    if (statusEl) statusEl.textContent = 'No subscribers found.'; 
    if (sendBtn) {
      sendBtn.disabled = false; 
      sendBtn.textContent = 'Send to All Subscribers';
    }
    return; 
  }
  
  var sent = 0; 
  var failed = 0;
  
  for (var i = 0; i < subscribers.length; i++) {
    if (statusEl) statusEl.textContent = 'Sending... ' + (i + 1) + '/' + subscribers.length;
    try {
      var response = await fetch('https://kidfloycujnakuovfeqg.supabase.co/functions/v1/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: subscribers[i].email,
          subject: subject,
          heading: heading,
          message: body,
          buttonText: btnText,
          buttonLink: btnLink || 'https://dripyard.co.za/store.html',
          type: currentEmailType
        })
      });
      var result = await response.json();
      if (result.Messages && result.Messages[0].Status === 'success') { 
        sent++; 
      } else { 
        failed++; 
      }
      await new Promise(function(r) { setTimeout(r, 500); });
    } catch (err) { 
      failed++; 
    }
  }
  if (statusEl) {
    statusEl.textContent = '✅ Sent: ' + sent + (failed > 0 ? ' (' + failed + ' failed)' : '');
    statusEl.style.color = '#10b981';
  }
  if (sendBtn) {
    sendBtn.disabled = false; 
    sendBtn.textContent = 'Send to All Subscribers';
  }
  alert(`Email campaign complete! Sent: ${sent}, Failed: ${failed}`);
}

// ========== ATTACH NEWSLETTER EVENT LISTENERS ==========

// Subscribers modal buttons
document.getElementById('view-subscribers-btn')?.addEventListener('click', openSubscribersModal);
document.getElementById('export-subscribers-btn')?.addEventListener('click', exportSubscribersCSV);
document.getElementById('send-bulk-email-btn')?.addEventListener('click', sendBulkEmail);

// Close modal when clicking outside
window.addEventListener('click', e => { 
  if (e.target === document.getElementById('subscribers-modal')) closeSubscribersModal(); 
});

// Email preview update listeners
const headingEl = document.getElementById('email-heading');
const bodyEl = document.getElementById('email-body');
const btnTextEl = document.getElementById('email-button-text');

if (headingEl) headingEl.addEventListener('input', updateEmailPreview);
if (bodyEl) bodyEl.addEventListener('input', updateEmailPreview);
if (btnTextEl) btnTextEl.addEventListener('input', updateEmailPreview);

// Make functions globally available for HTML onclick attributes
window.deleteSubscriber = deleteSubscriber;
window.closeSubscribersModal = closeSubscribersModal;
window.selectEmailType = selectEmailType;

// ========== INITIALIZATION ==========

async function init() {
  const isAuthed = await checkAdminAuth();
  if (isAuthed) {
    await fetchOrders();
    loadSubscriberCount();
  }
}

init();