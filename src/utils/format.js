/** Hora corta para los mensajes, por ejemplo "18:31". */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/**
 * Limpia la respuesta del modelo para mostrarla como texto de chat:
 * quita marcas de markdown (negritas, cursivas, títulos) y colapsa saltos de línea de más.
 */
export function cleanReply(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Id único para cada mensaje (randomUUID no existe en páginas http no seguras, por eso el plan B). */
export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
