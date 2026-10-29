import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getCharacter } from '../data/characters.js';
import { MAX_INPUT_CHARS, getSession } from '../chatSession.js';
import { getLastCharacter, setLastCharacter } from '../store.js';
import { formatTime } from '../utils/format.js';
import { copyText } from '../utils/clipboard.js';

function EmptyChat() {
  return h(
    'div',
    { class: 'page page--narrow' },
    h(
      'div',
      { class: 'empty' },
      h('h1', { class: 'page__title' }, 'Elegí con quién charlar'),
      h('p', { class: 'page__lead' }, 'Todavía no seleccionaste ningún personaje.'),
      h('a', { class: 'btn btn--primary', href: '/characters', 'data-link': true }, 'Ver personajes'),
    ),
  );
}

export function ChatView({ params, onCleanup }) {
  const character = getCharacter(params.get('personaje')) ?? getCharacter(getLastCharacter());
  if (!character) return EmptyChat();

  setLastCharacter(character.id);
  const session = getSession(character.id);

  // ---------- Encabezado ----------
  const statusEl = h('span', { class: 'chat__status' });
  // En celulares se oculta la palabra "Historial" para que el nombre del personaje tenga lugar.
  const savedCount = document.createTextNode('');
  const savedLabel = h(
    'span',
    { class: 'pill__label' },
    h('span', { class: 'pill__extra' }, 'Historial '),
    'guardado · ',
    savedCount,
  );
  const savedPill = h(
    'span',
    { class: 'pill', title: 'Tu conversación se guarda en este navegador', hidden: true },
    h('span', { class: 'pill__dot', 'aria-hidden': 'true' }),
    savedLabel,
  );
  const clearBtn = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: 'Borrar historial',
      'aria-label': 'Borrar historial de esta conversación',
      onClick: onClear,
    },
    icon('trash'),
  );

  const head = h(
    'div',
    { class: 'chat__head' },
    h(
      'a',
      {
        class: 'icon-btn',
        href: '/characters',
        'data-link': true,
        title: 'Cambiar de personaje',
        'aria-label': 'Cambiar de personaje',
      },
      icon('back'),
    ),
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, character.emoji),
    h('div', { class: 'chat__who' }, h('h1', { class: 'chat__name' }, character.name), statusEl),
    h('div', { class: 'chat__tools' }, savedPill, clearBtn),
  );

  // ---------- Lista de mensajes ----------
  const list = h('div', {
    class: 'messages',
    role: 'log',
    'aria-live': 'polite',
    'aria-label': `Conversación con ${character.name}`,
  });

  // ---------- Sugerencias ----------
  const chips = h(
    'div',
    { class: 'chips', 'aria-label': 'Sugerencias para empezar' },
    character.suggestions.map((text) => h('button', { class: 'chip', type: 'button', onClick: () => submit(text) }, text)),
  );

  // ---------- Formulario ----------
  const input = h('textarea', {
    class: 'composer__input',
    rows: 1,
    maxlength: MAX_INPUT_CHARS,
    placeholder: `Escribile a ${character.shortName}…`,
    'aria-label': 'Escribí tu mensaje',
    enterkeyhint: 'send',
    autocomplete: 'off',
    onInput: () => {
      autosize();
      updateSendState();
    },
    onKeydown: (event) => {
      // Enter envía; Shift+Enter agrega un salto de línea.
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        submit();
      }
    },
  });
  const sendBtn = h(
    'button',
    { class: 'composer__send', type: 'submit', 'aria-label': 'Enviar mensaje', title: 'Enviar' },
    icon('send'),
  );
  const form = h(
    'form',
    {
      class: 'composer',
      onSubmit: (event) => {
        event.preventDefault();
        submit();
      },
    },
    input,
    sendBtn,
  );

  const root = h('section', { class: 'chat', style: `--accent:${character.accent}` }, head, list, chips, form);

  // ---------- Comportamiento ----------
  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function updateSendState() {
    sendBtn.disabled = session.sending || input.value.trim() === '';
  }

  function scrollToBottom() {
    list.scrollTop = list.scrollHeight;
  }

  function submit(text = input.value) {
    if (session.sending) return;
    const value = String(text).trim();
    if (!value) return;
    input.value = '';
    autosize();
    session.send(value);
  }

  function onClear() {
    if (!session.messages.length) return;
    const ok = window.confirm(`¿Borrar toda la conversación con ${character.shortName}? Esta acción no se puede deshacer.`);
    if (ok) session.clear();
  }

  function renderCopyContent(state) {
    const labels = { idle: 'Copiar', done: 'Copiado', fail: 'No se pudo' };
    return [
      icon(state === 'done' ? 'check' : 'copy', { size: 16 }),
      h('span', { class: 'msg__copy-label' }, labels[state]),
    ];
  }

  function renderCopyButton(text) {
    const button = h('button', {
      class: 'msg__copy',
      type: 'button',
      title: 'Copiar respuesta',
      'aria-label': 'Copiar respuesta',
    });
    button.replaceChildren(...renderCopyContent('idle'));
    button.addEventListener('click', async () => {
      const ok = await copyText(text);
      button.replaceChildren(...renderCopyContent(ok ? 'done' : 'fail'));
      setTimeout(() => button.replaceChildren(...renderCopyContent('idle')), 1600);
    });
    return button;
  }

  function renderMessage(message) {
    const isUser = message.role === 'user';
    const meta = h(
      'div',
      { class: 'msg__meta' },
      h('time', { class: 'msg__time', datetime: new Date(message.ts).toISOString() }, formatTime(message.ts)),
      !isUser && renderCopyButton(message.text),
    );
    return h(
      'article',
      { class: `msg ${isUser ? 'msg--user' : 'msg--model'}`, 'data-id': message.id },
      h('span', { class: 'sr-only' }, isUser ? 'Vos: ' : `${character.shortName}: `),
      h('div', { class: 'msg__bubble' }, message.text),
      meta,
    );
  }

  function renderGreeting() {
    return h(
      'article',
      { class: 'msg msg--model msg--greeting' },
      h('span', { class: 'sr-only' }, `${character.shortName}: `),
      h('div', { class: 'msg__bubble' }, character.greeting),
    );
  }

  function renderTyping() {
    return h(
      'div',
      { class: 'msg msg--model msg--typing', role: 'status', 'aria-label': `${character.shortName} está escribiendo` },
      h(
        'div',
        { class: 'msg__bubble typing' },
        h('span', { class: 'typing__dot' }),
        h('span', { class: 'typing__dot' }),
        h('span', { class: 'typing__dot' }),
      ),
    );
  }

  function renderError(message) {
    return h(
      'div',
      { class: 'error-box', role: 'alert' },
      h('p', { class: 'error-box__text' }, message),
      h('button', { class: 'btn btn--small', type: 'button', onClick: () => session.retry() }, 'Reintentar'),
    );
  }

  function render() {
    const messages = session.messages;
    const { sending, error } = session;

    statusEl.textContent = sending ? 'escribiendo…' : 'en línea';
    statusEl.classList.toggle('is-typing', sending);

    savedPill.hidden = messages.length === 0;
    savedCount.textContent = String(messages.length);
    clearBtn.disabled = messages.length === 0;
    chips.hidden = messages.length > 0 || sending;
    updateSendState();

    list.replaceChildren(
      ...[
        h(
          'p',
          { class: 'notice' },
          `Recreación ficticia hecha con IA: lo que responde ${character.shortName} no son sus palabras reales.`,
        ),
        renderGreeting(),
        ...messages.map(renderMessage),
        sending && renderTyping(),
        error && renderError(error),
      ].filter(Boolean),
    );

    scrollToBottom();
    (window.requestAnimationFrame ?? setTimeout)(scrollToBottom);
  }

  const unsubscribe = session.subscribe(render);
  onCleanup(unsubscribe);
  render();

  // En pantallas con mouse se enfoca el campo; en celulares no, para no abrir el teclado sin que lo pidan.
  setTimeout(() => {
    if (root.isConnected && window.matchMedia?.('(pointer: fine)').matches) input.focus({ preventScroll: true });
  }, 0);

  return root;
}
