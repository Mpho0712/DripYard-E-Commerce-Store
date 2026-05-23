const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const productList = document.getElementById('product-list');
const cartCount = document.getElementById('cart-count');
const cartIcon = document.getElementById('cart-icon');
const cartPopup = document.getElementById('cart-popup');
const viewCartBtn = document.getElementById('view-cart-btn');
const continueShoppingBtn = document.getElementById('continue-shopping-btn');
const greeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const profileIcon = document.getElementById('profile-icon');

let userId = null, allProducts = [], filteredProducts = [], currentPage = 1, productsPerPage = 10, totalPages = 1;
let searchQuery = '', showInStockOnly = false;

function escapeHtml(t) { if(!t)return''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

// ===== FILTER BAR =====
function createFilterBar() {
  const fc=document.createElement('div'); fc.className='filter-bar'; fc.id='filter-bar';
  fc.innerHTML=`<div class="search-box"><i class="fas fa-search"></i><input type="text" id="search-input" placeholder="Search products..." /></div><div class="filter-group stock-filter"><label><input type="checkbox" id="in-stock-only" /> In Stock Only</label></div><button id="clear-filters" class="clear-filters-btn">Clear</button>`;
  productList.parentNode.insertBefore(fc,productList);
  document.getElementById('search-input').addEventListener('input',e=>{searchQuery=e.target.value.toLowerCase();applyFilters();});
  document.getElementById('in-stock-only').addEventListener('change',e=>{showInStockOnly=e.target.checked;applyFilters();});
  document.getElementById('clear-filters').addEventListener('click',()=>{searchQuery='';showInStockOnly=false;document.getElementById('search-input').value='';document.getElementById('in-stock-only').checked=false;applyFilters();});
}
function applyFilters() {
  let r=[...allProducts];
  if(searchQuery) r=r.filter(p=>p.name.toLowerCase().includes(searchQuery)||(p.description&&p.description.toLowerCase().includes(searchQuery)));
  if(showInStockOnly) r=r.filter(p=>p.stock_quantity>0&&!p.is_out_of_stock);
  filteredProducts=r; totalPages=Math.ceil(r.length/productsPerPage); currentPage=1; displayFilteredProducts(); createPagination(); showResultsCount(r.length,allProducts.length);
}
function displayFilteredProducts() { const si=(currentPage-1)*productsPerPage; renderProducts(filteredProducts.slice(si,si+productsPerPage)); }
function showResultsCount(fc,tc) {
  let cc=document.getElementById('results-count');
  if(!cc){cc=document.createElement('div');cc.id='results-count';cc.className='results-count';document.getElementById('filter-bar').insertAdjacentElement('afterend',cc);}
  cc.innerHTML=fc!==tc?`Showing ${fc} of ${tc} products`:`Showing ${tc} products`; cc.style.display='block';
}

// ===== PAGINATION =====
function getProductsPerPage() { return 10; } // Always show 10 products per page

function createPagination() {
  let pc=document.getElementById('pagination-container');
  if(!pc){pc=document.createElement('div');pc.id='pagination-container';pc.className='pagination-container';productList.parentNode.insertBefore(pc,productList.nextSibling);}
  if(totalPages<=1){pc.style.display='none';return;} pc.style.display='flex'; pc.innerHTML='';
  
  const pb=document.createElement('button'); pb.className=`page-btn ${currentPage===1?'disabled':''}`; pb.innerHTML='<i class="fas fa-chevron-left"></i>'; pb.onclick=()=>goToPage(currentPage-1); if(currentPage===1)pb.disabled=true; pc.appendChild(pb);
  
  // Show ALL page numbers for up to 10 pages
  if(totalPages <= 10) {
    for(let i=1;i<=totalPages;i++){
      const b=document.createElement('button');
      b.className=`page-btn ${currentPage===i?'active':''}`;
      b.textContent=i;
      b.onclick=()=>goToPage(i);
      pc.appendChild(b);
    }
  } else {
    // Show first, dots, middle, dots, last
    pc.appendChild(createPageBtn(1));
    if(currentPage > 3) { const d=document.createElement('span'); d.className='page-dots'; d.textContent='...'; pc.appendChild(d); }
    
    let start = Math.max(2, currentPage-1);
    let end = Math.min(totalPages-1, currentPage+1);
    for(let i=start;i<=end;i++) pc.appendChild(createPageBtn(i));
    
    if(currentPage < totalPages-2) { const d=document.createElement('span'); d.className='page-dots'; d.textContent='...'; pc.appendChild(d); }
    pc.appendChild(createPageBtn(totalPages));
  }
  
  const nb=document.createElement('button'); nb.className=`page-btn ${currentPage===totalPages?'disabled':''}`; nb.innerHTML='<i class="fas fa-chevron-right"></i>'; nb.onclick=()=>goToPage(currentPage+1); if(currentPage===totalPages)nb.disabled=true; pc.appendChild(nb);
}

function createPageBtn(num) {
  const b=document.createElement('button');
  b.className=`page-btn ${currentPage===num?'active':''}`;
  b.textContent=num;
  b.onclick=()=>goToPage(num);
  return b;
}

function goToPage(p){if(p<1||p>totalPages||p===currentPage)return;currentPage=p;displayFilteredProducts();createPagination();productList.scrollIntoView({behavior:'smooth',block:'start'});}
function updateProductsPerPage(){const np=getProductsPerPage();if(np!==productsPerPage){productsPerPage=np;totalPages=Math.ceil(filteredProducts.length/productsPerPage);currentPage=1;displayFilteredProducts();createPagination();}}

// ===== PRICE FORMAT =====
function formatPrice(pr,os,sp){if(os&&sp){const p=Math.round(((pr-sp)/pr)*100);return`<span class="original-price">R${pr}</span><span class="sale-price">R${sp}</span><span class="sale-badge">-${p}%</span>`;}return`<span class="product-price">R${pr}</span>`;}

// ===== RENDER PRODUCTS (with zoom on hover) =====
function renderProducts(products){productList.innerHTML='';if(!products||!products.length){productList.innerHTML='<p style="color:gray;text-align:center;padding:2rem;">No products found.</p>';return;}products.forEach(p=>{const colors=p.available_colors||[],os=p.is_on_sale||false,oos=p.stock_quantity===0||p.is_out_of_stock===true;const ci={};colors.forEach((c,i)=>{ci[c]=p.color_images?.[c]||(p.extra_images&&p.extra_images[i])||p.image_url;});const imgs=p.extra_images?.length?p.extra_images:[p.image_url];const div=document.createElement('div');div.className='product';if(os)div.classList.add('on-sale');if(oos)div.classList.add('out-of-stock');Object.assign(div.dataset,{productId:p.id,productName:p.name,originalPrice:p.price,salePrice:p.sale_price||p.price,isOnSale:os,isOutOfStock:oos,colorImages:JSON.stringify(ci)});div.innerHTML=`<div class="carousel" data-images='${JSON.stringify(imgs)}'><span class="arrow left" onclick="event.stopPropagation();prevImage(this)">&#10094;</span><img class="carousel-image zoom-img" src="${imgs[0]}" data-index="0" onclick="event.stopPropagation();window.location.href='product.html?id=${p.id}'"><span class="arrow right" onclick="event.stopPropagation();nextImage(this)">&#10095;</span>${os?'<div class="sale-flag">SALE!</div>':''}${oos?'<div class="out-of-stock-flag">OUT OF STOCK</div>':''}</div><h3 onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer;">${escapeHtml(p.name)}</h3><div class="product-description"><span class="short-text">${(p.description||'No description').slice(0,20)}...</span><span class="read-more" onclick="event.stopPropagation();toggleDescription(this)">Read More</span><span class="full-text" style="display:none;">${escapeHtml(p.description||'No description')}<span class="read-less" onclick="event.stopPropagation();toggleDescription(this)" style="display:none;"> Read Less</span></span></div><div class="price-container">${formatPrice(p.price,os,p.sale_price)}</div><div class="color-options">${colors.map(c=>`<span class="color-circle" style="background-color:${c}" data-color="${c}" data-image="${ci[c]}" onclick="event.stopPropagation();selectColor(this,'${c}')"></span>`).join('')}</div>`;productList.appendChild(div);});}

// ===== LOAD PRODUCTS =====
async function loadProducts(){const{data,error}=await client.from('products').select('*');if(error){productList.innerHTML='<p style="color:red;">Failed to load products.</p>';return;}if(!data?.length){productList.innerHTML='<p style="color:gray;">No products available.</p>';return;}allProducts=data;filteredProducts=[...allProducts];productsPerPage=getProductsPerPage();totalPages=Math.ceil(filteredProducts.length/productsPerPage);currentPage=1;createFilterBar();displayFilteredProducts();createPagination();showResultsCount(filteredProducts.length,allProducts.length);await checkUserSession();}

// ===== USER SESSION =====
async function checkUserSession(){const{data:sd}=await client.auth.getSession();userId=sd?.session?.user?.id;if(userId){const{data:p}=await client.from('profiles').select('full_name').eq('id',userId).single();greeting.textContent=p?.full_name?`Welcome, ${p.full_name}!`:'Welcome, User!';logoutBtn.style.display='inline-block';profileIcon.href='profile.html';updateCartCount(userId);}else{greeting.textContent='Welcome, Guest!';logoutBtn.style.display='none';profileIcon.href='login.html';updateGuestCartCount();}}
logoutBtn.addEventListener('click',async()=>{await client.auth.signOut();window.location.reload();});

async function updateCartCount(uid){const{data}=await client.from('cart').select('quantity').eq('user_id',uid);cartCount.textContent=data?.reduce((s,i)=>s+(i.quantity||0),0)||0;}
function updateGuestCartCount(){cartCount.textContent=JSON.parse(localStorage.getItem('guestCart')||'[]').reduce((s,i)=>s+(i.quantity||0),0);}

// ===== IMAGE CAROUSEL =====
function prevImage(e){const c=e.parentElement,img=c.querySelector('.carousel-image'),imgs=JSON.parse(c.dataset.images);let i=parseInt(img.dataset.index||'0');i=(i-1+imgs.length)%imgs.length;img.src=imgs[i];img.dataset.index=i;}
function nextImage(e){const c=e.parentElement,img=c.querySelector('.carousel-image'),imgs=JSON.parse(c.dataset.images);let i=parseInt(img.dataset.index||'0');i=(i+1)%imgs.length;img.src=imgs[i];img.dataset.index=i;}
function selectColor(e,co){const c=e.closest('.product');c.dataset.selectedColor=co;const ci=JSON.parse(c.dataset.colorImages||'{}');const img=c.querySelector('.carousel-image');if(ci[co]&&img)img.src=ci[co];c.querySelectorAll('.color-circle').forEach(x=>x.classList.remove('selected'));e.classList.add('selected');}
function toggleDescription(e){const p=e.parentElement.parentElement,s=p.querySelector('.short-text'),f=p.querySelector('.full-text'),rm=p.querySelector('.read-more'),rl=p.querySelector('.read-less');const ex=f.style.display==='inline';f.style.display=ex?'none':'inline';s.style.display=ex?'inline':'none';rm.style.display=ex?'inline':'none';rl.style.display=ex?'none':'inline';}

// ===== SIDEBAR =====
function toggleSidebar(){document.getElementById('sidebar')?.classList.add('active');document.getElementById('overlay')?.classList.add('active');}
function closeSidebar(){document.getElementById('sidebar')?.classList.remove('active');document.getElementById('overlay')?.classList.remove('active');}

// ===== NAVIGATION =====
if(cartIcon)cartIcon.addEventListener('click',()=>window.location.href='cart.html');
if(viewCartBtn)viewCartBtn.addEventListener('click',()=>window.location.href='cart.html');
if(continueShoppingBtn)continueShoppingBtn.addEventListener('click',()=>window.location.href='store.html');
window.addEventListener('resize',()=>setTimeout(updateProductsPerPage,200));

// ===== INIT =====
loadProducts();

// ===== EXPOSE =====
window.prevImage=prevImage;window.nextImage=nextImage;
window.toggleDescription=toggleDescription;window.selectColor=selectColor;
window.toggleSidebar=toggleSidebar;window.closeSidebar=closeSidebar;
window.goToPage=goToPage;