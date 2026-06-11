document.addEventListener('DOMContentLoaded', () => {

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const fadeEls = document.querySelectorAll('.fade-up');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  fadeEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.classList.add('visible');
    } else {
      io.observe(el);
    }
  });

  const form = document.querySelector('.contact-form');
  if (form) {
    const status = form.querySelector('.form-status');

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();

      const name = form.querySelector('#nombre');
      const email = form.querySelector('#email');
      const message = form.querySelector('#mensaje');

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        showStatus('Por favor, completa todos los campos.', 'err');
        return;
      }

      if (!emailPattern.test(email.value.trim())) {
        showStatus('Introduce un correo electrónico válido.', 'err');
        return;
      }

      const subject = encodeURIComponent(`Mensaje de ${name.value.trim()}`);
      const body = encodeURIComponent(`${message.value.trim()}\n\n— ${name.value.trim()} (${email.value.trim()})`);
      const mailtoLink = `mailto:juegoerveca@gmail.com?subject=${subject}&body=${body}`;

      const mailWindow = window.open(mailtoLink, '_blank');

      setTimeout(() => {
        if (!mailWindow || mailWindow.closed || typeof mailWindow.closed === 'undefined') {
          showStatus('No se pudo abrir el cliente de correo automáticamente.', 'err');
          
          const fallbackMsg = document.createElement('div');
          fallbackMsg.innerHTML = `
            <p style="margin-top:8px;font-size:14px;">
              Puedes escribir manualmente a: <strong>juegoerveca@gmail.com</strong>
            </p>
          `;
          status.appendChild(fallbackMsg);
        } else {
          showStatus('Revisa tu cliente de correo.', 'ok');
          form.reset();
          mailWindow.close(); 
        }
      }, 500);
    });

    function showStatus(text, type) {
      status.textContent = text;
      status.className = `form-status ${type}`;
    }
  }
});