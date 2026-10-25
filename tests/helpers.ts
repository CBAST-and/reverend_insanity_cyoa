import contentJson from '../content/content.json';
import {
  applyAction,
  createEmptySelections,
  evaluateBuild,
  loadContent,
  parseSelections,
  type ActionError,
  type BuildAction,
  type BuildEvaluation,
  type BuildSelections,
  type RemovedItem,
} from '../src/shared';

export const content = loadContent(contentJson as unknown);

export interface RunResult {
  readonly selections: BuildSelections;
  readonly removed: readonly RemovedItem[];
}

/** Aplica acciones en orden; si alguna falla, la prueba falla con el código del error. */
export function run(actions: readonly BuildAction[], start?: BuildSelections): RunResult {
  let selections = start ?? createEmptySelections();
  const removed: RemovedItem[] = [];
  for (const action of actions) {
    const result = applyAction(content, selections, action);
    if (!result.ok) {
      throw new Error(`La acción ${JSON.stringify(action)} falló con ${JSON.stringify(result.error)}`);
    }
    selections = result.selections;
    removed.push(...result.removed);
  }
  return { selections, removed };
}

/** Aplica una acción y devuelve el error esperado (falla si la acción tuvo éxito). */
export function expectError(action: BuildAction, start: BuildSelections): ActionError {
  const result = applyAction(content, start, action);
  if (result.ok) {
    throw new Error(`Se esperaba un error, pero ${JSON.stringify(action)} tuvo éxito`);
  }
  return result.error;
}

export function evaluate(selections: BuildSelections): BuildEvaluation {
  return evaluateBuild(content, selections);
}

/** Simula guardar y recargar: serializa, valida la forma y vuelve a evaluar. */
export function roundTrip(selections: BuildSelections): BuildSelections {
  const parsed = parseSelections(JSON.parse(JSON.stringify(selections)) as unknown);
  if (!parsed.ok) throw new Error(`El round trip produjo selecciones inválidas: ${parsed.errors.join('; ')}`);
  return parsed.selections;
}

/* Atajos de acciones frecuentes */

export const mode = (modeId: string): BuildAction => ({ type: 'setMode', modeId });

export const single = (
  category: Extract<BuildAction, { type: 'selectSingle' }>['category'],
  optionId: string | null,
): BuildAction => ({ type: 'selectSingle', category, optionId });

export const toggle = (
  category: Extract<BuildAction, { type: 'toggleMultiple' }>['category'],
  optionId: string,
): BuildAction => ({ type: 'toggleMultiple', category, optionId });

export const count = (
  category: Extract<BuildAction, { type: 'setCount' }>['category'],
  optionId: string,
  amount: number,
): BuildAction => ({ type: 'setCount', category, optionId, count: amount });

export const attain = (
  pathId: string,
  level: Extract<BuildAction, { type: 'setAttainment' }>['level'],
): BuildAction => ({ type: 'setAttainment', pathId, level });
