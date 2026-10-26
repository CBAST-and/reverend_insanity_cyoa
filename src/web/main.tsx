import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { buildIdFromPath, fetchBuild } from './api';
import { setContent } from './content-store';
import { loadContent } from '../shared';
import '@fontsource/zen-old-mincho/latin-500.css';
import '@fontsource/zen-old-mincho/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './styles.css';

/** Carga el contenido publicado; si la URL es /b/:id, el de la versión con la que se creó ese build. */
async function loadPublishedContent(): Promise<void> {
  try {
    const id = buildIdFromPath(window.location.pathname);
    const version = id === null ? null : (await fetchBuild(id)).contentVersion;
    const response = await fetch(version === null ? '/api/content' : `/api/content/${encodeURIComponent(version)}`);
    if (response.ok) setContent(loadContent((await response.json()) as unknown));
  } catch {
    /* sin servidor o sin red: se usa el contenido incluido en la web */
  }
}

async function start(): Promise<void> {
  const container = document.getElementById('root');
  if (container === null) throw new Error('Could not find the #root element');
  const root = createRoot(container);

  if (window.location.pathname.startsWith('/admin')) {
    const { default: Admin } = await import('./Admin');
    root.render(
      <StrictMode>
        <Admin />
      </StrictMode>,
    );
    return;
  }

  await loadPublishedContent();
  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
