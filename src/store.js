// Historial de conversaciones.
//
// - Durante la sesión el historial vive en memoria (un Map), así que se conserva al cambiar de vista.
// - Además se guarda en localStorage, por lo que sobrevive a recargar la página.
// - Si localStorage no está disponible (modo privado, cuota llena) la app sigue funcionando solo en memoria.

const HISTORY_PREFIX = 'chat-personajes:history:';
const LAST_CHARACTER_KEY = 'chat-personajes:last-character';
export const MAX_STORED_MESSAGES = 200;

const cache = new Map();

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidMessage(message) {
  return (
    message &&
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'model') &&
    typeof message.text === 'string' &&
    message.text.length > 0 &&
    Number.isFinite(message.ts)
  );
}

function persist(characterId, list) {
  try {
    const ls = storage();
    if (!ls) return;
    if (list.length) ls.setItem(HISTORY_PREFIX + characterId, JSON.stringify(list));
    else ls.removeItem(HISTORY_PREFIX + characterId);
  } catch {
    // Cuota llena o almacenamiento bloqueado: el historial queda solo en memoria.
  }
}

/** Devuelve una copia del historial del personaje (lo lee de localStorage la primera vez). */
export function loadHistory(characterId) {
  if (!cache.has(characterId)) {
    let list = [];
    try {
      const raw = storage()?.getItem(HISTORY_PREFIX + characterId);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) list = parsed.filter(isValidMessage);
    } catch {
      list = [];
    }
    cache.set(characterId, list);
  }
  return cache.get(characterId).slice();
}

export function saveHistory(characterId, messages) {
  const list = messages.slice(-MAX_STORED_MESSAGES);
  cache.set(characterId, list);
  persist(characterId, list);
  return list.slice();
}

export function appendMessage(characterId, message) {
  return saveHistory(characterId, [...loadHistory(characterId), message]);
}

/** Borra el historial del personaje, tanto de memoria como de localStorage. */
export function clearHistory(characterId) {
  cache.set(characterId, []);
  persist(characterId, []);
}

export function hasHistory(characterId) {
  return loadHistory(characterId).length > 0;
}

/** Vacía la caché en memoria (simula una recarga de la página; útil en los tests). */
export function resetCache() {
  cache.clear();
}

export function getLastCharacter() {
  try {
    return storage()?.getItem(LAST_CHARACTER_KEY) || null;
  } catch {
    return null;
  }
}

export function setLastCharacter(characterId) {
  try {
    storage()?.setItem(LAST_CHARACTER_KEY, characterId);
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}
