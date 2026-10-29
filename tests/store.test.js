import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_STORED_MESSAGES,
  appendMessage,
  clearHistory,
  getLastCharacter,
  hasHistory,
  loadHistory,
  resetCache,
  saveHistory,
  setLastCharacter,
} from '../src/store.js';

const KEY = 'chat-personajes:history:maradona';
const msg = (n, role = 'user') => ({ id: `id-${n}`, role, text: `mensaje ${n}`, ts: 1700000000000 + n });

describe('store (historial + localStorage)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCache();
  });

  it('empieza vacío', () => {
    expect(loadHistory('maradona')).toEqual([]);
    expect(hasHistory('maradona')).toBe(false);
  });

  it('guarda los mensajes y los persiste en localStorage', () => {
    appendMessage('maradona', msg(1));
    appendMessage('maradona', msg(2, 'model'));
    expect(loadHistory('maradona')).toHaveLength(2);
    expect(JSON.parse(window.localStorage.getItem(KEY))).toHaveLength(2);
    expect(hasHistory('maradona')).toBe(true);
  });

  it('recupera el historial al "recargar" la página', () => {
    appendMessage('maradona', msg(1));
    resetCache(); // simula una recarga: se pierde la memoria, queda localStorage
    expect(loadHistory('maradona')).toEqual([msg(1)]);
  });

  it('mantiene el historial separado por personaje', () => {
    appendMessage('maradona', msg(1));
    expect(loadHistory('favaloro')).toEqual([]);
  });

  it('devuelve copias: modificar el resultado no altera el historial', () => {
    appendMessage('maradona', msg(1));
    loadHistory('maradona').push(msg(99));
    expect(loadHistory('maradona')).toHaveLength(1);
  });

  it('borra el historial de memoria y de localStorage', () => {
    appendMessage('maradona', msg(1));
    clearHistory('maradona');
    expect(loadHistory('maradona')).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    resetCache();
    expect(loadHistory('maradona')).toEqual([]);
  });

  it('borrar un personaje no afecta a los otros', () => {
    appendMessage('maradona', msg(1));
    appendMessage('favaloro', msg(2));
    clearHistory('maradona');
    expect(loadHistory('favaloro')).toHaveLength(1);
  });

  it('ignora datos corruptos en localStorage', () => {
    window.localStorage.setItem(KEY, '{esto no es json');
    expect(loadHistory('maradona')).toEqual([]);
  });

  it('descarta entradas inválidas y conserva las válidas', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([msg(1), { id: 'x', role: 'admin', text: 'hola', ts: 1 }, { role: 'user' }, null, 'texto', msg(2)]),
    );
    expect(loadHistory('maradona').map((m) => m.id)).toEqual(['id-1', 'id-2']);
  });

  it('limita la cantidad de mensajes guardados', () => {
    const many = Array.from({ length: MAX_STORED_MESSAGES + 25 }, (_, i) => msg(i));
    const saved = saveHistory('maradona', many);
    expect(saved).toHaveLength(MAX_STORED_MESSAGES);
    expect(saved[saved.length - 1].id).toBe(`id-${MAX_STORED_MESSAGES + 24}`);
  });

  it('recuerda el último personaje elegido', () => {
    expect(getLastCharacter()).toBeNull();
    setLastCharacter('sanmartin');
    expect(getLastCharacter()).toBe('sanmartin');
  });
});
