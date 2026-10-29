import { h } from '../utils/dom.js';
import { CHARACTERS } from '../data/characters.js';

export function AboutView() {
  return h(
    'div',
    { class: 'page page--narrow prose' },
    h('h1', { class: 'page__title' }, 'Acerca del proyecto'),
    h(
      'p',
      { class: 'page__lead' },
      '“Charlas con la Historia” es una aplicación web de una sola página (SPA) para conversar con recreaciones ficticias de tres figuras argentinas, generadas con inteligencia artificial.',
    ),

    h(
      'section',
      { class: 'info-card' },
      h('h2', {}, 'Los personajes'),
      h(
        'ul',
        {},
        CHARACTERS.map((character) =>
          h('li', {}, h('strong', {}, `${character.name} (${character.years})`), `: ${character.role}.`),
        ),
      ),
      h(
        'p',
        {},
        'Cada uno tiene su propio “prompt de sistema”, que define cómo habla, qué sabe, qué límites tiene y que debe responder corto, como en un chat.',
      ),
    ),

    h(
      'section',
      { class: 'info-card' },
      h('h2', {}, 'Cómo está hecha'),
      h(
        'ul',
        {},
        h('li', {}, h('strong', {}, 'Interfaz:'), ' JavaScript puro (módulos ES), HTML y CSS “mobile-first”.'),
        h('li', {}, h('strong', {}, 'Navegación:'), ' router propio con la History API (/home, /characters, /chat, /about).'),
        h('li', {}, h('strong', {}, 'IA:'), ' Google Gemini, consultado desde una función serverless de Vercel.'),
        h('li', {}, h('strong', {}, 'Pruebas:'), ' tests unitarios con Vitest.'),
      ),
    ),

    h(
      'section',
      { class: 'info-card' },
      h('h2', {}, 'Seguridad y privacidad'),
      h(
        'ul',
        {},
        h('li', {}, 'La API key de Gemini vive solo en el servidor: el navegador nunca la ve.'),
        h('li', {}, 'Tu conversación se guarda únicamente en este navegador (localStorage) y podés borrarla cuando quieras.'),
        h('li', {}, 'Los mensajes se envían a Gemini para generar las respuestas.'),
      ),
    ),

    h(
      'section',
      { class: 'info-card info-card--warn' },
      h('h2', {}, 'Un aviso importante'),
      h(
        'p',
        {},
        'Las respuestas son creadas por una IA a partir de datos históricos y pueden contener errores. No son declaraciones reales de los personajes: es un proyecto educativo y de entretenimiento.',
      ),
    ),

    h('a', { class: 'btn btn--primary', href: '/characters', 'data-link': true }, 'Elegir un personaje'),
  );
}
