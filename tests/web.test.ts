import { describe, expect, it } from 'vitest';
import { buildIdFromPath, editUrl, publicUrl, tokenFromHash } from '../src/web/api';

const TOKEN = 'A'.repeat(43);

describe('Rutas y enlaces de la web', () => {
  it('reconoce /b/:id solo con ids de 8 caracteres alfanuméricos', () => {
    expect(buildIdFromPath('/b/k3x9Qm7P')).toBe('k3x9Qm7P');
    expect(buildIdFromPath('/b/k3x9Qm7P/')).toBe('k3x9Qm7P');
    expect(buildIdFromPath('/')).toBeNull();
    expect(buildIdFromPath('/b/corto')).toBeNull();
    expect(buildIdFromPath('/b/k3x9Qm7P/extra')).toBeNull();
    expect(buildIdFromPath('/b/con-guion')).toBeNull();
  });

  it('extrae el token de #edit= solo si tiene el formato correcto', () => {
    expect(tokenFromHash(`#edit=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash(`edit=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash('#edit=corto')).toBeNull();
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash(`#otro=${TOKEN}`)).toBeNull();
  });

  it('arma enlaces coherentes con las rutas que reconoce', () => {
    const url = editUrl('https://cyoa.test', 'k3x9Qm7P', TOKEN);
    expect(url).toBe(`https://cyoa.test/b/k3x9Qm7P#edit=${TOKEN}`);
    const parsed = new URL(url);
    expect(buildIdFromPath(parsed.pathname)).toBe('k3x9Qm7P');
    expect(tokenFromHash(parsed.hash)).toBe(TOKEN);
    expect(publicUrl('https://cyoa.test', 'k3x9Qm7P')).toBe('https://cyoa.test/b/k3x9Qm7P');
  });
});
