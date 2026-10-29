// Router de la SPA basado en la History API (pushState / popstate): navega sin recargar la página,
// la URL refleja la vista actual y los botones atrás/adelante del navegador funcionan.

export const ROUTES = [
  { path: '/home', name: 'home', title: 'Inicio' },
  { path: '/characters', name: 'characters', title: 'Personajes' },
  { path: '/chat', name: 'chat', title: 'Chat' },
  { path: '/about', name: 'about', title: 'Acerca de' },
];

export const APP_TITLE = 'Charlas con la Historia';

/** Quita query, hash y barras finales: "/chat/?a=1#x" -> "/chat". */
export function normalizePath(pathname) {
  let path = String(pathname || '/').split('#')[0].split('?')[0];
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

/** Resuelve una ruta: { route } si existe, { redirect } para "/" y { notFound } en cualquier otro caso. */
export function matchRoute(pathname) {
  const path = normalizePath(pathname);
  if (path === '/') return { redirect: '/home' };
  const route = ROUTES.find((candidate) => candidate.path === path);
  return route ? { route } : { notFound: true };
}

/**
 * Crea el router.
 * - outlet: elemento donde se dibuja la vista.
 * - views: { [nombreDeRuta]: (ctx) => HTMLElement, notFound: ... }
 *   ctx = { params: URLSearchParams, navigate, onCleanup(fn) }
 * - onRouteChange(route|null): se llama después de dibujar cada vista.
 */
export function createRouter({ outlet, views, onRouteChange = () => {} }) {
  let cleanups = [];

  function runCleanups() {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        // Un error al limpiar una vista no debe romper la navegación.
      }
    }
    cleanups = [];
  }

  function render() {
    const { pathname, search } = window.location;
    const match = matchRoute(pathname);

    if (match.redirect) {
      window.history.replaceState({}, '', match.redirect + search);
      return render();
    }

    runCleanups();

    const route = match.route ?? null;
    const view = views[route ? route.name : 'notFound'];
    const context = {
      params: new URLSearchParams(search),
      navigate,
      onCleanup: (fn) => cleanups.push(fn),
    };

    outlet.replaceChildren(view(context));
    document.title = route ? `${route.title} · ${APP_TITLE}` : `Página no encontrada · ${APP_TITLE}`;
    outlet.scrollTop = 0;
    outlet.focus({ preventScroll: true });
    onRouteChange(route);
  }

  function navigate(to, { replace = false } = {}) {
    const url = new URL(to, window.location.origin);
    if (url.origin !== window.location.origin) {
      window.location.assign(to);
      return;
    }
    const target = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (target === current) return; // misma URL: no se vuelve a dibujar (no se pierde el estado)
    window.history[replace ? 'replaceState' : 'pushState']({}, '', target);
    render();
  }

  // Intercepta los clicks en <a data-link> para navegar con la History API en vez de recargar.
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[data-link]') : null;
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    event.preventDefault();
    navigate(link.getAttribute('href'));
  }

  return {
    start() {
      document.addEventListener('click', onClick);
      window.addEventListener('popstate', render);
      render();
    },
    stop() {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', render);
      runCleanups();
    },
    navigate,
  };
}
