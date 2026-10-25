import { useEffect, useMemo, useReducer, useState, type ReactElement } from 'react';
import {
  ATTAINMENT_LEVELS,
  CATEGORY_ORDER,
  MAX_INPUT_LENGTH,
  applyAction,
  createEmptySelections,
  evaluateBuild,
  isSingleCategory,
  normalizeSelections,
  parseSelections,
  type ActionError,
  type AttainmentLevel,
  type BlockReason,
  type BuildAction,
  type BuildEvaluation,
  type BuildSelections,
  type CategoryKey,
  type CostLine,
  type CyoaOption,
} from '../shared';
import { content, optionName } from './content-store';
import {
  ApiRequestError,
  buildIdFromPath,
  createBuild,
  editUrl,
  fetchBuild,
  getToken,
  publicUrl,
  saveToken,
  tokenFromHash,
  updateBuild,
} from './api';

const STORAGE_KEY = 'ri-cyoa:build:v1';
const nameOf = optionName;

/* ------------------------------ Estado ------------------------------ */

interface State {
  readonly selections: BuildSelections;
  readonly notice: string | null;
}

function loadSaved(): BuildSelections {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createEmptySelections();
    const parsed = parseSelections(JSON.parse(raw) as unknown);
    return parsed.ok ? normalizeSelections(content, parsed.selections).selections : createEmptySelections();
  } catch {
    return createEmptySelections();
  }
}

function describeReason(reason: BlockReason): string {
  switch (reason.code) {
    case 'category_disabled':
      return 'Otra elección deshabilita esta sección.';
    case 'requirement_unmet':
      return `Requiere: ${reason.missing.map(nameOf).join(', ')}.`;
    case 'conflict':
      return `Es incompatible con: ${reason.with.map(nameOf).join(', ')}.`;
    case 'max_count':
      return `Máximo ${reason.max}.`;
  }
}

function describeError(error: ActionError): string {
  if (error.code === 'option_blocked') return (error.reasons ?? []).map(describeReason).join(' ');
  const messages: Partial<Record<ActionError['code'], string>> = {
    option_granted: 'Ya la tienes gratis por otra opción.',
    max_count_exceeded: 'Llegaste al máximo de veces.',
    attainment_limit_exceeded: 'Llegaste al límite de ese nivel.',
    attainment_below_baseline: 'Ese nivel ya lo tienes incluido.',
    grab_bag_over_limit: 'Ya elegiste todos los ítems del bundle.',
    grab_bag_without_bundle: 'Primero elige un bundle de Grab Bag.',
  };
  return messages[error.code] ?? 'No se puede hacer ese cambio.';
}

type AppAction =
  | BuildAction
  | { readonly type: 'load'; readonly selections: BuildSelections }
  | { readonly type: 'notify'; readonly text: string };

function reducer(state: State, action: AppAction): State {
  if (action.type === 'load') return { selections: action.selections, notice: null };
  if (action.type === 'notify') return { ...state, notice: action.text };
  const result = applyAction(content, state.selections, action);
  if (!result.ok) return { ...state, notice: describeError(result.error) };
  const removed = result.removed.length;
  return {
    selections: result.selections,
    notice: removed > 0 ? `Se quitaron ${removed} elemento(s) que dependían de ese cambio.` : null,
  };
}

/* ------------------------------ Componentes ------------------------------ */

const formatCost = (cost: number): string => (cost > 0 ? `+${cost}` : cost < 0 ? `−${-cost}` : '0');

function OptionCard(props: {
  readonly option: CyoaOption;
  readonly categoryKey: CategoryKey;
  readonly evaluation: BuildEvaluation;
  readonly selections: BuildSelections;
  readonly dispatch: (action: BuildAction) => void;
}): ReactElement {
  const { option, categoryKey, evaluation, selections, dispatch } = props;
  const state = evaluation.optionStates[option.id];
  const selected = state?.selected === true;
  const granted = state?.granted === true;
  const blocked = !selected && !granted && state?.selectable === false;

  const onClick = (): void => {
    if (isSingleCategory(categoryKey)) {
      dispatch({ type: 'selectSingle', category: categoryKey, optionId: selected ? null : option.id });
    } else {
      dispatch({ type: 'toggleMultiple', category: categoryKey, optionId: option.id });
    }
  };

  const setCount = (count: number): void => {
    if (!isSingleCategory(categoryKey)) {
      dispatch({ type: 'setCount', category: categoryKey, optionId: option.id, count });
    }
  };

  return (
    <div className="entry" role="group" aria-label={option.name} data-selected={selected || granted} data-blocked={blocked}>
      <button
        type="button"
        className="entry-main"
        aria-pressed={selected || granted}
        aria-disabled={blocked}
        onClick={onClick}
      >
        <span className="entry-name">{option.name}</span>
        <span className="entry-cost" data-sign={option.cost > 0 ? 'gain' : 'spend'}>
          {formatCost(option.cost)}
        </span>
        <span className="entry-desc">{option.description}</span>
        {granted && <span className="entry-note">Gratis por otra opción</span>}
      </button>
      <span className="seal" aria-hidden="true">
        蛊
      </span>
      {option.repeatable === true && selected && (
        <div className="count">
          <button type="button" aria-label="Quitar una" onClick={() => setCount((state?.count ?? 1) - 1)}>
            −
          </button>
          <span aria-live="polite">{state?.count ?? 1}</span>
          <button type="button" aria-label="Agregar una" onClick={() => setCount((state?.count ?? 1) + 1)}>
            +
          </button>
        </div>
      )}
      {option.input !== undefined && selected && (
        <label className="desc extras">
          {option.input.label}
          <textarea
            rows={3}
            maxLength={MAX_INPUT_LENGTH}
            style={{ width: '100%' }}
            value={selections.inputs[option.id] ?? ''}
            onChange={(event) => dispatch({ type: 'setInput', optionId: option.id, text: event.target.value })}
          />
        </label>
      )}
    </div>
  );
}

const LEVEL_LABEL: Record<AttainmentLevel, string> = {
  master: 'Master',
  grandmaster: 'Grandmaster',
  greatgrandmaster: 'Great Grandmaster',
};

const toLevel = (value: string): AttainmentLevel | null => ATTAINMENT_LEVELS.find((level) => level === value) ?? null;

interface PanelProps {
  readonly selections: BuildSelections;
  readonly evaluation: BuildEvaluation;
  readonly dispatch: (action: BuildAction) => void;
}

function ClanStatusPicker(props: PanelProps): ReactElement | null {
  const { selections, evaluation, dispatch } = props;
  if (evaluation.clanStatusOptions.length === 0) return null;
  return (
    <section aria-labelledby="clan-status-title">
      <h2 id="clan-status-title">Estatus del clan</h2>
      <div className="grid">
        {evaluation.clanStatusOptions.map((status) => {
          const on = selections.clanStatusId === status.id;
          return (
            <button
              key={status.id}
              type="button"
              className="card"
              aria-pressed={on}
              onClick={() => dispatch({ type: 'setClanStatus', statusId: on ? null : status.id })}
            >
              <span className="name">
                <span>{status.name}</span>
                <span className={status.cost > 0 ? 'cost gain' : 'cost'}>{formatCost(status.cost)} CP</span>
              </span>
              {status.description !== undefined && <span className="desc">{status.description}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GrabBagPicker(props: PanelProps): ReactElement {
  const { selections, dispatch } = props;
  const bundleId = selections.single.grabBagBundles;
  const allowed =
    bundleId === null ? null : (content.categories.grabBagBundles.options.find((option) => option.id === bundleId)?.picks ?? null);
  if (allowed === null) return <p className="desc">Elige un bundle para poder escoger ítems.</p>;
  return (
    <section aria-labelledby="grab-bag-title">
      <h2 id="grab-bag-title">
        Ítems del Grab Bag ({selections.grabBagItemIds.length}/{allowed})
      </h2>
      <div className="grid">
        {content.grabBagItems.map((item) => {
          const on = selections.grabBagItemIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="card"
              aria-pressed={on}
              onClick={() => dispatch({ type: 'toggleGrabBagItem', itemId: item.id })}
            >
              <span className="name">{item.name}</span>
              <span className="desc">{item.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AttainmentsPanel(props: PanelProps): ReactElement {
  const { selections, evaluation, dispatch } = props;
  const { levels } = evaluation.attainment;
  return (
    <section aria-labelledby="attainments-title">
      <h2 id="attainments-title">Attainments</h2>
      <p className="desc">
        {ATTAINMENT_LEVELS.map((level) => {
          const info = levels[level];
          const used = `${info.used}${info.max === null ? '' : `/${info.max}`}`;
          return `${LEVEL_LABEL[level]}: ${used} · ${info.price === null ? 'incluido' : `${info.price} CP`}`;
        }).join('   |   ')}
      </p>
      <div className="grid">
        {content.paths.map((pathId) => (
          <label key={pathId} className="card">
            <span className="name">{pathId}</span>
            <select
              value={selections.attainments[pathId] ?? ''}
              onChange={(event) => dispatch({ type: 'setAttainment', pathId, level: toLevel(event.target.value) })}
            >
              <option value="">Sin attainment</option>
              {ATTAINMENT_LEVELS.map((level) => (
                <option key={level} value={level} disabled={levels[level].price === null}>
                  {LEVEL_LABEL[level]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function lineLabel(line: CostLine): string {
  switch (line.kind) {
    case 'option':
      return `${line.name}${line.count > 1 ? ` ×${line.count}` : ''}${line.granted ? ' (gratis)' : ''}`;
    case 'clanStatus':
      return line.name;
    case 'surcharge':
      return `Recargo de ${content.categories[line.categoryKey].title} (+${line.extraPicks})`;
    case 'attainment':
      return `Attainment ${line.pathId}: ${line.level}`;
  }
}

function Summary(props: { readonly evaluation: BuildEvaluation }): ReactElement {
  const { evaluation } = props;
  return (
    <section aria-labelledby="summary-title">
      <h2 id="summary-title">Resumen</h2>
      {evaluation.lines.length === 0 ? (
        <p className="desc">Todavía no elegiste nada.</p>
      ) : (
        <table className="ledger">
          <tbody>
            {evaluation.lines.map((line, position) => (
              <tr key={`${line.kind}-${position}`}>
                <td>{lineLabel(line)}</td>
                <td>{formatCost(line.total)} CP</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Puntos disponibles</strong>
              </td>
              <td>
                <strong>{evaluation.availablePoints} CP</strong>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {evaluation.availablePoints < 0 && <p className="warn">Te pasaste del presupuesto por {-evaluation.availablePoints} CP.</p>}
    </section>
  );
}

type Tab = CategoryKey | 'attainments' | 'summary';

/** Cuántas elecciones y cuántos puntos lleva cada sección (alimenta la barra lateral). */
function sectionTotals(evaluation: BuildEvaluation): Map<Tab, { count: number; total: number }> {
  const totals = new Map<Tab, { count: number; total: number }>();
  for (const line of evaluation.lines) {
    const key: Tab =
      line.kind === 'option' || line.kind === 'surcharge'
        ? line.categoryKey
        : line.kind === 'clanStatus'
          ? 'clanTier'
          : 'attainments';
    const entry = totals.get(key) ?? { count: 0, total: 0 };
    entry.total += line.total;
    if ((line.kind === 'option' && !line.granted) || line.kind === 'attainment') entry.count += 1;
    totals.set(key, entry);
  }
  return totals;
}

/* ------------------------------ Aplicación ------------------------------ */

const messageOf = (error: unknown): string =>
  error instanceof ApiRequestError || error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

interface Session {
  readonly id: string | null;
  readonly token: string | null;
}

export default function App(): ReactElement {
  const [state, dispatch] = useReducer(reducer, null, (): State => ({ selections: loadSaved(), notice: null }));
  const [session, setSession] = useState<Session>({ id: null, token: null });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('timeline');
  const evaluation = useMemo(() => evaluateBuild(content, state.selections), [state.selections]);
  const totals = useMemo(() => sectionTotals(evaluation), [evaluation]);

  // El borrador local solo se guarda mientras no se está viendo un build compartido.
  useEffect(() => {
    if (session.id !== null) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selections));
    } catch {
      /* almacenamiento no disponible: se sigue sin guardar */
    }
  }, [state.selections, session.id]);

  // Al abrir /b/:id se carga el build; si la URL trae #edit=<token>, se guarda y se quita de la barra.
  useEffect(() => {
    const id = buildIdFromPath(window.location.pathname);
    if (id === null) return;
    const fromHash = tokenFromHash(window.location.hash);
    if (fromHash !== null) {
      saveToken(id, fromHash);
      window.history.replaceState(null, '', window.location.pathname);
    }
    const token = getToken(id);
    fetchBuild(id)
      .then((view) => {
        if (view.contentVersion !== content.contentVersion) {
          dispatch({
            type: 'notify',
            text: `Este build usa la versión de contenido ${view.contentVersion}, que esta interfaz no incluye.`,
          });
          return;
        }
        dispatch({ type: 'load', selections: normalizeSelections(content, view.selections).selections });
        setSession({ id, token });
      })
      .catch((error: unknown) => dispatch({ type: 'notify', text: messageOf(error) }));
  }, []);

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      if (session.id !== null && session.token !== null) {
        await updateBuild(session.id, session.token, state.selections);
        dispatch({ type: 'notify', text: 'Cambios guardados.' });
      } else {
        const created = await createBuild(state.selections);
        saveToken(created.id, created.editToken);
        window.history.pushState(null, '', `/b/${created.id}`);
        setSession({ id: created.id, token: created.editToken });
        dispatch({
          type: 'notify',
          text: 'Guardado. Copia el enlace de edición: sin él no podrás modificar este build desde otro navegador.',
        });
      }
    } catch (error) {
      dispatch({ type: 'notify', text: messageOf(error) });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch({ type: 'notify', text: `${label} copiado.` });
    } catch {
      dispatch({ type: 'notify', text: 'No se pudo copiar; usa la dirección de la barra del navegador.' });
    }
  };

  // Recarga la página para volver al contenido vigente (el build abierto pudo usar una versión anterior).
  const startNew = (): void => {
    window.location.assign('/');
  };

  const category = tab === 'summary' || tab === 'attainments' ? null : content.categories[tab];

  const tabButton = (id: Tab, label: string): ReactElement => {
    const entry = totals.get(id);
    return (
      <button
        key={id}
        type="button"
        role="tab"
        className="tab"
        aria-selected={tab === id}
        aria-label={entry === undefined || entry.count === 0 ? label : `${label}, ${entry.count} elegidas`}
        onClick={() => setTab(id)}
      >
        <span>{label}</span>
        {entry !== undefined && entry.count > 0 && <span className="num">{formatCost(entry.total)}</span>}
      </button>
    );
  };

  return (
    <div className="sheet">
      <aside className="rail">
        <div>
          <h1 className="brand">Reverend Insanity</h1>
          <p className="brand-sub">Hoja de personaje</p>
        </div>

        <div>
          <p className={evaluation.availablePoints < 0 ? 'points over' : 'points'} aria-live="polite">
            {evaluation.availablePoints}
          </p>
          <p className="points-label">puntos disponibles</p>
        </div>

        <div className="modes" role="group" aria-label="Dificultad">
          {content.modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className="mode"
              aria-pressed={state.selections.modeId === mode.id}
              title={mode.description}
              onClick={() => dispatch({ type: 'setMode', modeId: mode.id })}
            >
              <span>{mode.name}</span>
              <span className="num">{mode.points}</span>
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" className="chip" disabled={busy} onClick={() => void save()}>
            {session.token !== null ? 'Guardar cambios' : 'Guardar y compartir'}
          </button>
          {session.id !== null && (
            <button type="button" className="chip" onClick={() => void copy(publicUrl(window.location.origin, session.id ?? ''), 'Enlace')}>
              Copiar enlace
            </button>
          )}
          {session.id !== null && session.token !== null && (
            <button
              type="button"
              className="chip"
              onClick={() => void copy(editUrl(window.location.origin, session.id ?? '', session.token ?? ''), 'Enlace de edición')}
            >
              Copiar enlace de edición
            </button>
          )}
          {session.id !== null && (
            <button type="button" className="chip" onClick={startNew}>
              Nuevo
            </button>
          )}
        </div>
        {session.id !== null && session.token === null && (
          <p className="desc">Solo lectura: al guardar se crea tu propia copia.</p>
        )}

        <nav className="sections" role="tablist" aria-orientation="vertical" aria-label="Secciones">
          {CATEGORY_ORDER.map((key) => tabButton(key, content.categories[key].title))}
          {tabButton('attainments', 'Attainments')}
          {tabButton('summary', 'Resumen')}
        </nav>
      </aside>

      <main>
        {tab === 'summary' ? (
          <Summary evaluation={evaluation} />
        ) : tab === 'attainments' || category === null ? (
          <AttainmentsPanel selections={state.selections} evaluation={evaluation} dispatch={dispatch} />
        ) : (
          <section role="tabpanel" aria-label={category.title}>
            <h2>{category.title}</h2>
            {category.description !== undefined && <p className="desc">{category.description}</p>}
            <div className="entries">
              {category.options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  categoryKey={tab}
                  evaluation={evaluation}
                  selections={state.selections}
                  dispatch={dispatch}
                />
              ))}
            </div>
            {tab === 'clanTier' && <ClanStatusPicker selections={state.selections} evaluation={evaluation} dispatch={dispatch} />}
            {tab === 'grabBagBundles' && <GrabBagPicker selections={state.selections} evaluation={evaluation} dispatch={dispatch} />}
          </section>
        )}

        <footer className="credits">
          <p>
            Basado en el CYOA de alphanumericsprawl, con contribuciones de GashGrunt y smie27. Premium Gu de unlanned y
            WHOiAM981213. Versión interactiva original de WiseBein. Sobre la novela Reverend Insanity de Gu Zhen Ren.
          </p>
          <p>
            Contenido bajo{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer noopener">
              CC BY-SA 4.0
            </a>
            .
          </p>
        </footer>
      </main>

      {state.notice !== null && (
        <div className="notice" role="status">
          {state.notice}
        </div>
      )}
    </div>
  );
}
