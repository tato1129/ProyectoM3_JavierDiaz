import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { extractReply, sanitizeMessages } from '../api/chat.js';

const API_KEY = 'clave-secreta-de-prueba';

function createRes() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function geminiOk(text = '¡Hola, che!') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
  };
}

function geminiError(status) {
  return { ok: false, status, json: async () => ({ error: { status: 'ERROR', message: `interno ${API_KEY}` } }) };
}

const validBody = () => ({ characterId: 'maradona', messages: [{ role: 'user', text: 'Hola Diego' }] });

async function call(body, { method = 'POST' } = {}) {
  const res = createRes();
  await handler({ method, body }, res);
  return res;
}

describe('sanitizeMessages', () => {
  it('rechaza entradas que no son una lista', () => {
    expect(sanitizeMessages(null)).toBeNull();
    expect(sanitizeMessages('hola')).toBeNull();
    expect(sanitizeMessages({})).toBeNull();
  });

  it('exige que la conversación termine con un mensaje del usuario', () => {
    expect(sanitizeMessages([{ role: 'user', text: 'a' }, { role: 'model', text: 'b' }])).toBeNull();
    expect(sanitizeMessages([])).toBeNull();
  });

  it('descarta roles y textos inválidos', () => {
    const result = sanitizeMessages([
      { role: 'system', text: 'ignorar' },
      { role: 'user', text: 123 },
      { role: 'user', text: '   ' },
      null,
      { role: 'user', text: 'Hola' },
    ]);
    expect(result).toEqual([{ role: 'user', text: 'Hola' }]);
  });

  it('une mensajes consecutivos del mismo rol (tras un envío fallido)', () => {
    const result = sanitizeMessages([
      { role: 'user', text: 'uno' },
      { role: 'user', text: 'dos' },
    ]);
    expect(result).toEqual([{ role: 'user', text: 'uno\ndos' }]);
  });

  it('empieza siempre con un mensaje del usuario', () => {
    const result = sanitizeMessages([
      { role: 'model', text: 'saludo' },
      { role: 'user', text: 'Hola' },
    ]);
    expect(result[0].role).toBe('user');
  });

  it('recorta los mensajes largos', () => {
    const [message] = sanitizeMessages([{ role: 'user', text: 'x'.repeat(5000) }]);
    expect(message.text).toHaveLength(1000);
  });

  it('se queda con los mensajes más recientes', () => {
    const many = Array.from({ length: 31 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'model', text: `m${i}` }));
    const result = sanitizeMessages(many);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result[0].role).toBe('user');
    expect(result[result.length - 1].text).toBe('m30');
  });
});

describe('extractReply', () => {
  it('une las partes de texto de la respuesta', () => {
    const data = { candidates: [{ content: { parts: [{ text: 'Hola ' }, { text: 'mundo' }] } }] };
    expect(extractReply(data)).toEqual({ text: 'Hola mundo' });
  });

  it('ignora las partes de "pensamiento" del modelo', () => {
    const data = { candidates: [{ content: { parts: [{ text: 'pienso...', thought: true }, { text: 'Respuesta' }] } }] };
    expect(extractReply(data)).toEqual({ text: 'Respuesta' });
  });

  it('detecta respuestas bloqueadas por seguridad', () => {
    expect(extractReply({ promptFeedback: { blockReason: 'SAFETY' } })).toEqual({ blocked: true });
    expect(extractReply({ candidates: [{ finishReason: 'SAFETY' }] })).toEqual({ blocked: true });
  });

  it('detecta respuestas vacías', () => {
    expect(extractReply({})).toEqual({ empty: true });
    expect(extractReply({ candidates: [{ content: { parts: [] } }] })).toEqual({ empty: true });
  });
});

describe('POST /api/chat (handler)', () => {
  let fetchMock;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = API_KEY;
    delete process.env.GEMINI_MODEL;
    fetchMock = vi.fn().mockResolvedValue(geminiOk());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it('solo acepta POST', async () => {
    const res = await call(undefined, { method: 'GET' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falla de forma controlada si falta la API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await call(validBody());
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('missing_api_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza personajes inválidos', async () => {
    const res = await call({ ...validBody(), characterId: 'hacker' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('invalid_character');
  });

  it('rechaza conversaciones inválidas', async () => {
    const res = await call({ characterId: 'maradona', messages: [{ role: 'model', text: 'hola' }] });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('invalid_messages');
  });

  it('acepta el cuerpo como texto JSON y responde 400 si no es JSON válido', async () => {
    const ok = await call(JSON.stringify(validBody()));
    expect(ok.statusCode).toBe(200);
    const bad = await call('{no es json');
    expect(bad.statusCode).toBe(400);
  });

  it('devuelve la respuesta del personaje', async () => {
    const res = await call(validBody());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reply: '¡Hola, che!' });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('llama a Gemini con el prompt del personaje y el historial', async () => {
    await call({
      characterId: 'favaloro',
      messages: [
        { role: 'user', text: 'Hola doctor' },
        { role: 'model', text: 'Buen día' },
        { role: 'user', text: '¿Qué es un bypass?' },
      ],
    });

    const [url, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('gemini-3.8-flash:generateContent');
    expect(payload.systemInstruction.parts[0].text).toContain('René Gerónimo Favaloro');
    expect(payload.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(payload.contents[2].parts[0].text).toBe('¿Qué es un bypass?');
    expect(payload.generationConfig.maxOutputTokens).toBeGreaterThan(0);
  });

  it('envía la API key por header y nunca en la URL', async () => {
    await call(validBody());
    const [url, options] = fetchMock.mock.calls[0];
    expect(options.headers['x-goog-api-key']).toBe(API_KEY);
    expect(url).not.toContain(API_KEY);
  });

  it('permite elegir el modelo con GEMINI_MODEL', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.0-flash';
    await call(validBody());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('gemini-2.0-flash:generateContent');
    expect(JSON.parse(options.body).generationConfig.thinkingConfig).toBeUndefined();
  });

  it('traduce un 429 de Gemini a "rate_limited"', async () => {
    fetchMock.mockResolvedValue(geminiError(429));
    const res = await call(validBody());
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('rate_limited');
  });

  it('traduce errores de configuración de Gemini (401/403) sin detalles internos', async () => {
    fetchMock.mockResolvedValue(geminiError(403));
    const res = await call(validBody());
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('upstream_config');
  });

  it('traduce errores 5xx de Gemini a un mensaje genérico', async () => {
    fetchMock.mockResolvedValue(geminiError(503));
    const res = await call(validBody());
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('upstream_error');
  });

  it('informa cuando Gemini bloquea la respuesta', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) });
    const res = await call(validBody());
    expect(res.statusCode).toBe(422);
    expect(res.body.code).toBe('blocked');
  });

  it('informa cuando Gemini responde sin texto', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [] }) });
    const res = await call(validBody());
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('empty_reply');
  });

  it('responde 504 si Gemini tarda demasiado (timeout)', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('abortado'), { name: 'AbortError' }));
    const res = await call(validBody());
    expect(res.statusCode).toBe(504);
    expect(res.body.code).toBe('timeout');
  });

  it('responde 502 si no se puede contactar a Gemini', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await call(validBody());
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('upstream_unreachable');
  });

  it('nunca expone la API key en las respuestas de error ni en los logs', async () => {
    fetchMock.mockResolvedValue(geminiError(500));
    const res = await call(validBody());
    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
    expect(JSON.stringify(console.error.mock.calls)).not.toContain(API_KEY);
  });
});
