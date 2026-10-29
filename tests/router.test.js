import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, matchRoute, normalizePath } from '../src/router.js';

describe('normalizePath', () => {
  it('quita barra final, query y hash', () => {
    expect(normalizePath('/chat/')).toBe('/chat');
    expect(normalizePath('/chat?personaje=maradona')).toBe('/chat');
    expect(normalizePath('/about#equipo')).toBe('/about');
  });

  it('mantiene la raíz', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });
});

describe('matchRoute', () => {
  it('reconoce las rutas principales', () => {
    expect(matchRoute('/home').route.name).toBe('home');
    expect(matchRoute('/characters').route.name).toBe('characters');
    expect(matchRoute('/chat').route.name).toBe('chat');
    expect(matchRoute('/about').route.name).toBe('about');
  });

  it('redirige "/" a /home', () => {
    expect(matchRoute('/').redirect).toBe('/home');
  });

  it('marca como no encontradas las rutas desconocidas', () => {
    expect(matchRoute('/nada').notFound).toBe(true);
  });
});

describe('createRouter', () => {
  let outlet;
  let router;
  let views;
  let onRouteChange;

  const text = (label) => () => {
    const el = document.createElement('p');
    el.textContent = label;
    return el;
  };

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = '';
    outlet = document.createElement('main');
    outlet.tabIndex = -1;
    document.body.append(outlet);

    views = {
      home: vi.fn(text('vista home')),
      characters: vi.fn(text('vista personajes')),
      chat: vi.fn(text('vista chat')),
      about: vi.fn(text('vista about')),
      notFound: vi.fn(text('vista 404')),
    };
    onRouteChange = vi.fn();
    router = createRouter({ outlet, views, onRouteChange });
  });

  afterEach(() => {
    router.stop();
  });

  function clickLink(href, init = {}) {
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('data-link', '');
    document.body.append(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    link.dispatchEvent(event);
    return event;
  }

  it('al iniciar en "/" redirige a /home y dibuja la vista', () => {
    router.start();
    expect(window.location.pathname).toBe('/home');
    expect(outlet.textContent).toBe('vista home');
    expect(document.title).toContain('Inicio');
  });

  it('navega con la History API sin recargar la página', () => {
    router.start();
    const pushState = vi.spyOn(window.history, 'pushState');
    router.navigate('/about');
    expect(pushState).toHaveBeenCalled();
    expect(window.location.pathname).toBe('/about');
    expect(outlet.textContent).toBe('vista about');
  });

  it('intercepta los clicks en links con data-link', () => {
    router.start();
    const event = clickLink('/characters');
    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe('/characters');
    expect(outlet.textContent).toBe('vista personajes');
  });

  it('no intercepta clicks con Ctrl/Cmd (abrir en otra pestaña)', () => {
    router.start();
    const event = clickLink('/about', { ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(window.location.pathname).toBe('/home');
  });

  it('pasa los parámetros de la URL a la vista', () => {
    router.start();
    router.navigate('/chat?personaje=favaloro');
    const context = views.chat.mock.calls[0][0];
    expect(context.params.get('personaje')).toBe('favaloro');
  });

  it('responde a atrás/adelante (popstate)', () => {
    router.start();
    router.navigate('/about');
    window.history.replaceState({}, '', '/characters');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(outlet.textContent).toBe('vista personajes');
  });

  it('muestra la vista 404 en rutas desconocidas', () => {
    window.history.replaceState({}, '', '/inexistente');
    router.start();
    expect(outlet.textContent).toBe('vista 404');
    expect(onRouteChange).toHaveBeenCalledWith(null);
  });

  it('avisa la ruta actual para resaltar la navegación', () => {
    router.start();
    expect(onRouteChange.mock.calls[0][0].name).toBe('home');
  });

  it('ejecuta las limpiezas de la vista al salir de ella', () => {
    const cleanup = vi.fn();
    views.home = vi.fn(({ onCleanup }) => {
      onCleanup(cleanup);
      return document.createElement('div');
    });
    router = createRouter({ outlet, views, onRouteChange });
    router.start();
    expect(cleanup).not.toHaveBeenCalled();
    router.navigate('/about');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a dibujar si se navega a la misma URL', () => {
    router.start();
    router.navigate('/about');
    router.navigate('/about');
    expect(views.about).toHaveBeenCalledTimes(1);
  });
});
