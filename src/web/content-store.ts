import contentJson from '../../content/content.json';
import { CATEGORY_ORDER, loadContent, type CyoaContent } from '../shared';

/**
 * Contenido que usa la interfaz. Arranca con el incluido en la web (sirve sin conexión)
 * y main.tsx lo reemplaza antes de renderizar por el que publica la API.
 * `content` es un enlace vivo: quien lo importa ve siempre el valor actual.
 */
export let content: CyoaContent = loadContent(contentJson as unknown);

let names: Map<string, string> | null = null;

export function setContent(next: CyoaContent): void {
  content = next;
  names = null;
}

export function optionName(id: string): string {
  if (names === null) {
    names = new Map();
    for (const key of CATEGORY_ORDER) {
      for (const option of content.categories[key].options) names.set(option.id, option.name);
    }
  }
  return names.get(id) ?? id;
}
