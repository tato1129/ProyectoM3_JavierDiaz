import { defineConfig, loadEnv } from 'vite';
import { createApiMiddleware } from './dev/api-middleware.js';

// En desarrollo (npm run dev) Vite también atiende POST /api/chat ejecutando api/chat.js.
// En producción esa ruta la sirve Vercel como función serverless.
function vercelApiDev(env) {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      // Las variables del archivo .env (sin prefijo VITE_) se cargan solo en el proceso del
      // servidor: Vite no las incluye en el código que recibe el navegador.
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
      server.middlewares.use(
        '/api/chat',
        createApiMiddleware(async () => (await server.ssrLoadModule('/api/chat.js')).default),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vercelApiDev(env)],
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.js'],
    },
  };
});
