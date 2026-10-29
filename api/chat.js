// Función serverless de Vercel: POST /api/chat
//
// Recibe { characterId, messages: [{ role: 'user' | 'model', text }] } y responde { reply }.
// La API key de Gemini se lee de process.env.GEMINI_API_KEY (variable de entorno del servidor),
// por lo que NUNCA llega al navegador.

import { getSystemPrompt, isValidCharacter } from './_lib/prompts.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const MAX_MESSAGES = 20; // ventana de contexto que se envía a Gemini
const MAX_CHARS_PER_MESSAGE = 1000;
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Limpia y valida el historial recibido del cliente.
 * - Descarta roles/textos inválidos y recorta mensajes largos.
 * - Une mensajes consecutivos del mismo rol (pasa si un envío anterior falló).
 * - Se queda con los últimos MAX_MESSAGES y exige que empiece y termine con un mensaje del usuario.
 * Devuelve null si el resultado no es utilizable.
 */
export function sanitizeMessages(input) {
  if (!Array.isArray(input)) return null;

  const merged = [];
  for (const item of input) {
    if (!item || (item.role !== 'user' && item.role !== 'model') || typeof item.text !== 'string') continue;
    const text = item.text.trim().slice(0, MAX_CHARS_PER_MESSAGE);
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) last.text = `${last.text}\n${text}`;
    else merged.push({ role: item.role, text });
  }

  const recent = merged.slice(-MAX_MESSAGES);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  if (!recent.length || recent[recent.length - 1].role !== 'user') return null;
  return recent;
}

/** Extrae el texto de la respuesta de Gemini. */
export function extractReply(data) {
  const candidate = data?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const text = parts
    .filter((part) => part && !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
  if (text) return { text };

  const finishReason = candidate?.finishReason;
  if (data?.promptFeedback?.blockReason || finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    return { blocked: true };
  }
  return { empty: true };
}

function upstreamError(status) {
  if (status === 429) {
    return {
      http: 429,
      code: 'rate_limited',
      error: 'El servicio de IA está recibiendo muchas consultas. Esperá unos segundos y volvé a intentar.',
    };
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return {
      http: 502,
      code: 'upstream_config',
      error: 'Hay un problema de configuración con el servicio de IA. Avisale a quien administra la app.',
    };
  }
  return {
    http: 502,
    code: 'upstream_error',
    error: 'El servicio de IA no está disponible en este momento. Probá de nuevo en un rato.',
  };
}

function parseBody(body) {
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.', code: 'method_not_allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[api/chat] Falta la variable de entorno GEMINI_API_KEY.');
    return res.status(500).json({
      error: 'El servidor no tiene configurada la API key de Gemini.',
      code: 'missing_api_key',
    });
  }

  const body = parseBody(req.body);

  if (!isValidCharacter(body.characterId)) {
    return res.status(400).json({ error: 'Personaje inválido.', code: 'invalid_character' });
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return res.status(400).json({
      error: 'La conversación es inválida: debe terminar con un mensaje tuyo.',
      code: 'invalid_messages',
    });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const payload = {
    systemInstruction: { parts: [{ text: getSystemPrompt(body.characterId) }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 1024, // margen extra: los modelos 3.x pueden usar tokens para "pensar" antes de responder
      // En los modelos 2.5 Flash el "pensamiento" consume tokens y suma latencia: para un chat corto lo apagamos.
      ...(/gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Solo se registra el estado (nunca la key ni lo que escribió el usuario).
      console.error('[api/chat] Gemini respondió con error', response.status, data?.error?.status ?? '');
      const { http, code, error } = upstreamError(response.status);
      return res.status(http).json({ error, code });
    }

    const result = extractReply(data);
    if (result.text) return res.status(200).json({ reply: result.text });

    if (result.blocked) {
      return res.status(422).json({
        error: 'El personaje prefirió no responder a eso. Probá con otra pregunta.',
        code: 'blocked',
      });
    }
    return res.status(502).json({
      error: 'No llegó ninguna respuesta del servicio de IA. Probá de nuevo.',
      code: 'empty_reply',
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({
        error: 'El servicio de IA tardó demasiado en responder. Probá de nuevo.',
        code: 'timeout',
      });
    }
    console.error('[api/chat] Error de red al llamar a Gemini:', error?.name ?? 'Error');
    return res.status(502).json({
      error: 'No pudimos comunicarnos con el servicio de IA. Probá de nuevo en un rato.',
      code: 'upstream_unreachable',
    });
  } finally {
    clearTimeout(timer);
  }
}
