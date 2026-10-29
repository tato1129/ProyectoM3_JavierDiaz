# Charlas con la Historia

SPA mobile-first para chatear con **Diego Armando Maradona**, el **Dr. René Gerónimo Favaloro** y el **General José de San Martín** usando Google Gemini. La API key vive solo en el servidor (Vercel Function `api/chat.js`) y nunca llega al navegador.

- Rutas (History API): `/home`, `/characters`, `/chat`, `/about`
- Extra credit implementado: historial en localStorage + borrar historial, galería de personajes, timestamps, "escribiendo…" animado, Enter para enviar, copiar respuesta, modo oscuro/claro
- Stack: Vite + JavaScript vanilla, Vitest (+ jsdom) para tests, Vercel para el deploy

## Estructura

```
api/chat.js            Función serverless: llama a Gemini con la key del servidor
api/_lib/prompts.js    System prompt de cada personaje
src/                   SPA (router, vistas, store, tema, cliente de la API)
tests/                 Tests unitarios (Vitest)
dev/api-middleware.js  Hace que `npm run dev` también sirva /api/chat
vercel.json            Rewrites del SPA + config de la función
```

# ProyectoM3_JavierDiaz
