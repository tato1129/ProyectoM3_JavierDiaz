import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from '../src/views/chat.js';
import { resetSessions } from '../src/chatSession.js';
import { resetCache } from '../src/store.js';

const flush = async () => {
  for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

function mockFetch(status, body) {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mountChat(character = 'maradona') {
  const root = ChatView({ params: new URLSearchParams(`personaje=${character}`), onCleanup: () => {} });
  document.body.append(root);
  return root;
}

function type(root, text) {
  const input = root.querySelector('.composer__input');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
}

function submit(root) {
  root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('vista de chat', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCache();
    resetSessions();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el nombre del personaje, el aviso de IA y su saludo', () => {
    const root = mountChat('sanmartin');
    expect(root.querySelector('.chat__name').textContent).toContain('San Martín');
    expect(root.querySelector('.notice').textContent).toContain('Recreación ficticia');
    expect(root.querySelector('.msg--greeting').textContent).toContain('compatriota');
  });

  it('el botón de enviar está deshabilitado con el campo vacío', () => {
    const root = mountChat();
    expect(root.querySelector('.composer__send').disabled).toBe(true);
    type(root, 'Hola');
    expect(root.querySelector('.composer__send').disabled).toBe(false);
  });

  it('muestra el mensaje del usuario y el indicador "escribiendo…" mientras responde', () => {
    mockFetch(200, { reply: 'Hola' });
    const root = mountChat();
    type(root, 'Hola Diego');
    submit(root);

    expect(root.querySelector('.msg--user .msg__bubble').textContent).toBe('Hola Diego');
    expect(root.querySelector('.msg--typing')).not.toBeNull();
    expect(root.querySelectorAll('.typing__dot')).toHaveLength(3);
    expect(root.querySelector('.chat__status').textContent).toContain('escribiendo');
    expect(root.querySelector('.composer__input').value).toBe('');
  });

  it('muestra la respuesta del personaje con hora y botón de copiar', async () => {
    mockFetch(200, { reply: '¡Qué hacés, pibe!' });
    const root = mountChat();
    type(root, 'Hola Diego');
    submit(root);
    await flush();

    expect(root.querySelector('.msg--typing')).toBeNull();
    const reply = root.querySelector('.msg--model:not(.msg--greeting) .msg__bubble');
    expect(reply.textContent).toBe('¡Qué hacés, pibe!');
    expect(root.querySelectorAll('.msg__time')).toHaveLength(2);
    expect(root.querySelector('.msg--model .msg__copy')).not.toBeNull();
    expect(root.querySelector('.msg--user .msg__copy')).toBeNull();
  });

  it('el mensaje del usuario y el del personaje tienen clases distintas', async () => {
    mockFetch(200, { reply: 'Hola' });
    const root = mountChat();
    type(root, 'Hola');
    submit(root);
    await flush();
    expect(root.querySelectorAll('.msg--user')).toHaveLength(1);
    expect(root.querySelectorAll('.msg--model:not(.msg--greeting)')).toHaveLength(1);
  });

  it('muestra el error de la API con un botón para reintentar', async () => {
    mockFetch(500, { error: 'El servicio de IA no está disponible.' });
    const root = mountChat();
    type(root, 'Hola');
    submit(root);
    await flush();

    const box = root.querySelector('.error-box');
    expect(box.textContent).toContain('El servicio de IA no está disponible.');
    expect(box.querySelector('button').textContent).toBe('Reintentar');
    expect(root.querySelectorAll('.msg--user')).toHaveLength(1);
  });

  it('reintentar vuelve a pedir la respuesta sin duplicar el mensaje', async () => {
    const fetchMock = mockFetch(500, { error: 'falló' });
    const root = mountChat();
    type(root, 'Hola');
    submit(root);
    await flush();

    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ reply: 'Ahora sí' }) });
    root.querySelector('.error-box button').click();
    await flush();

    expect(root.querySelector('.error-box')).toBeNull();
    expect(root.querySelectorAll('.msg--user')).toHaveLength(1);
    expect(root.querySelector('.msg--model:not(.msg--greeting) .msg__bubble').textContent).toBe('Ahora sí');
  });

  it('muestra el indicador de historial guardado y las sugerencias solo al inicio', async () => {
    mockFetch(200, { reply: 'Hola' });
    const root = mountChat();
    expect(root.querySelector('.pill').hidden).toBe(true);
    expect(root.querySelector('.chips').hidden).toBe(false);

    type(root, 'Hola');
    submit(root);
    await flush();

    expect(root.querySelector('.pill').hidden).toBe(false);
    expect(root.querySelector('.pill').textContent).toContain('2');
    expect(root.querySelector('.chips').hidden).toBe(true);
  });

  it('una sugerencia envía su texto como mensaje', async () => {
    const fetchMock = mockFetch(200, { reply: 'Dale' });
    const root = mountChat();
    const chip = root.querySelector('.chip');
    const text = chip.textContent;
    chip.click();
    await flush();

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].text).toBe(text);
  });

  it('Enter envía el mensaje y Shift+Enter no', async () => {
    const fetchMock = mockFetch(200, { reply: 'ok' });
    const root = mountChat();
    const input = type(root, 'Hola');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await flush();
    expect(enter.defaultPrevented).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('copia la respuesta del personaje al portapapeles', async () => {
    mockFetch(200, { reply: 'Texto para copiar' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: { writeText } });

    const root = mountChat();
    type(root, 'Hola');
    submit(root);
    await flush();

    root.querySelector('.msg__copy').click();
    await flush();
    expect(writeText).toHaveBeenCalledWith('Texto para copiar');
    expect(root.querySelector('.msg__copy-label').textContent).toBe('Copiado');
  });

  it('carga el historial guardado al volver a abrir el chat', async () => {
    mockFetch(200, { reply: 'Respuesta guardada' });
    const first = mountChat();
    type(first, 'Pregunta guardada');
    submit(first);
    await flush();

    // Simula recargar la página: se pierde la memoria, queda localStorage.
    document.body.innerHTML = '';
    resetCache();
    resetSessions();
    const second = mountChat();

    const texts = [...second.querySelectorAll('.msg:not(.msg--greeting) .msg__bubble')].map((el) => el.textContent);
    expect(texts).toEqual(['Pregunta guardada', 'Respuesta guardada']);
    expect(second.querySelector('.pill').hidden).toBe(false);
  });

  it('"borrar historial" pide confirmación y limpia la conversación y localStorage', async () => {
    mockFetch(200, { reply: 'Hola' });
    const root = mountChat();
    type(root, 'Hola');
    submit(root);
    await flush();

    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('confirm', confirm);
    const clearBtn = root.querySelector('button[aria-label^="Borrar historial"]');

    clearBtn.click(); // el usuario cancela
    expect(root.querySelectorAll('.msg:not(.msg--greeting)')).toHaveLength(2);

    clearBtn.click(); // el usuario confirma
    expect(root.querySelectorAll('.msg:not(.msg--greeting)')).toHaveLength(0);
    expect(window.localStorage.getItem('chat-personajes:history:maradona')).toBeNull();
    expect(root.querySelector('.pill').hidden).toBe(true);
  });

  it('sin personaje elegido ofrece ir a la galería', () => {
    const root = ChatView({ params: new URLSearchParams(''), onCleanup: () => {} });
    expect(root.querySelector('a[href="/characters"]')).not.toBeNull();
  });

  it('los textos se insertan como texto (sin ejecutar HTML)', async () => {
    mockFetch(200, { reply: '<img src=x onerror=alert(1)>' });
    const root = mountChat();
    type(root, '<b>negrita</b>');
    submit(root);
    await flush();

    expect(root.querySelector('.msg--user .msg__bubble b')).toBeNull();
    expect(root.querySelector('.msg--model:not(.msg--greeting) .msg__bubble img')).toBeNull();
  });
});
