(function() {
  'use strict';

  if (window.__eliteCarRentals) return;
  window.__eliteCarRentals = { initialized: true };

  const STATE = {
    scrollY: 0,
    isMenuOpen: false,
    activeSection: null,
    observers: [],
    animations: []
  };

  const REGEX = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\+\-\(\)]{10,20}$/,
    name: /^[a-zA-ZÀ-ÿ\s'\-]{2,50}$/,
    message: /^[\s\S]{10,1000}$/,
    date: /^\d{4}\-\d{2}\-\d{2}$/
  };

  const MESSAGES = {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid phone number (10-20 digits)',
    invalidName: 'Name must be 2-50 characters, letters only',
    invalidMessage: 'Message must be at least 10 characters',
    invalidDate: 'Please select a valid date',
    futureDateRequired: 'Date must be in the future',
    returnAfterPickup: 'Return date must be after pickup date',
    consentRequired: 'You must agree to the terms',
    submitError: 'Unable to submit form. Please check your connection.',
    submitSuccess: 'Form submitted successfully!',
    processing: 'Processing...'
  };

  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getHeaderHeight() {
    const header = document.querySelector('.l-header');
    return header ? header.offsetHeight : 80;
  }

  function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  function addRippleStyles() {
    if (document.getElementById('ripple-styles')) return;

    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      @keyframes ripple-effect {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scale-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes slide-in-right {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(15, 89, 89, 0.4);
        }
        50% {
          box-shadow: 0 0 20px 10px rgba(15, 89, 89, 0);
        }
      }
      
      .animate-fade-in-up {
        animation: fade-in-up 0.8s ease-out forwards;
      }
      
      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }
      
      .animate-scale-in {
        animation: scale-in 0.5s ease-out forwards;
      }
      
      .animate-slide-in-right {
        animation: slide-in-right 0.7s ease-out forwards;
      }
      
      .u-no-scroll {
        overflow: hidden;
        height: 100vh;
      }
      
      .c-nav.is-open .navbar-collapse {
        max-height: calc(100vh - var(--header-h)) !important;
        overflow-y: auto;
      }
      
      @media (min-width: 768px) {
        .c-nav.is-open .navbar-collapse {
          max-height: none !important;
        }
      }
      
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      }
      
      .notification {
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slide-in-right 0.3s ease-out;
        pointer-events: auto;
        border-left: 4px solid var(--color-primary);
      }
      
      .notification.success {
        border-left-color: var(--color-success);
      }
      
      .notification.error {
        border-left-color: var(--color-error);
      }
      
      .notification.warning {
        border-left-color: var(--color-warning);
      }
      
      .notification-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .notification.success .notification-icon {
        background: var(--color-success);
        color: white;
      }
      
      .notification.error .notification-icon {
        background: var(--color-error);
        color: white;
      }
      
      .notification-close {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--color-text-muted);
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }
      
      .notification-close:hover {
        background: var(--color-neutral-100);
        color: var(--color-text-primary);
      }
      
      .scroll-to-top {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
        transition: all 0.3s ease-in-out;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(15, 89, 89, 0.3);
      }
      
      .scroll-to-top.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .scroll-to-top:hover {
        background: var(--color-accent);
        transform: translateY(-5px);
        box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
      }
      
      .spinner-border {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 0.2em solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spinner-rotate 0.75s linear infinite;
      }
      
      .spinner-border-sm {
        width: 0.875em;
        height: 0.875em;
        border-width: 0.15em;
      }
      
      @keyframes spinner-rotate {
        to { transform: rotate(360deg); }
      }
      
      .count-up {
        font-variant-numeric: tabular-nums;
      }
      
      @media (max-width: 767px) {
        .notification-container {
          left: 20px;
          right: 20px;
          max-width: none;
        }
        
        .scroll-to-top {
          bottom: 20px;
          right: 20px;
          width: 45px;
          height: 45px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initBurgerMenu() {
    const nav = document.querySelector('.navbar');
    const toggle = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('.navbar-collapse');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!nav || !toggle || !collapse) return;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = collapse.classList.contains('show');
      
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    function openMenu() {
      collapse.classList.add('show');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('u-no-scroll');
      STATE.isMenuOpen = true;
    }

    function closeMenu() {
      collapse.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('u-no-scroll');
      STATE.isMenuOpen = false;
    }

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          closeMenu();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (STATE.isMenuOpen && !nav.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && STATE.isMenuOpen) {
        closeMenu();
        toggle.focus();
      }
    });

    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth >= 768 && STATE.isMenuOpen) {
        closeMenu();
      }
    }, 250));
  }

  function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn, .c-btn, .c-button, .nav-link, .card');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        if (!this.classList.contains('no-ripple')) {
          createRipple(e, this);
        }
      });
    });
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll('[id]');
    const navLinks = document.querySelectorAll('.nav-link[href*="#"]');

    if (sections.length === 0 || navLinks.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: `-${getHeaderHeight()}px 0px -50% 0px`,
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          STATE.activeSection = id;
          
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            
            if (href === `#${id}` || href === `/#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
    STATE.observers.push(observer);
  }

  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href*="#"]');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href === '#' || href === '#!') return;

      const hash = href.includes('#') ? href.split('#')[1] : null;
      if (!hash) return;

      const element = document.getElementById(hash);
      if (!element) return;

      e.preventDefault();
      
      const offsetTop = element.offsetTop - getHeaderHeight();
      
      window.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth'
      });

      if (STATE.isMenuOpen) {
        const collapse = document.querySelector('.navbar-collapse');
        const toggle = document.querySelector('.navbar-toggler');
        if (collapse) collapse.classList.remove('show');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('u-no-scroll');
        STATE.isMenuOpen = false;
      }

      setTimeout(() => {
        element.setAttribute('tabindex', '-1');
        element.focus();
        element.removeAttribute('tabindex');
      }, 500);
    });
  }

  function initScrollAnimations() {
    const elements = document.querySelectorAll('.card, img:not(.c-logo__img), h1, h2, h3, .lead, .btn-primary, .btn-outline-primary, .c-btn, .c-button, .list-unstyled, form');

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          if (element.classList.contains('card')) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            requestAnimationFrame(() => {
              element.classList.add('animate-fade-in-up');
            });
          } else if (element.tagName === 'IMG') {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.95)';
            requestAnimationFrame(() => {
              element.classList.add('animate-scale-in');
            });
          } else if (['H1', 'H2', 'H3'].includes(element.tagName)) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
              element.classList.add('animate-fade-in-up');
            });
          } else {
            element.style.opacity = '0';
            requestAnimationFrame(() => {
              element.classList.add('animate-fade-in');
            });
          }
          
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    elements.forEach((element, index) => {
      element.style.animationDelay = `${index * 0.05}s`;
      observer.observe(element);
    });

    STATE.observers.push(observer);
  }

  function initCountUp() {
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const target = parseInt(element.getAttribute('data-count'));
          const duration = 2000;
          const step = target / (duration / 16);
          let current = 0;

          element.classList.add('count-up');

          const counter = setInterval(() => {
            current += step;
            if (current >= target) {
              element.textContent = target.toLocaleString();
              clearInterval(counter);
            } else {
              element.textContent = Math.floor(current).toLocaleString();
            }
          }, 16);

          observer.unobserve(element);
        }
      });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));
    STATE.observers.push(observer);
  }

  function initScrollToTop() {
    const button = document.createElement('button');
    button.className = 'scroll-to-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = '↑';
    document.body.appendChild(button);

    const toggleButton = throttle(() => {
      if (window.scrollY > 500) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    }, 100);

    window.addEventListener('scroll', toggleButton);

    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  function showNotification(message, type = 'info') {
    let container = document.querySelector('.notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i';
    
    const text = document.createElement('div');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close notification');
    
    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(closeBtn);
    container.appendChild(notification);

    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'fade-out 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'fade-out 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  function validateField(field, value) {
    const fieldName = field.name || field.id;
    
    if (field.hasAttribute('required') && !value.trim()) {
      return { valid: false, message: MESSAGES.required };
    }

    if (!value.trim() && !field.hasAttribute('required')) {
      return { valid: true, message: '' };
    }

    switch (fieldName) {
      case 'firstName':
      case 'lastName':
      case 'name':
        if (!REGEX.name.test(value)) {
          return { valid: false, message: MESSAGES.invalidName };
        }
        break;

      case 'email':
        if (!REGEX.email.test(value)) {
          return { valid: false, message: MESSAGES.invalidEmail };
        }
        break;

      case 'phone':
        if (!REGEX.phone.test(value.replace(/s/g, ''))) {
          return { valid: false, message: MESSAGES.invalidPhone };
        }
        break;

      case 'message':
        if (!REGEX.message.test(value)) {
          return { valid: false, message: MESSAGES.invalidMessage };
        }
        break;

      case 'pickupDate':
      case 'returnDate':
      case 'dates':
        if (!REGEX.date.test(value) && field.type === 'date') {
          return { valid: false, message: MESSAGES.invalidDate };
        }
        if (field.type === 'date') {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            return { valid: false, message: MESSAGES.futureDateRequired };
          }

          if (fieldName === 'returnDate') {
            const pickupInput = document.getElementById('pickupDate');
            if (pickupInput && pickupInput.value) {
              const pickupDate = new Date(pickupInput.value);
              if (selectedDate <= pickupDate) {
                return { valid: false, message: MESSAGES.returnAfterPickup };
              }
            }
          }
        }
        break;

      case 'consent':
      case 'privacy':
        if (field.type === 'checkbox' && !field.checked) {
          return { valid: false, message: MESSAGES.consentRequired };
        }
        break;
    }

    return { valid: true, message: '' };
  }

  function setFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    const errorId = field.getAttribute('aria-describedby');
    if (errorId) {
      const errorElement = document.getElementById(errorId);
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
      }
    }
  }

  function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    const errorId = field.getAttribute('aria-describedby');
    if (errorId) {
      const errorElement = document.getElementById(errorId);
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }
    }
  }

  function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const fields = form.querySelectorAll('input, select, textarea');
      
      fields.forEach(field => {
        field.addEventListener('blur', () => {
          const value = field.type === 'checkbox' ? field.checked : field.value;
          const result = validateField(field, value);
          
          if (!result.valid) {
            setFieldError(field, result.message);
          } else {
            clearFieldError(field);
          }
        });

        field.addEventListener('input', () => {
          if (field.classList.contains('is-invalid')) {
            const value = field.type === 'checkbox' ? field.checked : field.value;
            const result = validateField(field, value);
            
            if (result.valid) {
              clearFieldError(field);
            }
          }
        });
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let isValid = true;
        const formData = {};

        fields.forEach(field => {
          const value = field.type === 'checkbox' ? field.checked : field.value;
          const result = validateField(field, value);

          if (!result.valid) {
            setFieldError(field, result.message);
            isValid = false;
          } else {
            clearFieldError(field);
            if (field.name) {
              formData[field.name] = sanitizeInput(value.toString());
            }
          }
        });

        if (!isValid) {
          showNotification('Please correct the errors in the form', 'error');
          const firstError = form.querySelector('.is-invalid');
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
          }
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
          const originalText = submitButton.textContent;
          submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${MESSAGES.processing}`;

          setTimeout(() => {
            showNotification(MESSAGES.submitSuccess, 'success');
            
            setTimeout(() => {
              window.location.href = 'thank_you.html';
            }, 1000);
          }, 1500);
        }
      });
    });
  }

  function initImageAnimations() {
    const images = document.querySelectorAll('img:not(.c-logo__img)');
    
    images.forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      img.addEventListener('error', function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect width="100%25" height="100%25" fill="%23f8f9fa"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="14" fill="%236c757d" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
      });
    });
  }

  function initCardHoverEffects() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease-in-out';
        this.style.transform = 'translateY(-8px)';
      });

      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  }

  function initButtonHoverEffects() {
    const buttons = document.querySelectorAll('.btn, .c-btn, .c-button');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.25s ease-in-out';
      });
    });
  }

  function initLinkHoverEffects() {
    const links = document.querySelectorAll('a:not(.btn):not(.c-btn):not(.c-button)');
    
    links.forEach(link => {
      link.addEventListener('mouseenter', function() {
        this.style.transition = 'color 0.2s ease-in-out';
      });
    });
  }

  function initPrivacyModal() {
    const privacyLinks = document.querySelectorAll('a[href*="privacy"]');
    
    privacyLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        if (this.getAttribute('href') === '#privacy' || this.getAttribute('href') === '#privacy-policy') {
          e.preventDefault();
          window.location.href = 'privacy.html';
        }
      });
    });
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        addRippleStyles();
        initBurgerMenu();
        initRippleEffect();
        initScrollSpy();
        initSmoothScroll();
        initScrollAnimations();
        initCountUp();
        initScrollToTop();
        initFormValidation();
        initImageAnimations();
        initCardHoverEffects();
        initButtonHoverEffects();
        initLinkHoverEffects();
        initPrivacyModal();
      });
    } else {
      addRippleStyles();
      initBurgerMenu();
      initRippleEffect();
      initScrollSpy();
      initSmoothScroll();
      initScrollAnimations();
      initCountUp();
      initScrollToTop();
      initFormValidation();
      initImageAnimations();
      initCardHoverEffects();
      initButtonHoverEffects();
      initLinkHoverEffects();
      initPrivacyModal();
    }
  }

  window.addEventListener('beforeunload', () => {
    STATE.observers.forEach(observer => observer.disconnect());
  });

  init();
})();
