import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import Icon from './Icon';
import StatusPill from './StatusPill';
import { timeAgo } from './IssueCard';
import { formatTimelineNote } from './StatusTimeline';

// Live role-relevant notifications (Citizens, Officers, Admins) for the past 7 days.
// Dynamic unread badge updates immediately upon opening or marking read.
export default function NotificationBell({ className = '' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const panel = useRef(null);

  const load = () => {
    if (!user) return;
    apiFetch('/api/notifications')
      .then(res => {
        if (res && Array.isArray(res.items)) {
          setData(res);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) {
      setData({ items: [], unread: 0 });
      return;
    }
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    // Dynamic background check every 25 seconds
    const timer = setInterval(load, 25000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [user?._id, user?.role]); // Re-fetch whenever active user/role changes

  // Click-away and Escape listeners
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

  const markAllAsSeen = async () => {
    setData(d => ({
      ...d,
      unread: 0,
      items: d.items.map(item => ({ ...item, unread: false })),
    }));
    try {
      await apiFetch('/api/notifications/seen', { method: 'POST' });
    } catch {}
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Opening dynamically clears the unread badge
    if (next && data.unread > 0) {
      markAllAsSeen();
    }
  };

  return (
    <div ref={panel} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={data.unread > 0 ? `Notifications, ${data.unread} unread` : 'Notifications'}
        className="relative grid size-10 sm:size-11 cursor-pointer place-items-center rounded-full text-ink-muted
          transition-colors duration-200 hover:bg-canvas hover:text-ink"
      >
        <Icon name="bell" className="size-5" />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full
            bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white shadow-xs animate-in fade-in">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-20 z-50 max-h-[75vh] overflow-y-auto rounded-2xl
          border border-line bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.14)]
          sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[23rem]">
          
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface/80 backdrop-blur-xs sticky top-0 z-10">
            <div>
              <p className="text-sm font-bold text-ink">Updates &amp; Alerts</p>
              <p className="text-[10px] text-ink-muted">Last 7 days relevant activity</p>
            </div>
            {data.unread > 0 && (
              <button
                type="button"
                onClick={markAllAsSeen}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
              >
                Mark read
              </button>
            )}
          </div>

          {data.items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              <Icon name="bell" className="mx-auto size-6 text-slate-300 mb-2" />
              <p className="font-semibold text-ink">All caught up</p>
              <p className="text-xs mt-1 text-ink-muted">No relevant activity in the past 7 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {data.items.map((n, i) => (
                <li key={`${n.issueId}-${n.at}-${i}`}>
                  <Link
                    to={`/issues/${n.issueId}`}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-canvas ${
                      n.unread ? 'bg-brand-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusPill status={n.status} size="sm" />
                      <span className="text-[11px] text-ink-muted">{timeAgo(n.at)}</span>
                      {n.label && (
                        <span className={`ml-auto rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                          n.reason === 'verification_needed' ? 'bg-purple-100 text-purple-800' :
                          n.reason === 'citizen_unsatisfied' ? 'bg-rose-100 text-rose-800' :
                          n.reason === 'unassigned' ? 'bg-amber-100 text-amber-800' :
                          n.reason === 'ward_alert' ? 'bg-indigo-100 text-indigo-800' :
                          n.reason === 'assigned' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {n.label}
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-2 text-xs font-semibold text-ink">{n.title}</span>
                    {n.note && (
                      <span className="line-clamp-2 text-[11px] text-ink-muted italic">
                        "{formatTimelineNote(n.note)}"
                      </span>
                    )}
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
