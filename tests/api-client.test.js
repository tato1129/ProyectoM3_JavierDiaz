import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatApiError, sendChat } from '../src/api.js';

function mockResponse(status, body, { jsonFails = false } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jsonFails ? async () => Promise.reject(new SyntaxError('no es json')) : async () => body,
  };
}

const messages = [{ id: 'a1', role: 'user', text: 'Hola', ts: 1 }];

describe('sendChat (cliente de /api/chat)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve la respuesta del personaje', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, { reply: '  ¡Hola, pibe!  ' })));
    await expect(sendChat({ characterId: 'maradona', messages })).resolves.toBe('¡Hola, pibe!');
  });

  it('hace POST a /api/chat enviando solo role y text (sin ids ni fechas)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, { reply: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await sendChat({ characterId: 'favaloro', messages });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      characterId: 'favaloro',
      messages: [{ role: 'user', text: 'Hola' }],
    });
  });

  it('no envía ninguna credencial desde el navegador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, { reply: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await sendChat({ characterId: 'maradona', messages });
    const headers = Object.keys(fetchMock.mock.calls[0][1].headers).map((h) => h.toLowerCase());
    expect(headers).toEqual(['content-type']);
  });

  it('muestra el mensaje de error que envía el servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse(429, { error: 'Muchas consultas, esperá.', code: 'rate_limited' })),
    );
    await expect(sendChat({ characterId: 'maradona', messages })).rejects.toMatchObject({
      name: 'ChatApiError',
      message: 'Muchas consultas, esperá.',
      status: 429,
      code: 'rate_limited',
    });
  });

  it('usa un mensaje por defecto si el error no trae cuerpo JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(500, null, { jsonFails: true })));
    await expect(sendChat({ characterId: 'maradona', messages })).rejects.toMatchObject({
      status: 500,
      message: 'El servicio no está disponible en este momento. Probá de nuevo en un rato.',
    });
  });

  it('explica el error 404 (servidor de API no disponible)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(404, null, { jsonFails: true })));
    await expect(sendChat({ characterId: 'maradona', messages })).rejects.toThrow('No encontramos el servicio de chat');
  });

  it('informa si no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await sendChat({ characterId: 'maradona', messages }).catch((e) => e);
    expect(error).toBeInstanceOf(ChatApiError);
    expect(error.code).toBe('network');
  });

  it('propaga la cancelación (AbortError) sin transformarla', async () => {
    const abort = Object.assign(new Error('abortado'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(sendChat({ characterId: 'maradona', messages })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rechaza respuestas vacías', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, { reply: '   ' })));
    await expect(sendChat({ characterId: 'maradona', messages })).rejects.toMatchObject({ code: 'empty_reply' });
  });
});
