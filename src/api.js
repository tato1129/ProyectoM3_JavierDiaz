// Cliente de la API propia (/api/chat). El navegador NUNCA habla directo con Gemini:
// le pide la respuesta a nuestra función serverless, que es la única que conoce la API key.

export class ChatApiError extends Error {
  constructor(message, { status = 0, code = 'unknown' } = {}) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.code = code;
  }
}

function messageForStatus(status) {
  if (status === 404) {
    return 'No encontramos el servicio de chat. Si estás probando en local, revisá que el servidor esté corriendo.';
  }
  if (status === 429) return 'Hay muchas consultas en este momento. Esperá unos segundos y reintentá.';
  if (status >= 500) return 'El servicio no está disponible en este momento. Probá de nuevo en un rato.';
  return 'Algo salió mal. Probá de nuevo.';
}

/**
 * Envía la conversación y devuelve el texto de la respuesta del personaje.
 * Lanza ChatApiError con un mensaje listo para mostrarle al usuario.
 */
export async function sendChat({ characterId, messages, signal } = {}) {
  let response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId,
        messages: messages.map(({ role, text }) => ({ role, text })),
      }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ChatApiError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.', {
      code: 'network',
    });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // La respuesta no era JSON (por ejemplo, una página de error de la plataforma).
  }

  if (!response.ok) {
    const message = typeof data?.error === 'string' && data.error ? data.error : messageForStatus(response.status);
    throw new ChatApiError(message, { status: response.status, code: data?.code ?? 'http_error' });
  }

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) {
    throw new ChatApiError('Recibimos una respuesta vacía. Probá de nuevo.', {
      status: response.status,
      code: 'empty_reply',
    });
  }
  return reply;
}
