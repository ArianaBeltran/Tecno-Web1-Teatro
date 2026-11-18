# 🎭 Portal Web Teatro UCB

Proyecto 4 · Tecnologías Web I · Universidad Católica Boliviana

Portal de la Compañía de Teatro UCB para difusión de cartelera, reserva de butacas y archivo histórico.

🔗 **Demo:** https://TU_USUARIO.github.io/teatro-ucb/

## Requerimientos funcionales
| RF | Módulo | Implementación |
|---|---|---|
| RF-01 | Cartelera | Fechas, sinopsis, dramaturgos, avances en video, filtros por género |
| RF-02 | Reserva y mapa de sillas | Mapa interactivo (Disponible / Ocupada / Seleccionada), resumen en Bs, mis reservas |
| RF-03 | Galería y obras pasadas | `<picture>` adaptativo (WebP/JPG), lightbox, reseñas del público |
| RF-04 | Talleres y convocatorias | Modal nativo `<dialog>`, validación, control de cupos |

## UI/UX y técnica
- Estética teatral: fondo `#121212`, telón `#800020`, dorado `#D4AF37`
- Acordeón nativo `<details>` / `<summary>`
- HTML5 semántico: `header`, `nav`, `main`, `section`, `article`, `footer`
- CSS3 modular con Custom Properties, Flexbox, Grid y Media Queries
- JavaScript ES6+ (Vanilla), validación con Constraint Validation API
- Accesibilidad: roles ARIA, foco visible, navegación por teclado, `prefers-reduced-motion`

## Estructura
​```
teatro-ucb/
├── index.html
├── 404.html
├── css/  (variables, base, layout, components, styles)
├── js/main.js
└── assets/ (images, icons, videos)
​```

## Ejecución local
Abrir con la extensión **Live Server** de VS Code.

## Autora
Ilsen Ariana Beltrán Soliz