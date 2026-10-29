import { h } from '../utils/dom.js';
import { CHARACTERS } from '../data/characters.js';
import { loadHistory } from '../store.js';

export function CharactersView() {
  const cards = CHARACTERS.map((character) => {
    const count = loadHistory(character.id).length;

    return h(
      'article',
      { class: 'card', style: `--accent:${character.accent}`, 'data-character': character.id },
      h(
        'div',
        { class: 'card__top' },
        h('span', { class: 'avatar avatar--lg', 'aria-hidden': 'true' }, character.emoji),
        count > 0 && h('span', { class: 'badge' }, 'Conversación guardada'),
      ),
      h(
        'div',
        { class: 'card__body' },
        h('h2', { class: 'card__name' }, character.name),
        h('p', { class: 'card__meta' }, `${character.years} · ${character.role}`),
        h('p', { class: 'card__desc' }, character.description),
        h(
          'a',
          {
            class: 'btn btn--primary btn--block',
            href: `/chat?personaje=${character.id}`,
            'data-link': true,
          },
          count > 0 ? `Continuar con ${character.shortName}` : `Chatear con ${character.shortName}`,
        ),
      ),
    );
  });

  return h(
    'div',
    { class: 'page' },
    h('h1', { class: 'page__title' }, 'Elegí con quién charlar'),
    h('p', { class: 'page__lead' }, 'Cada personaje tiene su propia personalidad, su época y su forma de hablar.'),
    h('div', { class: 'cards' }, cards),
  );
}
