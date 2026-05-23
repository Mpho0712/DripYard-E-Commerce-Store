document.addEventListener('DOMContentLoaded', async () => {
  const client = supabase.createClient(
    'https://kidfloycujnakuovfeqg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
  );

  const cartItemsDiv = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const cartCount = document.getElementById('cart-count');
  const backBtn = document.getElementById('back-btn');
  const greeting = document.getElementById('user-greeting');
  const logoutBtn = document.getElementById('logout-btn');
  const emptyMessage = document.getElementById('empty-message');

  let cart = [];
  let userId = null;

  async function loadCart() {
    try {
      const { data: sessionData } = await client.auth.getSession();
      userId = sessionData?.session?.user?.id;

      if (userId) {
        const { data: profile } = await client
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        greeting.textContent = profile?.full_name ? `Welcome, ${profile.full_name}!` : 'Welcome!';
        logoutBtn.style.display = 'inline-block';

        const { data: cartItems, error: cartError } = await client
          .from('cart')
          .select('*')
          .eq('user_id', userId);

        if (cartError) {
          console.error('Error loading cart:', cartError);
          cart = [];
        } else if (!cartItems || cartItems.length === 0) {
          cart = [];
        } else {
          const productIds = cartItems.map(item => item.product_id);
          
          const { data: products, error: productsError } = await client
            .from('products')
            .select('*')
            .in('id', productIds);
          
          if (productsError) {
            console.error('Error loading products:', productsError);
            cart = [];
          } else {
            const productMap = {};
            products.forEach(product => {
              productMap[product.id] = product;
            });
            
            cart = cartItems.map(item => ({
              id: item.id,
              quantity: item.quantity,
              color: item.color,
              size: item.size,
              product_id: item.product_id,
              products: productMap[item.product_id] || null
            }));
          }
        }
      } else {
        greeting.textContent = 'Welcome, Guest!';
        logoutBtn.style.display = 'none';

        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
        
        cart = guestCart.map(item => ({
          id: item.id || item.productId,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          image: item.image,
          products: {
            id: item.productId,
            name: item.name,
            price: item.price,
            description: item.description || '',
            image_url: item.image,
            extra_images: item.extra_images || []
          }
        }));
      }

      renderCart();
    } catch (err) {
      console.error('Error in loadCart:', err);
      cart = [];
      renderCart();
    }
  }

  function getProductImage(item) {
    const product = item.products || item;
    if (product && product.image_url && product.image_url.trim() !== '') {
      return product.image_url;
    }
    if (product && product.extra_images && product.extra_images.length > 0 && product.extra_images[0]) {
      return product.extra_images[0];
    }
    if (item.image && item.image.trim() !== '') {
      return item.image;
    }
    return 'https://via.placeholder.com/100x100?text=No+Image';
  }

  function renderCart() {
    if (!cartItemsDiv) return;
    
    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (!cart || cart.length === 0) {
      if (emptyMessage) emptyMessage.textContent = 'Your cart is empty.';
      if (cartTotal) cartTotal.textContent = 'Total: R0';
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
      }
      updateCartCount();
      return;
    }

    if (emptyMessage) emptyMessage.textContent = '';
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.cursor = 'pointer';
    }

    cart.forEach((item, index) => {
      const product = item.products;
      
      if (!product) return;
      
      const imageUrl = getProductImage(item);
      const price = product.price || 0;
      const name = product.name || 'Unknown Product';
      const qty = item.quantity || 1;
      const productId = product.id || item.product_id;

      total += price * qty;

      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <div class="cart-image">
          <img src="${imageUrl}" alt="${escapeHtml(name)}" class="cart-thumb" 
               onclick="window.location.href='product.html?id=${productId}'" 
               onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'" />
        </div>
        <div class="cart-info">
          <div class="cart-details">
            <span class="cart-name" onclick="window.location.href='product.html?id=${productId}'">${escapeHtml(name)}</span>
            <span class="cart-color">Color: ${item.color || 'N/A'}</span>
            <span class="cart-size">Size: ${item.size || 'N/A'}</span>
            <span class="cart-price">Price: R${price}</span>
            <div class="qty-section">
              <span>Quantity: </span>
              <div class="qty-controls">
                <button class="qty-minus" data-index="${index}">−</button>
                <span class="qty-number">${qty}</span>
                <button class="qty-plus" data-index="${index}">+</button>
              </div>
            </div>
            <button class="remove-item" data-index="${index}">Remove</button>
          </div>
        </div>
      `;
      cartItemsDiv.appendChild(div);
    });

    document.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        if (userId) changeQty(index, -1);
        else changeGuestQty(index, -1);
      });
    });

    document.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        if (userId) changeQty(index, 1);
        else changeGuestQty(index, 1);
      });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        removeCartItem(index);
      });
    });

    if (cartTotal) cartTotal.textContent = `Total: R${total}`;
    updateCartCount();
  }

  async function removeCartItem(index) {
    if (index < 0 || index >= cart.length) return;
    const item = cart[index];
    
    if (userId) {
      const { error } = await client.from('cart').delete().eq('id', item.id);
      if (error) { alert('Failed to remove item'); return; }
    } else {
      let guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
      guestCart = guestCart.filter((_, i) => i !== index);
      localStorage.setItem('guestCart', JSON.stringify(guestCart));
    }
    await loadCart();
  }

  async function changeQty(index, delta) {
    const item = cart[index];
    if (!item) return;
    const newQty = (item.quantity || 1) + delta;

    if (newQty <= 0) {
      await removeCartItem(index);
    } else {
      const { error } = await client.from('cart').update({ quantity: newQty }).eq('id', item.id);
      if (!error) await loadCart();
    }
  }

  function changeGuestQty(index, delta) {
    let guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    if (index < 0 || index >= guestCart.length) return;
    const newQty = (guestCart[index].quantity || 1) + delta;
    if (newQty <= 0) guestCart.splice(index, 1);
    else guestCart[index].quantity = newQty;
    localStorage.setItem('guestCart', JSON.stringify(guestCart));
    loadCart();
  }

  function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (cartCount) cartCount.textContent = totalItems;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await client.auth.signOut();
      window.location.reload();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => window.location.href = 'store.html');
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!cart || cart.length === 0) { alert('Your cart is empty.'); return; }

      localStorage.setItem('cartItems', JSON.stringify(cart.map(item => {
        const product = item.products;
        return {
          id: item.id,
          name: product?.name || 'Unknown',
          price: product?.price || 0,
          quantity: item.quantity || 1,
          color: item.color,
          size: item.size,
          image: getProductImage(item)
        };
      })));

      const total = cart.reduce((sum, item) => {
        const product = item.products;
        return sum + (product?.price || 0) * (item.quantity || 1);
      }, 0);

      localStorage.setItem('cartTotal', total);
      window.location.href = 'delivery.html';
    });
  }

  window.toggleSidebar = () => {
    document.getElementById('sidebar')?.classList.add('active');
    document.getElementById('overlay')?.classList.add('active');
  };

  window.closeSidebar = () => {
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('overlay')?.classList.remove('active');
  };

  await loadCart();
});