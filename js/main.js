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

/* ===== Inicio ===== */
document.addEventListener('DOMContentLoaded', () => {
  initAnio();
  initFiltros();
  initProximaFuncion();
  initBotonesReserva();
  initReveal();
});