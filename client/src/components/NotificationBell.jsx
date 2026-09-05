import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import Icon from './Icon';
import StatusPill from './StatusPill';
import { timeAgo } from './IssueCard';

// What happened on the issues you reported (and, for officers, the ones assigned to you).
//
// Polls once on mount and then on focus — no socket, no interval. A civic report moves a few
// times a week, not a few times a minute, and a timer that fires forever in a background tab
// costs the reader battery to tell them nothing.
export default function NotificationBell({ className = '' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const panel = useRef(null);

  const load = () => apiFetch('/api/notifications').then(setData).catch(() => {});

  useEffect(() => {
    if (!user) { setData({ items: [], unread: 0 }); return; }
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-away and Escape. pointerdown, not click: opening the panel and clicking a link inside
  // it should navigate, not close-then-swallow the click.
  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!panel.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Opening is the read receipt. Clear the badge locally straight away rather than waiting
    // for the round trip — the reader is looking at the list either way.
    if (next && data.unread > 0) {
      setData(d => ({ ...d, unread: 0 }));
      apiFetch('/api/notifications/seen', { method: 'POST' }).catch(() => {});
    }
  };

  return (
    <div ref={panel} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={data.unread > 0 ? `Notifications, ${data.unread} unread` : 'Notifications'}
        className="relative grid size-11 cursor-pointer place-items-center rounded-full text-ink-muted
          transition-colors duration-200 hover:bg-canvas hover:text-ink"
      >
        <Icon name="bell" className="size-5" />
        {data.unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full
            bg-rejected-600 px-1 text-[10px] font-bold leading-4 text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        // Anchoring to the bell only works when the bell has a panel's width of screen to its
        // left. On a phone it does not, so below sm this is a fixed sheet inset from both
        // screen edges instead, hanging under the nav bar.
        <div className="fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto rounded-xl
          border border-line bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.14)]
          sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[22rem]">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">Updates</p>

          {data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nothing yet. Updates on the issues you report show up here.
            </p>
          ) : (
            <ul>
              {data.items.map((n, i) => (
                <li key={`${n.issueId}-${n.at}-${i}`}>
                  <Link
                    to={`/issues/${n.issueId}`}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col gap-1.5 border-b border-line/60 px-4 py-3 transition-colors
                      last:border-b-0 hover:bg-canvas ${n.unread ? 'bg-brand-50/50' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <StatusPill status={n.status} />
                      <span className="text-xs text-ink-muted">{timeAgo(n.at)}</span>
                      {n.reason === 'assigned' && (
                        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                          Assigned
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-sm font-medium text-ink">{n.title}</span>
                    {n.note && <span className="line-clamp-2 text-xs text-ink-muted">{n.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
