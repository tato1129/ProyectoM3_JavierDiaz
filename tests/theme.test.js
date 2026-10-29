import { beforeEach, describe, expect, it } from 'vitest';
import { getTheme, setTheme, toggleTheme } from '../src/theme.js';

describe('tema claro/oscuro', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  });

  it('aplica el tema y lo guarda en localStorage', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('chat-personajes:theme')).toBe('dark');
  });

  it('actualiza el color de la barra del navegador', () => {
    setTheme('dark');
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#152232');
    setTheme('light');
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#ffffff');
  });

  it('alterna entre claro y oscuro', () => {
    setTheme('light');
    expect(toggleTheme()).toBe('dark');
    expect(toggleTheme()).toBe('light');
  });

  it('usa "light" si recibe un valor inválido', () => {
    expect(setTheme('rosa')).toBe('light');
  });

  it('lee el tema guardado cuando el documento no tiene uno', () => {
    window.localStorage.setItem('chat-personajes:theme', 'dark');
    expect(getTheme()).toBe('dark');
  });
});
