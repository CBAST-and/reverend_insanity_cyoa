import { useEffect, useMemo, useReducer, useState, type ReactElement } from 'react';
import {
  ATTAINMENT_LEVELS,
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
import { LEVEL_LABEL, formatCost, pathLabel } from './labels';
import { TAB_GROUPS, type GroupId, type TabGroup } from './layout';
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
      return 'Another choice disables this section.';
    case 'requirement_unmet':
      return `Requires: ${reason.missing.map(nameOf).join(', ')}.`;
    case 'conflict':
      return `Incompatible with: ${reason.with.map(nameOf).join(', ')}.`;
    case 'max_count':
      return `Maximum ${reason.max}.`;
  }
}

function describeError(error: ActionError): string {
  if (error.code === 'option_blocked') return (error.reasons ?? []).map(describeReason).join(' ');
  const messages: Partial<Record<ActionError['code'], string>> = {
    option_granted: 'You already get this for free from another option.',
    max_count_exceeded: 'You reached the maximum.',
    attainment_limit_exceeded: 'You reached the limit for that level.',
    attainment_below_baseline: 'That level is already included.',
    grab_bag_over_limit: 'You already picked every item in the bundle.',
    grab_bag_without_bundle: 'Pick a Grab Bag bundle first.',
  };
  return messages[error.code] ?? 'That change is not possible.';
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
    notice: removed > 0 ? `Removed ${removed} choice(s) that depended on that change.` : null,
  };
}

/* ------------------------------ Componentes ------------------------------ */


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
        {granted && <span className="entry-note">Free from another option</span>}
      </button>
      <span className="seal" aria-hidden="true">
        蛊
      </span>
      {option.repeatable === true && selected && (
        <div className="count">
          <button type="button" aria-label="Remove one" onClick={() => setCount((state?.count ?? 1) - 1)}>
            −
          </button>
          <span aria-live="polite">{state?.count ?? 1}</span>
          <button type="button" aria-label="Add one" onClick={() => setCount((state?.count ?? 1) + 1)}>
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
      <h2 id="clan-status-title">Clan Status</h2>
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
  if (allowed === null) return <p className="desc">Pick a bundle to choose items.</p>;
  return (
    <section aria-labelledby="grab-bag-title">
      <h2 id="grab-bag-title">
        Grab Bag items ({selections.grabBagItemIds.length}/{allowed})
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
          return `${LEVEL_LABEL[level]}: ${used} used, ${info.price === null ? 'included' : `${info.price} CP`}`;
        }).join('   |   ')}
      </p>
      <div className="grid">
        {content.paths.map((pathId) => (
          <label key={pathId} className="card">
            <span className="name">{pathLabel(pathId)}</span>
            <select
              value={selections.attainments[pathId] ?? ''}
              onChange={(event) => dispatch({ type: 'setAttainment', pathId, level: toLevel(event.target.value) })}
            >
              <option value="">No attainment</option>
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
      return `${line.name}${line.count > 1 ? ` ×${line.count}` : ''}${line.granted ? ' (free)' : ''}`;
    case 'clanStatus':
      return line.name;
    case 'surcharge':
      return `${content.categories[line.categoryKey].title} surcharge (+${line.extraPicks})`;
    case 'attainment':
      return `${pathLabel(line.pathId)}: ${LEVEL_LABEL[line.level]}`;
  }
}

function Summary(props: { readonly evaluation: BuildEvaluation }): ReactElement {
  const { evaluation } = props;
  return (
    <section aria-labelledby="summary-title">
      <h2 id="summary-title">Summary</h2>
      {evaluation.lines.length === 0 ? (
        <p className="desc">You have not chosen anything yet.</p>
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

type Tab = GroupId | 'attainments' | 'summary';
interface Totals {
  count: number;
  total: number;
}
type TotalsMap = ReadonlyMap<CategoryKey | 'attainments', Totals>;

/** Cuántas elecciones y cuántos puntos lleva cada categoría (alimenta la barra lateral y las sub-pestañas). */
function categoryTotals(evaluation: BuildEvaluation): TotalsMap {
  const totals = new Map<CategoryKey | 'attainments', Totals>();
  for (const line of evaluation.lines) {
    const key: CategoryKey | 'attainments' =
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

function sumTotals(totals: TotalsMap, keys: readonly CategoryKey[]): Totals | undefined {
  let sum: Totals | undefined;
  for (const key of keys) {
    const entry = totals.get(key);
    if (entry === undefined) continue;
    sum = { count: (sum?.count ?? 0) + entry.count, total: (sum?.total ?? 0) + entry.total };
  }
  return sum;
}

function CategorySection(props: PanelProps & { readonly categoryKey: CategoryKey; readonly showHeading: boolean }): ReactElement {
  const { categoryKey, showHeading, selections, evaluation, dispatch } = props;
  const category = content.categories[categoryKey];
  return (
    <section aria-label={category.title}>
      {showHeading && <h3>{category.title}</h3>}
      {category.description !== undefined && <p className="desc">{category.description}</p>}
      <div className="entries">
        {category.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            categoryKey={categoryKey}
            evaluation={evaluation}
            selections={selections}
            dispatch={dispatch}
          />
        ))}
      </div>
      {categoryKey === 'clanTier' && <ClanStatusPicker selections={selections} evaluation={evaluation} dispatch={dispatch} />}
      {categoryKey === 'grabBagBundles' && <GrabBagPicker selections={selections} evaluation={evaluation} dispatch={dispatch} />}
    </section>
  );
}

function GroupPanel(
  props: PanelProps & {
    readonly group: TabGroup;
    readonly subTab: CategoryKey;
    readonly onSubTab: (key: CategoryKey) => void;
    readonly totals: TotalsMap;
  },
): ReactElement {
  const { group, subTab, onSubTab, totals, ...panel } = props;
  return (
    <section role="tabpanel" aria-label={group.label}>
      <h2>{group.label}</h2>
      {group.subTabs === true ? (
        <>
          <div className="subtabs" role="tablist" aria-label={`${group.label} tiers`}>
            {group.categories.map((key) => {
              const entry = totals.get(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  className="subtab"
                  aria-selected={subTab === key}
                  onClick={() => onSubTab(key)}
                >
                  <span>{content.categories[key].title.replace(/ Perks$/, '')}</span>
                  {entry !== undefined && entry.count > 0 && <span className="num">{formatCost(entry.total)}</span>}
                </button>
              );
            })}
          </div>
          <CategorySection {...panel} categoryKey={subTab} showHeading={false} />
        </>
      ) : (
        group.categories.map((key) => <CategorySection key={key} {...panel} categoryKey={key} showHeading />)
      )}
    </section>
  );
}

/* ------------------------------ Aplicación ------------------------------ */

const messageOf = (error: unknown): string =>
  error instanceof ApiRequestError || error instanceof Error ? error.message : 'Something unexpected happened.';

interface Session {
  readonly id: string | null;
  readonly token: string | null;
}

export default function App(): ReactElement {
  const [state, dispatch] = useReducer(reducer, null, (): State => ({ selections: loadSaved(), notice: null }));
  const [session, setSession] = useState<Session>({ id: null, token: null });
  const [busy, setBusy] = useState(false);
  const [perkTier, setPerkTier] = useState<CategoryKey>('tier1');
  const [tab, setTab] = useState<Tab>('origins');
  const evaluation = useMemo(() => evaluateBuild(content, state.selections), [state.selections]);
  const totals = useMemo(() => categoryTotals(evaluation), [evaluation]);

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
            text: `This build uses content version ${view.contentVersion}, which this page does not include.`,
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
        dispatch({ type: 'notify', text: 'Changes saved.' });
      } else {
        const created = await createBuild(state.selections);
        saveToken(created.id, created.editToken);
        window.history.pushState(null, '', `/b/${created.id}`);
        setSession({ id: created.id, token: created.editToken });
        dispatch({
          type: 'notify',
          text: 'Saved. Copy the edit link: without it you will not be able to change this build from another browser.',
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
      dispatch({ type: 'notify', text: 'Could not copy; use the address in your browser bar.' });
    }
  };

  // Recarga la página para volver al contenido vigente (el build abierto pudo usar una versión anterior).
  const startNew = (): void => {
    window.location.assign('/');
  };

  const group = TAB_GROUPS.find((candidate) => candidate.id === tab);

  const tabButton = (id: Tab, label: string, entry: Totals | undefined): ReactElement => (
    <button
      key={id}
      type="button"
      role="tab"
      className="tab"
      aria-selected={tab === id}
      aria-label={entry === undefined || entry.count === 0 ? label : `${label}, ${entry.count} chosen`}
      onClick={() => setTab(id)}
    >
      <span>{label}</span>
      {entry !== undefined && entry.count > 0 && <span className="num">{formatCost(entry.total)}</span>}
    </button>
  );

  return (
    <div className="sheet">
      <aside className="rail">
        <div>
          <h1 className="brand">Reverend Insanity</h1>
          <p className="brand-sub">Character sheet</p>
        </div>

        <div>
          <p className={evaluation.availablePoints < 0 ? 'points over' : 'points'} aria-live="polite">
            {evaluation.availablePoints}
          </p>
          <p className="points-label">points available</p>
        </div>

        <div className="modes" role="group" aria-label="Difficulty">
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
            {session.token !== null ? 'Save changes' : 'Save and share'}
          </button>
          {session.id !== null && (
            <button type="button" className="chip" onClick={() => void copy(publicUrl(window.location.origin, session.id ?? ''), 'Link')}>
              Copy link
            </button>
          )}
          {session.id !== null && session.token !== null && (
            <button
              type="button"
              className="chip"
              onClick={() => void copy(editUrl(window.location.origin, session.id ?? '', session.token ?? ''), 'Edit link')}
            >
              Copy edit link
            </button>
          )}
          {session.id !== null && (
            <button type="button" className="chip" onClick={startNew}>
              New
            </button>
          )}
        </div>
        {session.id !== null && session.token === null && (
          <p className="desc">Read-only: saving creates your own copy.</p>
        )}

        <nav className="sections" role="tablist" aria-orientation="vertical" aria-label="Sections">
          {TAB_GROUPS.map((candidate) => tabButton(candidate.id, candidate.label, sumTotals(totals, candidate.categories)))}
          {tabButton('attainments', 'Attainments', totals.get('attainments'))}
          {tabButton('summary', 'Summary', undefined)}
        </nav>
      </aside>

      <main>
        {tab === 'summary' ? (
          <Summary evaluation={evaluation} />
        ) : tab === 'attainments' || group === undefined ? (
          <AttainmentsPanel selections={state.selections} evaluation={evaluation} dispatch={dispatch} />
        ) : (
          <GroupPanel
            group={group}
            subTab={perkTier}
            onSubTab={setPerkTier}
            totals={totals}
            selections={state.selections}
            evaluation={evaluation}
            dispatch={dispatch}
          />
        )}

        <footer className="credits">
          <p>
            Based on the CYOA by alphanumericsprawl, with contributions from GashGrunt and smie27. Premium Gu by unlanned and
            WHOiAM981213. Original interactive version by WiseBein. Based on the novel Reverend Insanity by Gu Zhen Ren.
          </p>
          <p>
            Content licensed under{' '}
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
