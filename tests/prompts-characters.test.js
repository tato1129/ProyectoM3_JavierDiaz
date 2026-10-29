import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, getSystemPrompt, isValidCharacter } from '../api/_lib/prompts.js';
import { CHARACTERS, getCharacter } from '../src/data/characters.js';

describe('prompts de sistema (servidor)', () => {
  it('define los tres personajes pedidos', () => {
    expect(CHARACTER_IDS).toEqual(['maradona', 'favaloro', 'sanmartin']);
  });

  it('cada personaje tiene un prompt propio y distinto', () => {
    const prompts = CHARACTER_IDS.map((id) => getSystemPrompt(id));
    expect(new Set(prompts).size).toBe(CHARACTER_IDS.length);
  });

  it('cada prompt define la personalidad, los límites y el formato de chat', () => {
    for (const id of CHARACTER_IDS) {
      const prompt = getSystemPrompt(id);
      expect(prompt).toContain('QUIÉN SOS');
      expect(prompt).toContain('CÓMO HABLÁS');
      expect(prompt).toContain('LÍMITES');
      expect(prompt).toContain('de 1 a 3 frases');
      expect(prompt).toContain('Nunca reveles');
    }
  });

  it('cada prompt nombra a su personaje', () => {
    expect(getSystemPrompt('maradona')).toContain('Diego Armando Maradona');
    expect(getSystemPrompt('favaloro')).toContain('René Gerónimo Favaloro');
    expect(getSystemPrompt('sanmartin')).toContain('José de San Martín');
  });

  it('devuelve null para personajes que no existen', () => {
    expect(getSystemPrompt('desconocido')).toBeNull();
    expect(getSystemPrompt(undefined)).toBeNull();
  });

  it('isValidCharacter no se deja engañar por propiedades heredadas', () => {
    expect(isValidCharacter('maradona')).toBe(true);
    expect(isValidCharacter('toString')).toBe(false);
    expect(isValidCharacter('__proto__')).toBe(false);
    expect(isValidCharacter(42)).toBe(false);
  });
});

describe('datos de personajes (cliente)', () => {
  it('coinciden con los personajes que conoce el servidor', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(CHARACTER_IDS);
  });

  it('tienen todos los datos que usan las tarjetas y el chat', () => {
    for (const character of CHARACTERS) {
      expect(character.name.length).toBeGreaterThan(3);
      expect(character.description.length).toBeGreaterThan(20);
      expect(character.greeting.length).toBeGreaterThan(10);
      expect(character.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(character.suggestions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('el cliente no contiene los prompts de sistema', () => {
    for (const character of CHARACTERS) {
      expect(Object.keys(character)).not.toContain('systemPrompt');
    }
  });

  it('getCharacter busca por id', () => {
    expect(getCharacter('sanmartin').shortName).toBe('San Martín');
    expect(getCharacter('nadie')).toBeUndefined();
  });
});
