/* =========================================================
   Invitación Posada · Familia López Sandoval

   Índice
   1. Configuración
   2. Referencias y utilidades
   3. Música
   4. Portada: sobre navideño
   5. Reveal al hacer scroll
   6. Cuenta regresiva
   7. Nieve
   8. Confirmación por WhatsApp
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. Configuración (edita aquí) ---------- */
  const CONFIG = {
    family: 'Familia López Sandoval',
    // Mes 0-indexado: 11 = diciembre. 20:00 = 8:00 pm (hora local del invitado)
    eventDate: new Date(2026, 11, 11, 20, 0, 0),
    eventLabel: '11 de diciembre a las 8:00 pm',
    // WhatsApp con código de país (52 = México). Cámbialo si es de otro país.
    whatsappNumber: '523757607850',
    musicVolume: 0.5
  };

  /* ---------- 2. Referencias y utilidades ---------- */
  const $ = (sel) => document.querySelector(sel);
  const body = document.body;
  const cover = $('#cover');
  const invite = $('#invite');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 3. Música ----------
     Si existe assets/audio/villancicos.mp3 se reproduce ese archivo.
     Si no existe o falla, suena el villancico sintetizado de js/carol.js. */
  const audio = $('#bgm');
  const musicBtn = $('#musicBtn');
  const carol = window.CarolSynth;
  let useSynth = false;
  let wasPlaying = false;

  audio.volume = CONFIG.musicVolume;

  const setPlayingUI = (on) => {
    musicBtn.classList.toggle('is-playing', on);
    musicBtn.setAttribute('aria-pressed', String(on));
  };

  const isPlaying = () => (useSynth ? !!(carol && carol.playing) : !audio.paused);

  function startSynth() {
    useSynth = true;
    if (carol) { carol.play(); setPlayingUI(true); }
  }

  function playMusic() {
    if (useSynth) { startSynth(); return; }
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => setPlayingUI(true)).catch(startSynth);
    }
  }

  function pauseMusic() {
    if (useSynth) carol.pause(); else audio.pause();
    setPlayingUI(false);
  }

  musicBtn.addEventListener('click', () => (isPlaying() ? pauseMusic() : playMusic()));
  audio.addEventListener('error', () => { useSynth = true; });

  // Pausa al ocultar la pestaña y reanuda al volver si estaba sonando
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasPlaying = isPlaying();
      if (wasPlaying) pauseMusic();
    } else if (wasPlaying) {
      playMusic();
      wasPlaying = false;
    }
  });

  /* ---------- 4. Portada: sobre navideño ---------- */
  const envelope = $('#envelope');
  const envWrap = $('#envWrap');
  const burstBox = $('#burst');
  let opening = false;

  // Luces, destellos flotantes e inclinación 3D del sobre
  function initCover() {
    const lights = $('#lights');
    const bulbs = Math.ceil(window.innerWidth / 46);
    for (let i = 0; i < bulbs; i++) {
      lights.appendChild(Object.assign(document.createElement('i'), { className: 'bulb' }));
    }

    if (reduceMotion) return;

    const bokeh = $('#bokeh');
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('span');
      const size = 30 + Math.random() * 90;
      dot.style.cssText =
        `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `animation-duration:${14 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s;` +
        `--sx:${(Math.random() - 0.5) * 120}px`;
      bokeh.appendChild(dot);
    }

    // El sobre sigue al puntero (solo con mouse)
    if (window.matchMedia('(hover: hover)').matches) {
      cover.addEventListener('pointermove', (e) => {
        if (opening) return;
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        envWrap.style.setProperty('--ry', `${x * 14}deg`);
        envWrap.style.setProperty('--rx', `${-y * 10}deg`);
      });
    }
  }

  // Lluvia de destellos dorados desde el sello
  function burst(count, radius) {
    if (reduceMotion) return;
    const glyphs = ['✦', '✧', '❄', '•', '✦'];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.45 + Math.random() * 0.75);
      spark.className = 'spark';
      spark.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      spark.style.cssText =
        `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 40}px;` +
        `--rot:${(Math.random() - 0.5) * 360}deg;--s:${10 + Math.random() * 16}px;` +
        `animation-delay:${Math.random() * 0.15}s`;
      burstBox.appendChild(spark);
      setTimeout(() => spark.remove(), 1700);
    }
  }

  // Secuencia: sello se rompe → solapa se abre → carta sale → zoom a la invitación
  function openInvitation() {
    if (opening) return;
    opening = true;

    const k = reduceMotion ? 0.2 : 1;
    const at = (fn, ms) => setTimeout(fn, ms * k);

    cover.classList.add('is-opening');
    envWrap.style.setProperty('--rx', '0deg');
    envWrap.style.setProperty('--ry', '0deg');
    playMusic(); // el clic del usuario permite iniciar el audio
    burst(14, 90);

    at(() => { cover.classList.add('flap-open'); burst(18, 130); }, 280);
    at(() => { cover.classList.add('letter-out'); burst(26, 190); }, 1150);
    at(() => {
      cover.classList.add('is-zoom');
      body.classList.remove('is-locked');
      window.scrollTo(0, 0);
      invite.classList.add('is-visible');
      invite.removeAttribute('aria-hidden');
      musicBtn.hidden = false;
      initReveal();
    }, 2300);
    at(() => { cover.hidden = true; }, 3600);
  }

  $('#openBtn').addEventListener('click', (e) => { e.stopPropagation(); openInvitation(); });
  envelope.addEventListener('click', openInvitation);
  initCover();

  /* ---------- 5. Reveal al hacer scroll ---------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 0.12}s`; // escalonado
      io.observe(el);
    });
  }

  /* ---------- 6. Cuenta regresiva ---------- */
  const cd = {
    box: $('#countdown'),
    days: $('#cd-days'),
    hours: $('#cd-hours'),
    mins: $('#cd-mins'),
    secs: $('#cd-secs'),
    msg: $('#cd-msg')
  };
  const pad = (n) => String(n).padStart(2, '0');

  // Devuelve false cuando el evento ya comenzó (detiene el intervalo)
  function tick() {
    const diff = CONFIG.eventDate - Date.now();

    if (diff <= 0) {
      const sameDay = Date.now() - CONFIG.eventDate < 24 * 3600 * 1000;
      cd.box.hidden = true;
      cd.msg.hidden = false;
      cd.msg.textContent = sameDay ? '¡Es hoy, te esperamos!' : '¡Gracias por acompañarnos!';
      return false;
    }

    const s = Math.floor(diff / 1000);
    cd.days.textContent = pad(Math.floor(s / 86400));
    cd.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    cd.mins.textContent = pad(Math.floor((s % 3600) / 60));
    cd.secs.textContent = pad(s % 60);
    return true;
  }

  if (tick()) {
    const timer = setInterval(() => { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------- 7. Nieve ---------- */
  function createSnow() {
    if (reduceMotion) return;
    const snow = $('#snow');
    const count = window.innerWidth < 600 ? 28 : 60;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const flake = document.createElement('span');
      const size = 2 + Math.random() * 5;
      flake.className = 'flake';
      flake.style.cssText = [
        `left:${Math.random() * 100}%`,
        `width:${size}px`,
        `height:${size}px`,
        `opacity:${0.35 + Math.random() * 0.55}`,
        `animation-duration:${7 + Math.random() * 10}s`,
        `animation-delay:${-Math.random() * 14}s`,
        `--drift:${(Math.random() - 0.5) * 120}px`
      ].join(';');
      frag.appendChild(flake);
    }
    snow.appendChild(frag);
  }
  createSnow();

  /* ---------- 8. Confirmación por WhatsApp ---------- */
  const form = $('#rsvpForm');
  const nameInput = $('#name');
  const nameError = $('#nameError');

  nameInput.addEventListener('input', () => {
    nameInput.closest('.field').classList.remove('has-error');
    nameError.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      nameInput.closest('.field').classList.add('has-error');
      nameError.hidden = false;
      nameInput.focus();
      return;
    }

    const guests = $('#guests').value;
    const guestsText = guests === '6' ? '6 o más personas'
      : guests === '1' ? '1 persona' : `${guests} personas`;
    const extra = $('#msg').value.trim();

    let text =
      `¡Hola ${CONFIG.family}! 🎄\n` +
      `Soy *${name}* y confirmo mi asistencia a la posada del ${CONFIG.eventLabel}.\n` +
      `Asistiremos: ${guestsText}.`;
    if (extra) text += `\n\n${extra}`;

    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  });
})();
