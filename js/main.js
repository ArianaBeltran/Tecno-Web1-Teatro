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

/* ===== RF-02: reserva de entradas y mapa de sillas ===== */
const BUTACAS_POR_FILA = 12;
const MAX_SELECCION = 6;
const CLAVE_RESERVAS = 'teatroUCB.reservas';
const CLAVE_SELECCION = 'teatroUCB.seleccion';

const FILAS = [
  ...['A', 'B'].map((letra) => ({ letra, zona: 'Platea VIP', precio: 80 })),
  ...['C', 'D', 'E', 'F'].map((letra) => ({ letra, zona: 'Platea', precio: 60 })),
  ...['G', 'H'].map((letra) => ({ letra, zona: 'Balcón', precio: 40 }))
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

  FILAS.forEach((fila) => {
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
      boton.className = `seat seat--${ocupada ? 'ocupada' : elegida ? 'seleccionada' : 'disponible'}`;
      if (n === BUTACAS_POR_FILA / 2 + 1) boton.classList.add('seat--pasillo');
      boton.dataset.id = id;
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

/* ===== Inicio ===== */
document.addEventListener('DOMContentLoaded', () => {
  initAnio();
  initFiltros();
  initProximaFuncion();
  initBotonesReserva();
  initReserva();
  initReveal();
});