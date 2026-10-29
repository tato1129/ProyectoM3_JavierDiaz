import { h } from '../utils/dom.js';
import { CHARACTERS, getCharacter } from '../data/characters.js';
import { getLastCharacter, hasHistory } from '../store.js';

export function HomeView() {
  const last = getCharacter(getLastCharacter());
  const canResume = Boolean(last) && hasHistory(last.id);

  return h(
    'div',
    { class: 'page' },

    h(
      'section',
      { class: 'hero' },
      h('p', { class: 'hero__eyebrow' }, 'Recreaciones con inteligencia artificial'),
      h('h1', { class: 'hero__title' }, 'Charlá con quienes hicieron historia'),
      h(
        'p',
        { class: 'hero__lead' },
        'Elegí un personaje argentino y conversá como si lo tuvieras enfrente: respuestas cortas, con su personalidad y su manera de hablar.',
      ),
      h(
        'div',
        { class: 'hero__actions' },
        h('a', { class: 'btn btn--gold', href: '/characters', 'data-link': true }, 'Empezar a chatear'),
        canResume &&
          h(
            'a',
            { class: 'btn btn--ghost-light', href: `/chat?personaje=${last.id}`, 'data-link': true },
            `Seguir con ${last.shortName}`,
          ),
      ),
    ),

    h(
      'section',
      { class: 'section' },
      h('h2', { class: 'section__title' }, 'Tres voces, tres épocas'),
      h('p', { class: 'section__lead' }, 'Cada personaje responde con su propio estilo y conocimiento.'),
      h(
        'div',
        { class: 'mini-list' },
        CHARACTERS.map((character) =>
          h(
            'a',
            {
              class: 'mini',
              href: `/chat?personaje=${character.id}`,
              'data-link': true,
              style: `--accent:${character.accent}`,
            },
            h('span', { class: 'avatar', 'aria-hidden': 'true' }, character.emoji),
            h(
              'span',
              { class: 'mini__text' },
              h('strong', { class: 'mini__name' }, character.name),
              h('span', { class: 'mini__desc' }, character.description),
            ),
          ),
        ),
      ),
    ),

    h(
      'section',
      { class: 'section' },
      h('h2', { class: 'section__title' }, 'Cómo funciona'),
      h(
        'ol',
        { class: 'steps' },
        h('li', {}, h('strong', {}, 'Elegí un personaje'), ' en la galería.'),
        h('li', {}, h('strong', {}, 'Escribile'), ' lo que quieras: te contesta en su estilo.'),
        h('li', {}, h('strong', {}, 'Volvé cuando quieras'), ': tu conversación queda guardada en este navegador.'),
      ),
    ),
  );
}
