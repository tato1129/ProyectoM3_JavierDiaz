import { h } from '../utils/dom.js';

export function NotFoundView() {
  return h(
    'div',
    { class: 'page page--narrow' },
    h(
      'div',
      { class: 'empty' },
      h('h1', { class: 'page__title' }, 'No encontramos esa página'),
      h('p', { class: 'page__lead' }, 'La dirección que abriste no existe en esta aplicación.'),
      h('a', { class: 'btn btn--primary', href: '/home', 'data-link': true }, 'Volver al inicio'),
    ),
  );
}
