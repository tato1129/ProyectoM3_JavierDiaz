// Modo claro / oscuro. El tema se guarda en localStorage y, si no hay preferencia guardada,
// se usa la del sistema operativo (prefers-color-scheme).

const THEME_KEY = 'chat-personajes:theme';
const THEME_COLORS = { light: '#ffffff', dark: '#152232' };

function isTheme(value) {
  return value === 'light' || value === 'dark';
}

export function getTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (isTheme(current)) return current;

  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // Sin almacenamiento: se usa la preferencia del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  const next = isTheme(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[next]);
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Sin almacenamiento: el cambio vale solo para esta sesión.
  }
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
