const client = supabase.createClient(
  'https://kidfloycujnakuovfeqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGZsb3ljdWpuYWt1b3ZmZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMyMjEsImV4cCI6MjA3NDE0OTIyMX0.c1qjfTo1zasa2qSLIzjXNXUjp4U9S7DyP8VTEQV9ehs'
);

const cartCount = document.getElementById('cart-count');
const cartIcon = document.getElementById('cart-icon');
const greeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const profileIcon = document.getElementById('profile-icon');

let userId = null;

// ===== HERO CAROUSEL =====
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
function showSlide(i) { slides.forEach((s, j) => s.classList.toggle('active', j === i)); }
function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); }
function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); }
setInterval(nextSlide, 9000);

// ===== USER SESSION =====
async function checkUserSession() {
  const { data: sd } = await client.auth.getSession();
  userId = sd?.session?.user?.id;
  if (userId) {
    const { data: p } = await client.from('profiles').select('full_name').eq('id', userId).single();
    greeting.textContent = p?.full_name ? `Welcome, ${p.full_name}!` : 'Welcome, User!';
    logoutBtn.style.display = 'inline-block';
    profileIcon.href = 'profile.html';
    updateCartCount(userId);
  } else {
    greeting.textContent = 'Welcome, Guest!';
    logoutBtn.style.display = 'none';
    profileIcon.href = 'login.html';
    updateGuestCartCount();
  }
}
logoutBtn.addEventListener('click', async () => { await client.auth.signOut(); window.location.reload(); });

// ===== CART COUNT =====
async function updateCartCount(uid) {
  const { data } = await client.from('cart').select('quantity').eq('user_id', uid);
  cartCount.textContent = data?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
}
function updateGuestCartCount() {
  cartCount.textContent = JSON.parse(localStorage.getItem('guestCart') || '[]').reduce((s, i) => s + (i.quantity || 0), 0);
}

// ===== SIDEBAR =====
function toggleSidebar() { document.getElementById('sidebar')?.classList.add('active'); document.getElementById('overlay')?.classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('active'); document.getElementById('overlay')?.classList.remove('active'); }

// ===== NEWSLETTER SUBSCRIPTION =====
document.getElementById('newsletter-btn').addEventListener('click', async function() {
  var email = document.getElementById('newsletter-email').value.trim().toLowerCase();
  var msg = document.getElementById('newsletter-message');
  
  if (!email || !email.includes('@') || !email.includes('.')) {
    msg.textContent = 'Please enter a valid email address.';
    msg.style.color = '#ef4444';
    return;
  }
  
  this.disabled = true;
  this.textContent = 'Subscribing...';
  
  // Check if already subscribed
  var checkResult = await client.from('newsletter_subscribers').select('id').eq('email', email).single();
  
  if (checkResult.data) {
    msg.textContent = 'You are already subscribed!';
    msg.style.color = '#f59e0b';
    this.disabled = false;
    this.textContent = 'Subscribe';
    return;
  }
  
  // Insert new subscriber
  var result = await client.from('newsletter_subscribers').insert({ email: email });
  
  if (result.error) {
    if (result.error.message.includes('duplicate')) {
      msg.textContent = 'You are already subscribed!';
      msg.style.color = '#f59e0b';
    } else {
      msg.textContent = 'Something went wrong. Please try again.';
      msg.style.color = '#ef4444';
    }
  } else {
    msg.textContent = 'Thanks for subscribing! You will be the first to know about new drops.';
    msg.style.color = '#4ade80';
    document.getElementById('newsletter-email').value = '';
  }
  
  this.disabled = false;
  this.textContent = 'Subscribe';
});
// ===== BRAND SECTION ANIMATION =====
(function() {
  const section = document.getElementById('brand-section');
  if (!section) return;
  const allItems = section.querySelectorAll('.slide-item, .photo-text-item');
  
  function resetItems() {
    allItems.forEach(item => {
      item.style.opacity = '0';
      if (item.classList.contains('photo-text-item')) {
        item.style.transform = 'translate(30px, 30px)';
      } else {
        item.style.transform = 'translateX(-40px)';
      }
      item.style.transition = 'none';
    });
  }
  
  function animateItems() {
    allItems.forEach(item => {
      const delay = parseInt(item.getAttribute('data-delay')) || 0;
      setTimeout(() => {
        item.style.transition = 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)';
        item.style.opacity = '1';
        item.style.transform = 'translate(0, 0)';
      }, delay);
    });
  }
  
  resetItems();
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { resetItems(); setTimeout(animateItems, 200); }
      else { resetItems(); }
    });
  }, { threshold: 0.1 });
  
  observer.observe(section);
})();

// ===== PARALLAX SCROLL =====
window.addEventListener('scroll', function() {
  const hero = document.querySelector('.hero-carousel');
  if (!hero) return;
  const scrollY = window.scrollY;
  const heroHeight = hero.offsetHeight;
  if (scrollY <= heroHeight) {
    const activeSlide = document.querySelector('.carousel-slide.active');
    if (activeSlide) activeSlide.style.transform = `translateY(${scrollY * 0.3}px)`;
    const overlay = hero.querySelector('.carousel-overlay');
    if (overlay) {
      overlay.style.opacity = Math.max(0, Math.min(1, 1 - (scrollY / (heroHeight * 0.7))));
      overlay.style.transform = `translateY(${scrollY * 0.2}px)`;
    }
  }
});

function resetAllSlides() {
  document.querySelectorAll('.carousel-slide').forEach(s => s.style.transform = 'translateY(0)');
}
const origNext = nextSlide, origPrev = prevSlide;
nextSlide = function() { resetAllSlides(); origNext(); };
prevSlide = function() { resetAllSlides(); origPrev(); };

// ===== NAVIGATION =====
if (cartIcon) cartIcon.addEventListener('click', () => window.location.href = 'cart.html');

// ===== INIT =====
checkUserSession();

// ===== EXPOSE =====
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;