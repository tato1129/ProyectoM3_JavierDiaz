import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_INPUT_CHARS, createSession } from '../src/chatSession.js';
import { loadHistory, resetCache } from '../src/store.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('chatSession (lógica de la conversación)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCache();
  });

  it('agrega el mensaje del usuario y la respuesta del personaje', async () => {
    const send = vi.fn().mockResolvedValue('**¡Hola**, pibe!');
    const session = createSession('maradona', { send });

    await session.send('  Hola Diego  ');

    expect(session.messages.map((m) => [m.role, m.text])).toEqual([
      ['user', 'Hola Diego'],
      ['model', '¡Hola, pibe!'],
    ]);
    expect(session.sending).toBe(false);
    expect(session.error).toBeNull();
  });

  it('cada mensaje tiene id y timestamp', async () => {
    const session = createSession('maradona', { send: vi.fn().mockResolvedValue('ok') });
    await session.send('Hola');
    for (const message of session.messages) {
      expect(typeof message.id).toBe('string');
      expect(Number.isFinite(message.ts)).toBe(true);
    }
  });

  it('envía todo el historial en cada pedido (mantiene el contexto)', async () => {
    const send = vi.fn().mockResolvedValueOnce('respuesta 1').mockResolvedValueOnce('respuesta 2');
    const session = createSession('maradona', { send });

    await session.send('pregunta 1');
    await session.send('pregunta 2');

    const secondCall = send.mock.calls[1][0];
    expect(secondCall.characterId).toBe('maradona');
    expect(secondCall.messages.map((m) => m.text)).toEqual(['pregunta 1', 'respuesta 1', 'pregunta 2']);
  });

  it('marca sending=true mientras espera la respuesta', async () => {
    const pending = deferred();
    const session = createSession('maradona', { send: vi.fn(() => pending.promise) });

    const sending = session.send('Hola');
    expect(session.sending).toBe(true);

    pending.resolve('listo');
    await sending;
    expect(session.sending).toBe(false);
  });

  it('ignora mensajes vacíos o de solo espacios', async () => {
    const send = vi.fn();
    const session = createSession('maradona', { send });
    expect(await session.send('   ')).toBe(false);
    expect(await session.send('')).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(session.messages).toEqual([]);
  });

  it('no permite enviar otro mensaje mientras espera una respuesta', async () => {
    const pending = deferred();
    const send = vi.fn(() => pending.promise);
    const session = createSession('maradona', { send });

    const first = session.send('uno');
    expect(await session.send('dos')).toBe(false);
    pending.resolve('ok');
    await first;

    expect(send).toHaveBeenCalledTimes(1);
    expect(session.messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('recorta los mensajes demasiado largos', async () => {
    const session = createSession('maradona', { send: vi.fn().mockResolvedValue('ok') });
    await session.send('a'.repeat(MAX_INPUT_CHARS + 300));
    expect(session.messages[0].text).toHaveLength(MAX_INPUT_CHARS);
  });

  it('guarda el error y conserva el mensaje del usuario si falla la API', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Servicio caído'));
    const session = createSession('maradona', { send });

    await session.send('Hola');

    expect(session.error).toBe('Servicio caído');
    expect(session.sending).toBe(false);
    expect(session.messages).toHaveLength(1);
  });

  it('reintentar no duplica el mensaje y limpia el error si funciona', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('falló')).mockResolvedValueOnce('ahora sí');
    const session = createSession('maradona', { send });

    await session.send('Hola');
    expect(session.error).toBe('falló');

    await session.retry();

    expect(session.error).toBeNull();
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'model']);
    expect(session.messages[1].text).toBe('ahora sí');
  });

  it('no reintenta si el último mensaje ya es del personaje', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const session = createSession('maradona', { send });
    await session.send('Hola');
    expect(await session.retry()).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('borrar el historial vacía la conversación y localStorage', async () => {
    const session = createSession('maradona', { send: vi.fn().mockResolvedValue('ok') });
    await session.send('Hola');
    session.clear();
    expect(session.messages).toEqual([]);
    expect(window.localStorage.getItem('chat-personajes:history:maradona')).toBeNull();
  });

  it('descarta una respuesta que llega después de borrar el historial', async () => {
    const pending = deferred();
    const session = createSession('maradona', { send: vi.fn(() => pending.promise) });

    const sending = session.send('Hola');
    session.clear();
    pending.resolve('respuesta tardía');
    await sending;

    expect(session.messages).toEqual([]);
    expect(session.sending).toBe(false);
  });

  it('notifica a los suscriptores y permite desuscribirse', async () => {
    const session = createSession('maradona', { send: vi.fn().mockResolvedValue('ok') });
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    await session.send('Hola');
    expect(listener).toHaveBeenCalled();

    const calls = listener.mock.calls.length;
    unsubscribe();
    await session.send('Otra vez');
    await flush();
    expect(listener.mock.calls.length).toBe(calls);
  });

  it('el historial sobrevive a una recarga de la página', async () => {
    const session = createSession('maradona', { send: vi.fn().mockResolvedValue('Hola') });
    await session.send('Hola Diego');
    resetCache();
    expect(loadHistory('maradona').map((m) => m.text)).toEqual(['Hola Diego', 'Hola']);
  });
});
