import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { z } from 'zod';
import { CATEGORY_ORDER, loadContent, type CyoaContent, type CyoaOption } from '../shared';

const draftSchema = z.object({
  email: z.string(),
  contentVersion: z.string(),
  draftChanged: z.boolean(),
  content: z.unknown(),
});
const publishedSchema = z.object({ version: z.string() });
const errorSchema = z.object({ error: z.object({ message: z.string() }) });
const anySchema = z.unknown();

const LOGIN_HINT = 'Could not reach the server. Check your connection or the admin key.';

const KEY_STORAGE = 'ri-cyoa:admin-key';

function readKey(): string | null {
  try {
    return window.sessionStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

function writeKey(key: string | null): void {
  try {
    if (key === null) window.sessionStorage.removeItem(KEY_STORAGE);
    else window.sessionStorage.setItem(KEY_STORAGE, key);
  } catch {
    /* sin almacenamiento: habrá que escribir la clave de nuevo */
  }
}

class AdminRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
  }
}

async function adminRequest<T>(path: string, method: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const key = readKey();
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...(key === null ? {} : { Authorization: `Bearer ${key}` }) },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new AdminRequestError(0, LOGIN_HINT);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorSchema.safeParse(payload);
    throw new AdminRequestError(
      response.status,
      parsed.success ? parsed.data.error.message : `Error ${response.status} del servidor.`,
    );
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new AdminRequestError(401, LOGIN_HINT);
  return parsed.data;
}

interface Draft {
  readonly email: string;
  readonly version: string;
  readonly changed: boolean;
  readonly content: CyoaContent;
}

interface OptionPatch {
  readonly name: string;
  readonly description: string;
  readonly cost: number;
}

function OptionEditor(props: {
  readonly option: CyoaOption;
  readonly onSave: (id: string, patch: OptionPatch) => Promise<void>;
}): ReactElement {
  const { option, onSave } = props;
  const [name, setName] = useState(option.name);
  const [description, setDescription] = useState(option.description);
  const [cost, setCost] = useState(String(option.cost));
  const [saving, setSaving] = useState(false);

  const dirty = name !== option.name || description !== option.description || cost !== String(option.cost);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSave(option.id, { name, description, cost: Number(cost) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" role="group" aria-label={option.id}>
      <span className="tag">{option.id}</span>
      <label className="desc">
        Name
        <input style={{ width: '100%' }} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="desc">
        Cost (positive gives points)
        <input type="number" step={1} value={cost} onChange={(event) => setCost(event.target.value)} />
      </label>
      <label className="desc">
        Description
        <textarea rows={5} style={{ width: '100%' }} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <button type="button" className="chip" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save option'}
      </button>
    </div>
  );
}

export default function Admin(): ReactElement {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const data = await adminRequest('/api/admin/draft', 'GET', undefined, draftSchema);
    setDraft({ email: data.email, version: data.contentVersion, changed: data.draftChanged, content: loadContent(data.content) });
  }, []);

  const tryLoad = useCallback((): void => {
    load()
      .then(() => setNeedsKey(false))
      .catch((error: unknown) => {
        // 401/403: falta o es incorrecta la clave; se pide al usuario.
        setNeedsKey(error instanceof AdminRequestError && (error.status === 401 || error.status === 403));
        setNotice(error instanceof Error ? error.message : LOGIN_HINT);
      });
  }, [load]);

  useEffect(() => {
    tryLoad();
  }, [tryLoad]);

  const signIn = (): void => {
    writeKey(keyInput.trim());
    setKeyInput('');
    setNotice(null);
    tryLoad();
  };

  const signOut = (): void => {
    writeKey(null);
    setDraft(null);
    setNeedsKey(true);
    setNotice('Signed out.');
  };

  const saveOption = async (id: string, patch: OptionPatch): Promise<void> => {
    if (!Number.isInteger(patch.cost)) {
      setNotice('The cost must be a whole number.');
      return;
    }
    try {
      await adminRequest(`/api/admin/options/${encodeURIComponent(id)}`, 'PATCH', patch, anySchema);
      await load();
      setNotice('Option saved to the draft. Publish it so visitors can see it.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save.');
    }
  };

  const publish = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await adminRequest('/api/admin/publish', 'POST', {}, publishedSchema);
      await load();
      setNotice(`Published as version ${result.version}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not publish.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="top">
        <h1>Admin</h1>
        {draft !== null && (
          <>
            <span className="desc">
              {draft.email}, published version {draft.version}
            </span>
            <div className="actions">
              <span className={draft.changed ? 'warn' : 'desc'}>
                {draft.changed ? 'Unpublished changes' : 'No pending changes'}
              </span>
              <button type="button" className="chip" disabled={!draft.changed || busy} onClick={() => void publish()}>
                Publish
              </button>
              {readKey() !== null && (
                <button type="button" className="chip" onClick={signOut}>
                  Sign out
                </button>
              )}
            </div>
          </>
        )}
      </header>
      <main>
        {draft === null && needsKey && (
          <form
            className="card"
            style={{ maxWidth: '28rem', marginTop: '1.5rem' }}
            onSubmit={(event) => {
              event.preventDefault();
              signIn();
            }}
          >
            <label className="desc">
              Admin key
              <input
                type="password"
                autoComplete="current-password"
                style={{ width: '100%' }}
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
              />
            </label>
            <button type="submit" className="chip" disabled={keyInput.trim().length === 0}>
              Sign in
            </button>
            {notice !== null && <span className="warn">{notice}</span>}
          </form>
        )}
        {draft === null && !needsKey && <p className="desc">{notice ?? 'Loading…'}</p>}
        {draft !== null &&
          CATEGORY_ORDER.map((key) => (
            <section key={key} aria-labelledby={`cat-${key}`}>
              <h2 id={`cat-${key}`} style={{ marginTop: '2rem' }}>
                {draft.content.categories[key].title}
              </h2>
              <div className="grid">
                {draft.content.categories[key].options.map((option) => (
                  <OptionEditor key={`${option.id}:${option.name}:${option.cost}:${option.description}`} option={option} onSave={saveOption} />
                ))}
              </div>
            </section>
          ))}
      </main>
      {notice !== null && draft !== null && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
