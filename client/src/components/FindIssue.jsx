import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import Icon from './Icon';

// Jump straight to one report by its ID.
//
// Native <dialog>, not a hand-rolled overlay: showModal() brings the focus trap, Esc to close,
// the inert background and the ::backdrop for free. Nothing here to get wrong at 3am.
//
// People paste whatever they have in front of them, which is one of three things:
//   LS-2026-61AB11  the reference shown on every screen, and so the one on a printed receipt
//                   or in a WhatsApp message. Needs a server lookup — only the id's last six
//                   characters are in it.
//   the full /issues/<id> URL out of the address bar
//   the bare 24-character id
// Accept all three rather than making someone work out which one the box wants.
const REF = /#?LS-\d{4}-[0-9a-f]{6}/i;
const ID = /[a-f0-9]{24}/i;

export default function FindIssue({ triggerClass, label = 'Check status' }) {
  const dialog = useRef(null);
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { dialog.current?.close(); setValue(''); setError(''); setBusy(false); };

  const submit = async (e) => {
    e.preventDefault();

    // An id or a pasted URL resolves with no round trip. Whether it exists is the detail
    // page's problem — it already renders a not-found state for a 404.
    const id = value.match(ID);
    if (id) { close(); navigate(`/issues/${id[0]}`); return; }

    const ref = value.match(REF);
    if (!ref) {
      setError('Try a reference like LS-2026-61AB11, or paste the issue link.');
      return;
    }

    setBusy(true);
    try {
      const { _id } = await apiFetch(`/api/issues/lookup/${encodeURIComponent(ref[0])}`);
      close();
      navigate(`/issues/${_id}`);
    } catch (err) {
      setError(err.message || 'Could not find that reference.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={triggerClass}>
        <Icon name="search" className="size-[18px] shrink-0" />
        {label}
      </button>

      <dialog
        ref={dialog}
        onClose={() => { setValue(''); setError(''); }}
        className="m-auto w-[min(30rem,92vw)] rounded-2xl border border-line bg-surface p-0
          text-ink shadow-[0_24px_64px_rgba(15,23,42,0.24)] backdrop:bg-slate-900/50
          backdrop:backdrop-blur-sm"
      >
        <form onSubmit={submit} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Check a report’s status</h2>
              <p className="mt-1 text-sm text-ink-muted">
                The reference shown on the report, like LS-2026-61AB11 — or paste its link.
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Close"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full
                text-ink-muted transition-colors hover:bg-canvas hover:text-ink">
              <Icon name="close" className="size-5" />
            </button>
          </div>

          {/* autoFocus is right here: the dialog exists for this one field. */}
          <input
            autoFocus
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            placeholder="LS-2026-61AB11"
            aria-label="Issue reference"
            aria-invalid={!!error}
            spellCheck="false"
            autoCapitalize="off"
            className={`mt-4 h-11 w-full rounded-lg border bg-surface px-3 font-mono text-sm
              tracking-tight ${error ? 'border-rejected-600' : 'border-line'}`}
          />

          {error && <p role="alert" className="mt-2 text-xs text-rejected-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close}
              className="min-h-11 cursor-pointer rounded-lg px-4 text-sm font-medium text-ink-muted
                transition-colors hover:bg-canvas hover:text-ink">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="min-h-11 cursor-pointer rounded-lg bg-brand-600 px-5 text-sm font-medium
                text-white transition-colors hover:bg-brand-700 disabled:opacity-60">
              {busy ? 'Finding…' : 'Open'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
