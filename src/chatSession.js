// Lógica de la conversación con un personaje, separada de la interfaz.
//
// Cada personaje tiene una "sesión" que vive mientras la app esté abierta. Así, si el usuario
// cambia de vista mientras el personaje está "escribiendo", la respuesta igual se guarda
// y la ve al volver al chat.

import { sendChat } from './api.js';
import { appendMessage, clearHistory, loadHistory } from './store.js';
import { cleanReply, uid } from './utils/format.js';

export const MAX_INPUT_CHARS = 500;

export function createSession(characterId, { send = sendChat } = {}) {
  const listeners = new Set();
  let sending = false;
  let error = null;
  let epoch = 0; // se incrementa al borrar el historial para descartar respuestas "viejas"

  const emit = () => listeners.forEach((listener) => listener());

  async function request() {
    const myEpoch = epoch;
    sending = true;
    error = null;
    emit();
    try {
      const reply = await send({ characterId, messages: loadHistory(characterId) });
      if (myEpoch !== epoch) return;
      appendMessage(characterId, { id: uid(), role: 'model', text: cleanReply(reply), ts: Date.now() });
    } catch (err) {
      if (myEpoch !== epoch) return;
      error = err?.message || 'Algo salió mal. Probá de nuevo.';
    } finally {
      if (myEpoch === epoch) sending = false;
      emit();
    }
  }

  return {
    get messages() {
      return loadHistory(characterId);
    },
    get sending() {
      return sending;
    },
    get error() {
      return error;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Agrega el mensaje del usuario y pide la respuesta. Devuelve false si no se envió. */
    async send(text) {
      const clean = String(text ?? '').trim().slice(0, MAX_INPUT_CHARS);
      if (!clean || sending) return false;
      appendMessage(characterId, { id: uid(), role: 'user', text: clean, ts: Date.now() });
      await request();
      return true;
    },

    /** Reintenta pedir la respuesta al último mensaje del usuario, sin duplicarlo. */
    async retry() {
      const messages = loadHistory(characterId);
      if (sending || !messages.length || messages[messages.length - 1].role !== 'user') return false;
      await request();
      return true;
    },

    clear() {
      epoch += 1;
      sending = false;
      error = null;
      clearHistory(characterId);
      emit();
    },
  };
}

const sessions = new Map();

export function getSession(characterId) {
  if (!sessions.has(characterId)) sessions.set(characterId, createSession(characterId));
  return sessions.get(characterId);
}

export function resetSessions() {
  sessions.clear();
}
