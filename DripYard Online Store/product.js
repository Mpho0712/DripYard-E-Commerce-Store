const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const cartCount = document.getElementById('cart-count');
const greeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const profileIcon = document.getElementById('profile-icon');
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

let userId = null;
let allImages = [];
let selectedRating = 0, reviewPhotoFile = null, allReviews = [], showingAllReviews = false;
let selectedColor = null, selectedSize = null;

function escapeHtml(t) { if(!t)return''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
function getStarRating(r) { let s=''; for(let i=1;i<=5;i++) s+=i<=r?'<i class="fas fa-star"></i>':'<i class="far fa-star"></i>'; return s; }
function timeAgo(d) { const s=Math.floor((new Date()-new Date(d))/1000); if(s<60)return'Just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; if(s<604800)return Math.floor(s/86400)+'d ago'; return new Date(d).toLocaleDateString(); }

// ===== LOAD PRODUCT =====
async function loadProduct() {
  if (!productId) { document.getElementById('product-name').textContent = 'No product specified'; return; }
  
  const { data: p, error } = await client.from('products').select('*').eq('id', productId).single();
  if (error || !p) { document.getElementById('product-name').textContent = 'Product not found'; return; }
  
  // Build image list
  allImages = [];
  if (p.image_url?.trim()) allImages.push(p.image_url);
  if (p.extra_images && Array.isArray(p.extra_images)) {
    p.extra_images.forEach(i => { if (i?.trim() && !allImages.includes(i)) allImages.push(i); });
  }
  if (!allImages.length) allImages.push('https://via.placeholder.com/500?text=No+Image');
  
  document.getElementById('main-img').src = allImages[0];
  document.getElementById('product-name').textContent = p.name;
  document.getElementById('product-description').textContent = p.description || 'No description available.';
  document.title = p.name + ' - DripYard';
  
  const os = p.is_on_sale || false;
  const oos = p.stock_quantity === 0 || p.is_out_of_stock === true;
  
  // Price
  if (os && p.sale_price) {
    const saved = p.price - p.sale_price;
    document.getElementById('product-price').innerHTML = 
      `<span style="font-size:1rem;color:#94a3b8;text-decoration:line-through;">R${p.price}</span>
       <span style="font-size:1.3rem;font-weight:700;color: #0f172a;">R${p.sale_price}</span>
       <span style="background:#ef4444;color:white;padding:3px 8px;border-radius:15px;font-size:0.7rem;font-weight:600;">-${Math.round((saved/p.price)*100)}%</span>`;
  } else {
    document.getElementById('product-price').innerHTML = `<span style="font-size:1.3rem;font-weight:700;color: #0f172a;">R${p.price}</span>`;
  }
  
  // Stock
  const stockEl = document.getElementById('stock-status');
  if (oos) {
    stockEl.innerHTML = '<span style="display:inline-block;background:#6b7280;color:white;padding:4px 12px;border-radius:30px;font-size:0.75rem;font-weight:bold;margin-bottom:0.5rem;">OUT OF STOCK</span>';
  } else {
    const c = p.stock_quantity || 0;
    stockEl.innerHTML = c < 10 && c > 0 ? 
      `<span style="display:inline-block;background:#f59e0b;color:white;padding:4px 12px;border-radius:30px;font-size:0.75rem;font-weight:bold;margin-bottom:0.5rem;">Only ${c} left!</span>` :
      '<span style="display:inline-block;background:#10b981;color:white;padding:4px 12px;border-radius:30px;font-size:0.75rem;font-weight:bold;margin-bottom:0.5rem;">In Stock</span>';
  }
  
  // Colors
  const colors = p.available_colors || [];
  const colorImages = {};
  colors.forEach((c, i) => { colorImages[c] = p.color_images?.[c] || (p.extra_images && p.extra_images[i]) || p.image_url; });
  
  document.getElementById('product-colors').innerHTML = colors.map(c => 
    `<span class="color-circle" style="background-color:${c}" data-color="${c}" data-image="${colorImages[c]}" onclick="selectProductColor(this,'${c}')"></span>`
  ).join('');
  
  // Sizes
  const sizes = p.available_sizes || [];
  const sizeEl = document.getElementById('product-sizes');
  sizeEl.innerHTML = '<option disabled selected>Select size</option>' + sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  sizeEl.disabled = oos;
  sizeEl.addEventListener('change', function() { selectedSize = this.value; checkCartReady(); });
  
  // Add to cart button
  const cartBtn = document.getElementById('add-to-cart-btn');
  cartBtn.disabled = oos;
  cartBtn.textContent = oos ? 'Out of Stock' : 'Add to Cart';
  cartBtn.addEventListener('click', () => addToCart(p));
  
  // Thumbnails
  document.getElementById('thumbnails').innerHTML = allImages.map((img, i) => 
    `<img src="${img}" class="product-thumb ${i===0?'active':''}" onclick="switchImage(${i})" onerror="this.src='https://via.placeholder.com/55?text=DY'">`
  ).join('');
  
  // Arrows
  const pa = document.querySelector('.product-nav-arrow.prev'), na = document.querySelector('.product-nav-arrow.next');
  if (allImages.length <= 1) { if(pa)pa.style.display='none'; if(na)na.style.display='none'; }
  
  if (userId) {
    const { data: profile } = await client.from('profiles').select('full_name').eq('id', userId).single();
    if (profile?.full_name) document.getElementById('review-name-input').value = profile.full_name;
  }
  
  await loadReviews(productId);
  setupReviewSystem(productId);
  if (p.category_id) loadRecommendedProducts(p.category_id, productId);
}

// ===== COLOR SELECTION =====
function selectProductColor(el, color) {
  selectedColor = color;
  document.querySelectorAll('#product-colors .color-circle').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  
  // Change main image to color image
  const colorImage = el.dataset.image;
  if (colorImage) document.getElementById('main-img').src = colorImage;
  
  checkCartReady();
}

// ===== CHECK IF CART IS READY =====
function checkCartReady() {
  const btn = document.getElementById('add-to-cart-btn');
  const oos = document.getElementById('product-sizes').disabled;
  if (oos) return;
  btn.disabled = !(selectedColor && selectedSize);
}

// ===== IMAGE NAVIGATION =====
let currentImageIndex = 0;
function switchImage(i) {
  currentImageIndex = i;
  document.getElementById('main-img').src = allImages[i];
  document.querySelectorAll('.product-thumb').forEach((t, j) => { t.classList.toggle('active', j === i); t.style.borderColor = j === i ? ' #0f172a' : 'transparent'; });
}
function navigateImage(d) {
  if (!allImages.length) return;
  currentImageIndex = (currentImageIndex + d + allImages.length) % allImages.length;
  document.getElementById('main-img').src = allImages[currentImageIndex];
  document.querySelectorAll('.product-thumb').forEach((t, j) => { t.classList.toggle('active', j === currentImageIndex); t.style.borderColor = j === currentImageIndex ? ' #0f172a' : 'transparent'; });
}

// ===== ADD TO CART =====
async function addToCart(p) {
 if (!selectedColor || !selectedSize) { 
    // silently return
    return; 
}
  
  const fp = (p.is_on_sale && p.sale_price) ? p.sale_price : p.price;
  const img = document.getElementById('main-img').src;
  
  if (!userId) {
    let gc = JSON.parse(localStorage.getItem('guestCart') || '[]');
    const ei = gc.findIndex(i => i.productId === productId && i.color === selectedColor && i.size === selectedSize);
    if (ei !== -1) gc[ei].quantity++;
    else gc.push({ productId, name: p.name, price: fp, color: selectedColor, size: selectedSize, quantity: 1, image: img });
    localStorage.setItem('guestCart', JSON.stringify(gc));
    alert(p.name + ' added to cart!');
    updateGuestCartCount();
    return;
  }
  
  try {
    const { data: ex } = await client.from('cart').select('id,quantity').eq('user_id', userId).eq('product_id', productId).eq('color', selectedColor).eq('size', selectedSize);
    if (ex?.length) {
      await client.from('cart').update({ quantity: ex[0].quantity + 1 }).eq('id', ex[0].id);
    } else {
      await client.from('cart').insert({ user_id: userId, product_id: productId, color: selectedColor, size: selectedSize, quantity: 1 });
    }
    alert(p.name + ' added to cart!');
    await updateCartCount(userId);
  } catch (err) { alert('Error adding to cart.'); }
}

// ===== REVIEWS =====
async function loadReviews(pid) {
  const rc = document.getElementById('reviews-container'); if (!rc) return;
  rc.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.8rem;">Loading reviews...</p>';
  const { data: rv, error } = await client.from('reviews').select('*').eq('product_id', pid).order('created_at', { ascending: false });
  if (error) { rc.innerHTML = '<p class="no-reviews">Could not load reviews.</p>'; return; }
  allReviews = rv || []; renderReviews();
}

function renderReviews() {
  const rc = document.getElementById('reviews-container'), vm = document.getElementById('view-more-btn');
  if (!rc) return;
  if (!allReviews.length) { rc.innerHTML = '<p class="no-reviews" style="text-align:center;color:#94a3b8;padding:1rem;">No reviews yet.</p>'; if(vm)vm.style.display='none'; updateAvgRating(); return; }
  const rts = showingAllReviews ? allReviews : allReviews.slice(0, 3);
  rc.innerHTML = rts.map(r => `<div class="review-card"><div class="review-header"><span class="review-author">${escapeHtml(r.user_name)}</span><span class="review-date">${timeAgo(r.created_at)}</span></div><div class="review-stars">${getStarRating(r.rating)}</div><p class="review-text">${escapeHtml(r.review_text)}</p>${r.review_photo?`<img src="${r.review_photo}" style="width:100px;height:100px;border-radius:10px;object-fit:cover;margin-top:0.5rem;cursor:pointer;border:1px solid #e2e8f0;display:block;" onerror="this.style.display='none'">`:''}${r.is_verified?'<span class="review-verified"><i class="fas fa-check-circle"></i> Verified Purchase</span>':''}</div>`).join('');
  if (allReviews.length > 3 && !showingAllReviews) { if(vm){vm.style.display='block';vm.textContent=`View All ${allReviews.length} Reviews`;} }
  else if (showingAllReviews) { if(vm){vm.style.display='block';vm.textContent='Show Less';} }
  else { if(vm)vm.style.display='none'; }
  updateAvgRating();
}

function updateAvgRating() {
  const ar = document.getElementById('avg-rating'); if (!ar) return;
  if (!allReviews.length) { ar.innerHTML = '<span style="font-size:0.8rem;color:#94a3b8;">No ratings yet</span>'; return; }
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  ar.innerHTML = `<span class="avg-stars">${getStarRating(Math.round(avg))}</span><span class="avg-text">${avg.toFixed(1)} out of 5 (${allReviews.length})</span>`;
}

function handlePhotoSelect(e) {
  const f = e.target.files[0]; if (!f) return; if (f.size > 5*1024*1024) { alert('Photo must be under 5MB'); return; }
  reviewPhotoFile = f;
  const r = new FileReader(); r.onload = function(ev) { document.getElementById('review-photo-preview').src = ev.target.result; document.getElementById('review-photo-preview').style.display = 'block'; };
  r.readAsDataURL(f);
}

function setupReviewSystem(pid) {
  selectedRating = 0;
  const stars = document.querySelectorAll('.star-select');
  stars.forEach(s => { s.textContent = '☆'; s.style.color = '#d1d5db'; });
  document.getElementById('review-text-input').value = '';
  document.getElementById('review-photo-preview').style.display = 'none';
  reviewPhotoFile = null;
  
  stars.forEach(star => { star.onclick = function() { selectedRating = parseInt(this.dataset.rating); stars.forEach((s, i) => { s.textContent = i < selectedRating ? '★' : '☆'; s.style.color = i < selectedRating ? '#f59e0b' : '#d1d5db'; }); }; });
  
  const vm = document.getElementById('view-more-btn'); if (vm) vm.onclick = () => { showingAllReviews = !showingAllReviews; renderReviews(); };
  
  const pi = document.getElementById('review-photo-input'); if (pi) { pi.removeEventListener('change', handlePhotoSelect); pi.addEventListener('change', handlePhotoSelect); }
  
  const sb = document.getElementById('submit-review-btn');
  if (sb) {
    const newSb = sb.cloneNode(true); sb.parentNode.replaceChild(newSb, sb);
    newSb.addEventListener('click', async function() {
      const name = document.getElementById('review-name-input').value.trim();
      const text = document.getElementById('review-text-input').value.trim();
      const err = document.getElementById('review-error'); err.style.display = 'none';
      if (!name) { err.textContent = 'Please enter your name.'; err.style.display = 'block'; return; }
      if (!selectedRating) { err.textContent = 'Please select a rating.'; err.style.display = 'block'; return; }
      if (!text) { err.textContent = 'Please write a review.'; err.style.display = 'block'; return; }
      this.disabled = true; this.textContent = 'Submitting...';
      let photoUrl = null;
      if (reviewPhotoFile) {
        try {
          const fn = `review-${Date.now()}-${reviewPhotoFile.name.replace(/[^a-zA-Z0-9.]/g,'-')}`;
          const { error: ue } = await client.storage.from('review-photos').upload(fn, reviewPhotoFile, { cacheControl: '3600', upsert: false });
          if (!ue) { const { data: pd } = client.storage.from('review-photos').getPublicUrl(fn); photoUrl = pd.publicUrl; }
        } catch (ex) {}
      }
      const { error: ie } = await client.from('reviews').insert({ product_id: pid, user_id: userId || null, user_name: name, rating: selectedRating, review_text: text, review_photo: photoUrl, is_verified: !!userId });
      if (ie) { err.textContent = 'Failed to submit.'; err.style.display = 'block'; this.disabled = false; this.textContent = 'Submit Review'; return; }
      document.getElementById('review-text-input').value = '';
      selectedRating = 0; stars.forEach(s => { s.textContent = '☆'; s.style.color = '#d1d5db'; });
      document.getElementById('review-photo-preview').style.display = 'none';
      reviewPhotoFile = null; this.disabled = false; this.textContent = 'Submit Review';
      await loadReviews(pid);
    });
  }
}

// ===== RECOMMENDED =====
async function loadRecommendedProducts(catId, currId) {
  const grid = document.getElementById('recommended-grid'); if (!grid) return;
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;">Loading...</p>';
  const { data: recs, error } = await client.from('products').select('*').eq('category_id', catId).neq('id', currId).limit(4);
  if (error || !recs || !recs.length) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;">No similar products</p>'; return; }
  grid.innerHTML = recs.map(p => {
    const img = p.image_url || (p.extra_images && p.extra_images[0]) || 'https://via.placeholder.com/200';
    const fp = (p.is_on_sale && p.sale_price) ? p.sale_price : p.price;
    return `<div class="rec-card" onclick="window.location.href='product.html?id=${p.id}'"><img src="${img}" alt="${escapeHtml(p.name)}" onerror="this.src='https://via.placeholder.com/200?text=DY'"><div class="rec-info"><div class="rec-name">${escapeHtml(p.name)}</div><div class="rec-price">R${fp}</div></div></div>`;
  }).join('');
}

// ===== SIDEBAR =====
function toggleSidebar() { document.getElementById('sidebar')?.classList.add('active'); document.getElementById('overlay')?.classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('active'); document.getElementById('overlay')?.classList.remove('active'); }

// ===== SESSION =====
async function checkUserSession() {
  const { data: sd } = await client.auth.getSession(); userId = sd?.session?.user?.id;
  if (userId) {
    const { data: p } = await client.from('profiles').select('full_name').eq('id', userId).single();
    greeting.textContent = p?.full_name ? `Welcome, ${p.full_name}!` : 'Welcome!';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (profileIcon) profileIcon.href = 'profile.html';
    updateCartCount(userId);
  } else {
    greeting.textContent = 'Welcome, Guest!';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (profileIcon) profileIcon.href = 'login.html';
    updateGuestCartCount();
  }
}
if (logoutBtn) logoutBtn.addEventListener('click', async () => { await client.auth.signOut(); window.location.reload(); });

async function updateCartCount(uid) { const { data } = await client.from('cart').select('quantity').eq('user_id', uid); cartCount.textContent = data?.reduce((s, i) => s + (i.quantity || 0), 0) || 0; }
function updateGuestCartCount() { cartCount.textContent = JSON.parse(localStorage.getItem('guestCart') || '[]').reduce((s, i) => s + (i.quantity || 0), 0); }

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

checkUserSession();
loadProduct();