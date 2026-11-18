'use strict';

/* ===== Utilidades ===== */
const $  = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/* ===== Footer: año dinámico ===== */
function initAnio() {
  const anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();
}

/* ===== RF-01: filtros de cartelera ===== */
function initFiltros() {
  const chips = $$('.chip[data-filtro]');
  const obras = $$('.obra');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filtro = chip.dataset.filtro;

      chips.forEach((c) => {
        const activo = c === chip;
        c.classList.toggle('is-active', activo);
        c.setAttribute('aria-pressed', String(activo));
      });

      obras.forEach((obra) => {
        obra.hidden = !(filtro === 'todas' || obra.dataset.genero === filtro);
      });
    });
  });
}

/* ===== RF-01: badge "Próxima función" y funciones pasadas ===== */
function initProximaFuncion() {
  const ahora = new Date();
  const formato = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  });

  $$('.obra').forEach((obra) => {
    const funciones = $$('.funciones li', obra);
    let proxima = null;

    funciones.forEach((li) => {
      const fecha = new Date($('time', li).dateTime);
      if (fecha < ahora) li.classList.add('is-past');
      else if (!proxima) proxima = fecha;
    });

    const badge = $('[data-proxima]', obra);
    if (!badge) return;
    badge.textContent = proxima
      ? `Próxima función: ${formato.format(proxima)}`
      : 'Temporada finalizada';
  });
}

/* ===== RF-01 → RF-02: recordar la obra elegida para la reserva ===== */
function initBotonesReserva() {
  $$('.btn[data-obra]').forEach((boton) => {
    boton.addEventListener('click', () => {
      try {
        sessionStorage.setItem('obraSeleccionada', boton.dataset.obra);
      } catch (e) {
        /* sessionStorage no disponible: se ignora */
      }
    });
  });
}

/* ===== Animación de aparición al hacer scroll ===== */
function initReveal() {
  const elementos = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    elementos.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('is-visible');
        observer.unobserve(entrada.target);
      } 
    });
  }, { threshold: 0.15 });
  elementos.forEach((el) => observer.observe(el));
}

/* ===== Utilidades de interfaz ===== */
function toast(texto, esError = false) {
  const contenedor = $('#toasts');
  if (!contenedor) return;
  const el = document.createElement('div');
  el.className = 'toast' + (esError ? ' toast--error' : '');
  el.textContent = texto;
  contenedor.append(el);
  setTimeout(() => el.remove(), 4000);
}

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function ponerError(campo, mensaje) {
  const contenedor = campo.closest('.campo') || campo.parentElement;
  const error = $('.campo__error', contenedor) || $('#error-acepto');
  campo.classList.toggle('is-invalid', Boolean(mensaje));
  campo.setAttribute('aria-invalid', String(Boolean(mensaje)));
  if (error) {
    error.textContent = mensaje;
    error.hidden = !mensaje;
  }
}

/* Validador genérico con la Constraint Validation API nativa */
function validarCampo(campo, mensajes = {}) {
  const v = campo.validity;
  let mensaje = '';
  if (v.valueMissing) mensaje = mensajes.vacio || 'Este campo es obligatorio.';
  else if (v.tooShort) mensaje = mensajes.corto || `Mínimo ${campo.minLength} caracteres.`;
  else if (v.patternMismatch || v.typeMismatch) mensaje = mensajes.formato || 'Formato no válido.';
  else if (v.rangeUnderflow || v.rangeOverflow) mensaje = mensajes.rango || 'Valor fuera de rango.';
  ponerError(campo, mensaje);
  return !mensaje;
}

/* ===== RF-03: lightbox ===== */
function initLightbox() {
  const dialogo = $('#lightbox');
  if (!dialogo) return;
  const fotos = $$('.pasada');
  let actual = 0;

  function mostrar(indice) {
    actual = (indice + fotos.length) % fotos.length;
    const tarjeta = fotos[actual];
    const imagen = $('picture img', tarjeta);
    const grande = $('source[type="image/jpeg"]', tarjeta).srcset;
    $('#lightbox-img', dialogo).src = grande;
    $('#lightbox-img', dialogo).alt = imagen.alt;
    $('#lightbox-texto', dialogo).textContent = `${$('h3', tarjeta).textContent} · ${$('.obra__autor', tarjeta).textContent}`;
  }

  $$('[data-lightbox]').forEach((boton) => {
    boton.addEventListener('click', () => {
      mostrar(Number(boton.dataset.lightbox));
      dialogo.showModal();
    });
  });
  $('.lightbox__cerrar', dialogo).addEventListener('click', () => dialogo.close());
  $('.lightbox__nav--prev', dialogo).addEventListener('click', () => mostrar(actual - 1));
  $('.lightbox__nav--next', dialogo).addEventListener('click', () => mostrar(actual + 1));
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
  dialogo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
    if (e.key === 'ArrowRight') mostrar(actual + 1);
  });
}

/* ===== RF-03: reseñas ===== */
const CLAVE_RESENAS = 'teatroUCB.resenas';
const RESENAS_BASE = [
  { nombre: 'Daniela Rojas', obra: 'Macbeth', calif: 5, texto: 'La iluminación y el vestuario me dejaron sin aliento. Una puesta en escena memorable.', fecha: '2024-05-18' },
  { nombre: 'Marco Flores', obra: 'Romeo y Julieta', calif: 4, texto: 'Muy emotiva, los actores transmitieron cada escena con mucha fuerza.', fecha: '2023-10-07' },
  { nombre: 'Valeria Choque', obra: 'Sueño de una noche de verano', calif: 5, texto: 'Mágica y divertida. Fui con mi familia y todos disfrutamos muchísimo.', fecha: '2023-06-24' },
  { nombre: 'Julio Terrazas', obra: 'Tartufo', calif: 4, texto: 'Una comedia afilada con excelente ritmo. Me reí de principio a fin.', fecha: '2022-11-12' }
];

const estrellasTexto = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function renderResenas() {
  const lista = $('#resenas-lista');
  if (!lista) return;
  const propias = leerStorage(CLAVE_RESENAS, []);
  const todas = [...propias, ...RESENAS_BASE];

  lista.replaceChildren();
  todas.forEach((r, i) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'resena card' + (i < propias.length ? ' resena--nueva' : '');
    tarjeta.innerHTML = `
      <span class="resena__estrellas" aria-label="${r.calif} de 5 estrellas">${estrellasTexto(r.calif)}</span>
      <p class="resena__texto">“${escapar(r.texto)}”</p>
      <p class="resena__pie"><strong>${escapar(r.nombre)}</strong> · ${escapar(r.obra)}</p>`;
    lista.append(tarjeta);
  });

  const promedio = todas.reduce((s, r) => s + r.calif, 0) / todas.length;
  $('#resenas-promedio').textContent = promedio.toFixed(1);
  $('#resenas-estrellas').textContent = estrellasTexto(Math.round(promedio));
  $('#resenas-total').textContent = `(${todas.length} reseñas)`;
}

/* Reservas del usuario que aún no tienen reseña */
function reservasParaResenar() {
  const usadas = new Set(leerStorage(CLAVE_RESENAS, []).map((r) => r.codigo).filter(Boolean));
  return leerStorage(CLAVE_TICKETS, []).filter((t) => !usadas.has(t.codigo));
}

function actualizarFormResena() {
  const form = $('#form-resena');
  if (!form) return;

  const select = $('#res-reserva');
  const disponibles = reservasParaResenar();
  const hayTickets = leerStorage(CLAVE_TICKETS, []).length > 0;

  select.replaceChildren(new Option(disponibles.length ? 'Selecciona tu reserva…' : 'Sin reservas disponibles', ''));
  disponibles.forEach((t) => select.add(new Option(`${t.obra} · ${t.funcion} (${t.codigo})`, t.codigo)));
  $('#res-nombre').value = '';
  $$('.is-invalid', form).forEach((c) => c.classList.remove('is-invalid'));

  const aviso = $('#resena-aviso');
  aviso.hidden = disponibles.length > 0;
  $('span', aviso).textContent = hayTickets
    ? 'Ya reseñaste todas tus reservas. Reserva otra función para opinar de nuevo.'
    : 'Para reseñar una obra primero debes tener una reserva confirmada.';

  // Sin reservas disponibles, el formulario queda bloqueado
  $$('input, select, textarea, button', form).forEach((c) => { c.disabled = disponibles.length === 0; });
}

function initResenas() {
  const form = $('#form-resena');
  if (!form) return;
  renderResenas();
  actualizarFormResena();

  const texto = $('#res-texto');
  texto.addEventListener('input', () => { $('#res-contador').textContent = `${texto.value.length}/200`; });

  $('#res-reserva').addEventListener('change', (e) => {
    const ticket = leerStorage(CLAVE_TICKETS, []).find((t) => t.codigo === e.target.value);
    $('#res-nombre').value = ticket ? ticket.nombre : '';
    ponerError(e.target, '');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const select = $('#res-reserva');
    const radio = $('input[name="calif"]:checked', form);
    texto.value = texto.value.trim();

    const okReserva = validarCampo(select, { vacio: 'Elige la reserva de la obra que quieres reseñar.' });
    const ticket = leerStorage(CLAVE_TICKETS, []).find((t) => t.codigo === select.value);

    // Revalida contra las reservas guardadas (no basta con lo que muestra el select)
    if (okReserva && !ticket) { ponerError(select, 'No encontramos esa reserva.'); return; }
    if (okReserva && leerStorage(CLAVE_RESENAS, []).some((r) => r.codigo === ticket.codigo)) {
      ponerError(select, 'Ya reseñaste esta reserva.');
      return;
    }

    const okTexto = validarCampo(texto, { vacio: 'Escribe tu opinión.', corto: 'Mínimo 10 caracteres.' });
    const errorEst = $('.estrellas .campo__error', form);
    errorEst.textContent = radio ? '' : 'Elige una calificación.';
    errorEst.hidden = Boolean(radio);

    if (!(okReserva && okTexto && radio)) return;

    const propias = leerStorage(CLAVE_RESENAS, []);
    propias.unshift({
      codigo: ticket.codigo, nombre: ticket.nombre, obra: ticket.obra,
      calif: Number(radio.value), texto: texto.value, fecha: new Date().toISOString().slice(0, 10)
    });
    guardarStorage(CLAVE_RESENAS, propias.slice(0, 20));

    form.reset();
    $('#res-contador').textContent = '0/200';
    renderResenas();
    actualizarFormResena();
    toast('¡Gracias por tu reseña!');
  });
}

/* ===== RF-04: talleres con <dialog> ===== */
const CLAVE_INSCRIPCIONES = 'teatroUCB.inscripciones';

function actualizarCupos() {
  const inscritos = leerStorage(CLAVE_INSCRIPCIONES, []);
  $$('.taller').forEach((taller) => {
    const total = Number(taller.dataset.cupos);
    const usados = inscritos.filter((i) => i.taller === taller.dataset.id).length;
    const libres = Math.max(total - usados, 0);
    $('[data-cupos-texto]', taller).textContent = libres > 0 ? `${libres} de ${total} cupos disponibles` : 'Cupos agotados';
    $('[data-barra]', taller).style.width = `${(usados / total) * 100}%`;
    taller.classList.toggle('is-agotado', libres === 0);
    const boton = $('[data-inscribir]', taller);
    boton.disabled = libres === 0;
    boton.textContent = libres === 0 ? 'Sin cupos' : 'Inscribirme';
  });
}

function initTalleres() {
  const modal = $('#modal-taller');
  if (!modal) return;
  const form = $('#form-taller');
  let tallerActual = null;

  actualizarCupos();

  $$('[data-inscribir]').forEach((boton) => {
    boton.addEventListener('click', () => {
      tallerActual = boton.closest('.taller');
      form.reset();
      $$('.campo__error', form).forEach((e) => { e.hidden = true; });
      $$('.is-invalid', form).forEach((c) => c.classList.remove('is-invalid'));
      $('#modal-cuerpo').hidden = false;
      $('#modal-exito').hidden = true;
      $('#modal-titulo').textContent = 'Inscripción';
      $('#modal-taller-nombre').textContent = $('h3', tallerActual).textContent;
      modal.showModal();
      $('#t-nombre').focus();
    });
  });

  $$('[data-cerrar]', modal).forEach((b) => b.addEventListener('click', () => modal.close()));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  // Solo dígitos en el teléfono
  $('#t-telefono').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = $('#t-nombre');
    nombre.value = nombre.value.trim().replace(/\s+/g, ' ');

    const campoCorreo = $('#t-correo');
    campoCorreo.value = campoCorreo.value.trim().toLowerCase();

    const resultados = [
      validarCampo(nombre, { vacio: 'Ingresa tu nombre completo.', formato: 'Solo letras y espacios.', corto: 'Mínimo 3 letras.' }),
      validarCampo(campoCorreo, { vacio: 'Ingresa tu correo institucional.', formato: 'Solo se aceptan correos @ucb.edu.bo (ej: nombre.apellido@ucb.edu.bo).' }),
      validarCampo($('#t-telefono'), { vacio: 'Ingresa tu teléfono.', formato: 'Debe tener 8 dígitos y empezar con 6 o 7.' }),
      validarCampo($('#t-edad'), { vacio: 'Ingresa tu edad.', rango: 'La edad debe estar entre 14 y 99.' }),
      validarCampo($('#t-experiencia'), { vacio: 'Selecciona tu nivel.' })
    ];
    const acepto = $('#t-acepto');
    const errorAcepto = $('#error-acepto');
    errorAcepto.textContent = acepto.checked ? '' : 'Debes aceptar las condiciones.';
    errorAcepto.hidden = acepto.checked;
    resultados.push(acepto.checked);

    if (resultados.includes(false)) {
      const primero = $('.is-invalid', form);
      if (primero) primero.focus();
      return;
    }

    const inscritos = leerStorage(CLAVE_INSCRIPCIONES, []);
    const id = tallerActual.dataset.id;
    const correo = $('#t-correo').value.trim().toLowerCase();

    if (inscritos.some((i) => i.taller === id && i.correo === correo)) {
      ponerError($('#t-correo'), 'Este correo ya está inscrito en este taller.');
      $('#t-correo').focus();
      return;
    }

    inscritos.push({
      taller: id, nombre: nombre.value, correo,
      telefono: $('#t-telefono').value, edad: Number($('#t-edad').value),
      experiencia: $('#t-experiencia').value, fecha: new Date().toISOString()
    });
    guardarStorage(CLAVE_INSCRIPCIONES, inscritos);

    $('#modal-cuerpo').hidden = true;
    $('#modal-exito').hidden = false;
    $('#modal-titulo').textContent = 'Listo';
    $('#modal-exito-texto').textContent =
      `${nombre.value.split(' ')[0]}, quedaste inscrito en "${$('h3', tallerActual).textContent}". Te contactaremos a ${correo}.`;
    actualizarCupos();
    toast('Inscripción registrada');
  });
}

/* ===== Mis reservas ===== */
const CLAVE_TICKETS = 'teatroUCB.tickets';

function renderMisReservas() {
  const lista = $('#mis-reservas-lista');
  if (!lista) return;
  const tickets = leerStorage(CLAVE_TICKETS, []);
  lista.replaceChildren();

  if (tickets.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'reservas-vacio';
    vacio.textContent = 'Aún no tienes reservas. Elige una obra en la cartelera y selecciona tus butacas.';
    lista.append(vacio);
    return;
  }

  tickets.forEach((t) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'ticket card';
    tarjeta.innerHTML = `
      <span class="ticket__codigo">${escapar(t.codigo)}</span>
      <h3>${escapar(t.obra)}</h3>
      <p class="ticket__datos">${escapar(t.funcion)}</p>
      <p class="ticket__datos">Butacas: ${escapar(t.asientos.join(', '))}</p>
      <p class="ticket__datos">A nombre de: ${escapar(t.nombre)}</p>
      <p class="ticket__total">Total: Bs ${t.total}</p>`;
    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'btn btn--outline';
    cancelar.textContent = 'Cancelar reserva';
    cancelar.addEventListener('click', () => cancelarTicket(t.codigo));
    tarjeta.append(cancelar);
    lista.append(tarjeta);
  });
}

function guardarTicket(ticket) {
  const tickets = leerStorage(CLAVE_TICKETS, []);
  tickets.unshift(ticket);
  guardarStorage(CLAVE_TICKETS, tickets);
  renderMisReservas();
  actualizarFormResena();
}

function cancelarTicket(codigo) {
  const tickets = leerStorage(CLAVE_TICKETS, []);
  const ticket = tickets.find((t) => t.codigo === codigo);
  if (!ticket) return;
  if (!confirm(`¿Cancelar la reserva ${codigo}? Las butacas quedarán libres.`)) return;

  const reservas = leerStorage(CLAVE_RESERVAS, {});
  reservas[ticket.funcionId] = (reservas[ticket.funcionId] || []).filter((id) => !ticket.asientos.includes(id));
  guardarStorage(CLAVE_RESERVAS, reservas);
  guardarStorage(CLAVE_TICKETS, tickets.filter((t) => t.codigo !== codigo));
  guardarStorage(CLAVE_RESENAS, leerStorage(CLAVE_RESENAS, []).filter((r) => r.codigo !== codigo));

  renderMisReservas();
  renderResenas();
  actualizarFormResena();
  if (reserva.funcionId) { renderMapa(); actualizarResumen(); }
  toast(`Reserva ${codigo} cancelada`);
}

/* ===== Navegación: menú móvil, enlace activo, volver arriba, contadores ===== */
function initNavegacion() {
  const toggle = $('#nav-toggle');
  const nav = $('#nav-principal');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const abierto = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(abierto));
      toggle.textContent = abierto ? '✕' : '☰';
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    }));
  }

  // Enlace activo según la sección visible
  const enlaces = $$('.main-nav a');
  const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) {
          enlaces.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secciones.forEach((s) => obs.observe(s));
  }

  // Botón volver arriba
  const arriba = $('#btn-arriba');
  if (arriba) {
    window.addEventListener('scroll', () => { arriba.hidden = window.scrollY < 600; }, { passive: true });
    arriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

function initContadores() {
  const numeros = $$('[data-contar]');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  numeros.forEach((el) => {
    const meta = Number(el.dataset.contar);
    if (reducido) { el.textContent = meta; return; }
    const inicio = performance.now();
    const duracion = 1800;
    (function paso(ahora) {
      const t = Math.min((ahora - inicio) / duracion, 1);
      el.textContent = Math.round(meta * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(paso);
    })(inicio);
  });
}

/* ===== RF-02: reserva de entradas y mapa de sillas ===== */
const BUTACAS_POR_FILA = 12;
const MAX_SELECCION = 6;
const CLAVE_RESERVAS = 'teatroUCB.reservas';
const CLAVE_SELECCION = 'teatroUCB.seleccion';

const FILAS = [
  ...['A', 'B'].map((letra) => ({ letra, zona: 'Platea VIP', clave: 'vip', precio: 80 })),
  ...['C', 'D', 'E', 'F'].map((letra) => ({ letra, zona: 'Platea', clave: 'platea', precio: 60 })),
  ...['G', 'H'].map((letra) => ({ letra, zona: 'Balcón', clave: 'balcon', precio: 40 }))
];

const reserva = {
  cartelera: [],
  funcionId: null,
  obra: '',
  funcion: '',
  seleccion: new Set()
};

/* --- Almacenamiento seguro --- */
function leerStorage(clave, defecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : defecto;
  } catch (e) {
    return defecto;
  }
}
function guardarStorage(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
}

/* --- Butacas ocupadas de forma determinista por función --- */
function hash(texto) {
  let h = 2166136261;
  for (const c of texto) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function generador(semilla) {
  return function () {
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function butacasOcupadas(funcionId) {
  const rnd = generador(hash(funcionId));
  const ocupadas = new Set();
  FILAS.forEach((fila) => {
    for (let n = 1; n <= BUTACAS_POR_FILA; n++) {
      if (rnd() < 0.22) ocupadas.add(`${fila.letra}${n}`);
    }
  });
  const guardadas = leerStorage(CLAVE_RESERVAS, {})[funcionId] || [];
  guardadas.forEach((id) => ocupadas.add(id));
  return ocupadas;
}

/* --- Datos de butacas --- */
function infoButaca(id) {
  return FILAS.find((f) => f.letra === id[0]);
}
function ordenarButacas(a, b) {
  return a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1));
}
function etiquetaButaca(id, estado) {
  const fila = infoButaca(id);
  return `Fila ${id[0]}, butaca ${id.slice(1)}, ${fila.zona}, Bs ${fila.precio}, ${estado}`;
}

/* --- Lectura de la cartelera (única fuente de datos) --- */
function leerCartelera() {
  return $$('.obra').map((obra) => ({
    nombre: $('h3', obra).textContent.trim(),
    funciones: $$('.funciones time', obra).map((t) => ({
      iso: t.dateTime,
      texto: t.textContent.trim()
    }))
  }));
}

function llenarObras() {
  const select = $('#sel-obra');
  select.replaceChildren();
  reserva.cartelera.forEach((obra, i) => select.add(new Option(obra.nombre, String(i))));
}

function llenarFunciones() {
  const selObra = $('#sel-obra');
  const selFuncion = $('#sel-funcion');
  const obra = reserva.cartelera[Number(selObra.value)];
  const ahora = new Date();
  let primera = null;

  selFuncion.replaceChildren();
  obra.funciones.forEach((f) => {
    const pasada = new Date(f.iso) < ahora;
    const opcion = new Option(pasada ? `${f.texto} (finalizada)` : f.texto, f.iso);
    opcion.disabled = pasada;
    selFuncion.add(opcion);
    if (!pasada && primera === null) primera = f.iso;
  });

  if (primera) {
    selFuncion.value = primera;
  } else {
    selFuncion.replaceChildren(new Option('Sin funciones disponibles', ''));
  }
}

/* --- Selección persistente --- */
function guardarSeleccion() {
  guardarStorage(CLAVE_SELECCION, {
    funcionId: reserva.funcionId,
    asientos: [...reserva.seleccion]
  });
}

function cambiarFuncion() {
  const obra = reserva.cartelera[Number($('#sel-obra').value)];
  const iso = $('#sel-funcion').value;
  const opcion = $('#sel-funcion').selectedOptions[0];

  reserva.obra = obra.nombre;
  reserva.funcion = iso ? opcion.textContent : '';
  reserva.funcionId = iso ? `${obra.nombre}|${iso}` : null;
  reserva.seleccion = new Set();

  if (reserva.funcionId) {
    const guardada = leerStorage(CLAVE_SELECCION, null);
    if (guardada && guardada.funcionId === reserva.funcionId) {
      const ocupadas = butacasOcupadas(reserva.funcionId);
      guardada.asientos.filter((id) => !ocupadas.has(id)).forEach((id) => reserva.seleccion.add(id));
    }
  }

  mostrarEstado('');
  renderMapa();
  actualizarResumen();
}

function seleccionarObraPorNombre(nombre) {
  const indice = reserva.cartelera.findIndex((o) => o.nombre === nombre);
  if (indice < 0) return;
  $('#sel-obra').value = String(indice);
  llenarFunciones();
  cambiarFuncion();
}

/* --- Render del mapa --- */
function renderMapa() {
  const mapa = $('#mapa-sillas');
  mapa.replaceChildren();

  if (!reserva.funcionId) {
    mapa.textContent = 'Selecciona una obra con funciones disponibles.';
    return;
  }

  const ocupadas = butacasOcupadas(reserva.funcionId);

  FILAS.forEach((fila, indice) => {
    // Título de zona al comenzar cada zona
    if (indice === 0 || FILAS[indice - 1].clave !== fila.clave) {
      const titulo = document.createElement('p');
      titulo.className = 'zona-titulo';
      titulo.dataset.zona = fila.clave;
      titulo.textContent = `${fila.zona} · Bs ${fila.precio}`;
      mapa.append(titulo);
    }

    const filaEl = document.createElement('div');
    filaEl.className = 'fila';
    filaEl.setAttribute('role', 'group');
    filaEl.setAttribute('aria-label', `Fila ${fila.letra}, ${fila.zona}`);

    const letra = document.createElement('span');
    letra.className = 'fila__letra';
    letra.setAttribute('aria-hidden', 'true');
    letra.textContent = fila.letra;
    filaEl.append(letra);

    for (let n = 1; n <= BUTACAS_POR_FILA; n++) {
      const id = `${fila.letra}${n}`;
      const ocupada = ocupadas.has(id);
      const elegida = reserva.seleccion.has(id);
      const estado = ocupada ? 'ocupada' : elegida ? 'seleccionada' : 'disponible';

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `seat seat--${estado}`;
      if (n === BUTACAS_POR_FILA / 2 + 1) boton.classList.add('seat--pasillo');
      boton.dataset.id = id;
      boton.dataset.zona = fila.clave;
      boton.dataset.tip = `${fila.zona} · Fila ${fila.letra}, butaca ${n} · Bs ${fila.precio}`;
      boton.disabled = ocupada;
      boton.textContent = ocupada ? '✕' : String(n);
      boton.setAttribute('aria-pressed', String(elegida));
      boton.setAttribute('aria-label', etiquetaButaca(id, estado));
      filaEl.append(boton);
    }
    mapa.append(filaEl);
  });
}

/* --- Interacción con una butaca --- */
function alternarButaca(boton) {
  const id = boton.dataset.id;

  if (reserva.seleccion.has(id)) {
    reserva.seleccion.delete(id);
  } else {
    if (reserva.seleccion.size >= MAX_SELECCION) {
      mostrarEstado(`Máximo ${MAX_SELECCION} butacas por reserva.`, true);
      return;
    }
    reserva.seleccion.add(id);
  }

  const activa = reserva.seleccion.has(id);
  boton.classList.toggle('seat--seleccionada', activa);
  boton.classList.toggle('seat--disponible', !activa);
  boton.setAttribute('aria-pressed', String(activa));
  boton.setAttribute('aria-label', etiquetaButaca(id, activa ? 'seleccionada' : 'disponible'));

  guardarSeleccion();
  mostrarEstado('');
  actualizarResumen();
}

/* --- Resumen --- */
function mostrarEstado(texto, esError = false) {
  const estado = $('#resumen-estado');
  estado.textContent = texto;
  estado.classList.toggle('is-error', esError);
}

function actualizarResumen() {
  const lista = $('#resumen-lista');
  lista.replaceChildren();
  let total = 0;

  const asientos = [...reserva.seleccion].sort(ordenarButacas);
  if (asientos.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'vacio';
    vacio.textContent = 'Aún no seleccionaste butacas.';
    lista.append(vacio);
  }
  asientos.forEach((id) => {
    const fila = infoButaca(id);
    total += fila.precio;
    const item = document.createElement('li');
    item.textContent = `${id} · ${fila.zona} · Bs ${fila.precio}`;
    lista.append(item);
  });

  $('#resumen-obra').textContent = reserva.obra;
  $('#resumen-funcion').textContent = reserva.funcion;
  $('#resumen-total').textContent = `Bs ${total}`;
  $('#btn-confirmar').disabled = asientos.length === 0;
  $('#btn-limpiar').disabled = asientos.length === 0;
}

/* --- Validación del nombre --- */
function validarNombre() {
  const campo = $('#nombre');
  const error = $('#error-nombre');
  campo.value = campo.value.trim().replace(/\s+/g, ' ');

  let mensaje = '';
  if (campo.validity.valueMissing) {
    mensaje = 'Ingresa tu nombre completo.';
  } else if (campo.validity.tooShort || campo.validity.patternMismatch) {
    mensaje = 'Usa solo letras y espacios (mínimo 3 caracteres).';
  }

  campo.classList.toggle('is-invalid', Boolean(mensaje));
  campo.setAttribute('aria-invalid', String(Boolean(mensaje)));
  error.textContent = mensaje;
  error.hidden = !mensaje;
  if (mensaje) campo.focus();
  return !mensaje;
}

/* --- Confirmación --- */
function confirmarReserva(evento) {
  evento.preventDefault();

  if (!reserva.funcionId || reserva.seleccion.size === 0) {
    mostrarEstado('Selecciona al menos una butaca.', true);
    return;
  }
  if (!validarNombre()) return;

  const nombre = $('#nombre').value;
  const asientos = [...reserva.seleccion].sort(ordenarButacas);
  const total = asientos.reduce((suma, id) => suma + infoButaca(id).precio, 0);

  const reservas = leerStorage(CLAVE_RESERVAS, {});
  reservas[reserva.funcionId] = [...(reservas[reserva.funcionId] || []), ...asientos];
  guardarStorage(CLAVE_RESERVAS, reservas);

  const codigo = 'TUCB-' + hash(reserva.funcionId + asientos.join() + nombre + Date.now())
    .toString(36).toUpperCase().slice(0, 6);

  guardarTicket({
    codigo, funcionId: reserva.funcionId, obra: reserva.obra, funcion: reserva.funcion,
    asientos, nombre, total, fecha: new Date().toISOString()
  });
  toast(`Reserva ${codigo} confirmada`);

  reserva.seleccion.clear();
  guardarSeleccion();
  $('#nombre').value = '';
  renderMapa();
  actualizarResumen();
  mostrarEstado(
    `¡Reserva confirmada, ${nombre.split(' ')[0]}! Código ${codigo} · ` +
    `Butacas ${asientos.join(', ')} · Total Bs ${total}.`
  );
}

/* --- Inicio del módulo --- */
function initReserva() {
  const form = $('#form-reserva');
  if (!form) return;

  reserva.cartelera = leerCartelera();
  llenarObras();
  llenarFunciones();
  cambiarFuncion();

  let previa = null;
  try { previa = sessionStorage.getItem('obraSeleccionada'); } catch (e) { /* ignorar */ }
  if (previa) seleccionarObraPorNombre(previa);

  $('#sel-obra').addEventListener('change', () => {
    llenarFunciones();
    cambiarFuncion();
  });
  $('#sel-funcion').addEventListener('change', cambiarFuncion);

  $('#mapa-sillas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.seat');
    if (boton && !boton.disabled) alternarButaca(boton);
  });

  // Al pulsar "Reservar butacas" en la cartelera se preselecciona la obra
  $$('.btn[data-obra]').forEach((boton) => {
    boton.addEventListener('click', () => seleccionarObraPorNombre(boton.dataset.obra));
  });

  $('#nombre').addEventListener('input', () => {
    $('#nombre').classList.remove('is-invalid');
    $('#error-nombre').hidden = true;
  });

  form.addEventListener('submit', confirmarReserva);

  $('#btn-limpiar').addEventListener('click', () => {
    reserva.seleccion.clear();
    guardarSeleccion();
    renderMapa();
    actualizarResumen();
    mostrarEstado('');
  });

  $('#btn-reiniciar').addEventListener('click', () => {
    if (!reserva.funcionId) return;
    const reservas = leerStorage(CLAVE_RESERVAS, {});
    delete reservas[reserva.funcionId];
    guardarStorage(CLAVE_RESERVAS, reservas);
    reserva.seleccion.clear();
    guardarSeleccion();
    renderMapa();
    actualizarResumen();
    mostrarEstado('Reservas de esta función reiniciadas.');
  });
}
/* ===== Header: se oculta al bajar y reaparece al subir ===== */
function initHeaderAutoOcultar() {
  const header = $('.site-header');
  if (!header) return;
  let ultimo = window.scrollY;
  let esperando = false;

  window.addEventListener('scroll', () => {
    if (esperando) return;
    esperando = true;
    requestAnimationFrame(() => {
      const actual = window.scrollY;
      const delta = actual - ultimo;
      const menuAbierto = $('#nav-principal')?.classList.contains('is-open');

      if (actual < 80 || menuAbierto) header.classList.remove('is-hidden');
      else if (delta > 6) header.classList.add('is-hidden');
      else if (delta < -6) header.classList.remove('is-hidden');

      if (Math.abs(delta) > 6) ultimo = actual;
      esperando = false;
    });
  }, { passive: true });

  // Con el teclado, el header siempre vuelve a mostrarse
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}

/* ===== Tooltip de butacas (mouse y teclado) ===== */
function initTooltipButacas() {
  const mapa = $('#mapa-sillas');
  if (!mapa) return;

  const tip = document.createElement('div');
  tip.className = 'tooltip-butaca';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);

  const mostrar = (boton) => {
    tip.textContent = boton.dataset.tip;
    tip.dataset.zona = boton.dataset.zona;
    tip.hidden = false;
    const r = boton.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const x = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, window.innerWidth - t.width - 8));
    const y = r.top - t.height - 8 < 8 ? r.bottom + 8 : r.top - t.height - 8;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  const ocultar = () => { tip.hidden = true; };

  mapa.addEventListener('mouseover', (e) => { const b = e.target.closest('.seat[data-tip]'); if (b) mostrar(b); });
  mapa.addEventListener('mouseout', ocultar);
  mapa.addEventListener('focusin', (e) => { const b = e.target.closest('.seat[data-tip]'); if (b) mostrar(b); });
  mapa.addEventListener('focusout', ocultar);
  window.addEventListener('scroll', ocultar, { passive: true });
}
/* ===== Inicio ===== */
document.addEventListener('DOMContentLoaded', () => {
  initAnio();
  initNavegacion();
  initHeaderAutoOcultar();
  initContadores();
  initFiltros();
  initProximaFuncion();
  initBotonesReserva();
  initReserva();
  initTooltipButacas();
  renderMisReservas();
  initLightbox();
  initResenas();
  initTalleres();
  initReveal();
});
