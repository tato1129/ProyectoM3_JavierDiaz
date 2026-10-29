import { ROUTES, createRouter } from './router.js';
import { getTheme, toggleTheme } from './theme.js';
import { h } from './utils/dom.js';
import { icon } from './utils/icons.js';
import { HomeView } from './views/home.js';
import { CharactersView } from './views/characters.js';
import { ChatView } from './views/chat.js';
import { AboutView } from './views/about.js';
import { NotFoundView } from './views/notFound.js';

const NAV_ICONS = { home: 'home', characters: 'users', chat: 'chat', about: 'info' };

const nav = document.getElementById('nav');
const themeButton = document.getElementById('theme-toggle');

function renderNav(currentName) {
  nav.replaceChildren(
    ...ROUTES.map((route) =>
      h(
        'a',
        {
          class: 'nav__link',
          href: route.path,
          'data-link': true,
          'aria-current': route.name === currentName ? 'page' : null,
        },
        icon(NAV_ICONS[route.name]),
        h('span', {}, route.title),
      ),
    ),
  );
}

function renderThemeButton() {
  const dark = getTheme() === 'dark';
  themeButton.replaceChildren(icon(dark ? 'sun' : 'moon'));
  themeButton.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  themeButton.setAttribute('title', dark ? 'Modo claro' : 'Modo oscuro');
}

themeButton.addEventListener('click', () => {
  toggleTheme();
  renderThemeButton();
});

renderThemeButton();

createRouter({
  outlet: document.getElementById('app'),
  views: {
    home: HomeView,
    characters: CharactersView,
    chat: ChatView,
    about: AboutView,
    notFound: NotFoundView,
  },
  onRouteChange: (route) => renderNav(route?.name),
}).start();
