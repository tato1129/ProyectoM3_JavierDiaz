import { describe, expect, it } from 'vitest';
import { cleanReply, formatTime, uid } from '../src/utils/format.js';

describe('cleanReply', () => {
  it('quita negritas y cursivas de markdown', () => {
    expect(cleanReply('**Hola** *che*, ¿cómo andás?')).toBe('Hola che, ¿cómo andás?');
  });

  it('quita los títulos de markdown', () => {
    expect(cleanReply('## Título\nTexto')).toBe('Título\nTexto');
  });

  it('colapsa saltos de línea de más y recorta los bordes', () => {
    expect(cleanReply('  uno\n\n\n\ndos  \n')).toBe('uno\n\ndos');
  });

  it('conserva acentos, signos y emojis', () => {
    expect(cleanReply('¡Qué golazo! ⚽ Sí, señor.')).toBe('¡Qué golazo! ⚽ Sí, señor.');
  });

  it('devuelve cadena vacía con null o undefined', () => {
    expect(cleanReply(null)).toBe('');
    expect(cleanReply(undefined)).toBe('');
  });
});

describe('formatTime', () => {
  it('devuelve la hora con formato HH:MM', () => {
    expect(formatTime(Date.now())).toMatch(/^\d{2}:\d{2}$/);
  });

  it('devuelve cadena vacía si la fecha es inválida', () => {
    expect(formatTime('no es una fecha')).toBe('');
    expect(formatTime(NaN)).toBe('');
  });
});

describe('uid', () => {
  it('genera ids únicos', () => {
    const ids = new Set(Array.from({ length: 200 }, () => uid()));
    expect(ids.size).toBe(200);
  });
});
