import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import FeedMap from '../components/FeedMap';
import Icon from '../components/Icon';
import StatusPill from '../components/StatusPill';
import SlaBadge from '../components/SlaBadge';
import StatusTimeline from '../components/StatusTimeline';
import ErrorState from '../components/ErrorState';
import Spinner, { Skeleton } from '../components/Spinner';
import { timeAgo } from '../components/IssueCard';
import SafeImage from '../components/SafeImage';
import ShareIssue from '../components/ShareIssue';
import { shortId } from '../components/IssueDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import AttachDuplicateModal from '../components/AttachDuplicateModal';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import NotFound from './NotFound';
import { useSeo } from '../seo';

const card = 'rounded-2xl border border-line bg-surface';

// Same shape FindIssue accepts, so a reference works in the URL as well as in the dialog.
const REF = /^#?LS-\d{4}-[0-9a-f]{6}$/i;

function Field({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="mt-0.5 size-[18px] shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
        <dd className="mt-0.5 truncate text-sm">{children}</dd>
      </div>
    </div>
  );
}

export default function IssueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [supporting, setSupporting] = useState(false);
  const [visibleDuplicates, setVisibleDuplicates] = useState(3);

  useSeo(issue?.title, issue?.description?.slice(0, 160));

  useEffect(() => {
    setVisibleDuplicates(3);
  }, [id]);

  // Citizen satisfaction action state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [citizenActionLoading, setCitizenActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Admin action state
  const [adminNote, setAdminNote] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [showAdminRejectInput, setShowAdminRejectInput] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      // The reference is what a citizen is given — on the report, in an email, read out over
      // the phone — so /issues/LS-2026-61AB11 has to open the report just like the canonical
      // /issues/<objectid> does. Resolve it, then swap the URL for the real one so the address
      // bar, a bookmark and the share link all agree.
      let target = id;
      if (REF.test(id)) {
        const { _id } = await apiFetch(`/api/issues/lookup/${encodeURIComponent(id)}`);
        target = _id;
        navigate(`/issues/${_id}`, { replace: true });
      }
      setIssue(await apiFetch(`/api/issues/${target}`));
    } catch (e) {
      if (e.status === 404 || e.status === 400) setNotFound(true);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load, user?._id]);

  const isMine = Boolean(
    issue?.isReporter ||
    (user && (
      (issue?.reporter?._id && String(issue.reporter._id) === String(user._id)) ||
      (issue?.reporter && String(issue.reporter) === String(user._id))
    ))
  );
  const isStaff = user?.role === 'officer' || user?.role === 'admin';
  const canSupport = !isMine && !isStaff;

  const [refCopied, setRefCopied] = useState(false);
  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(shortId(issue));
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch {
      window.prompt('Copy this reference', shortId(issue));
    }
  };

  async function support() {
    if (!user) return navigate('/login', { state: { from: `/issues/${id}` } });

    const before = issue;
    setIssue({ ...issue, supporterCount: issue.supporterCount + 1, hasSupported: true });
    setSupporting(true);
    try {
      const res = await apiFetch(`/api/issues/${id}/support`, { method: 'POST' });
      setIssue(prev => ({
        ...prev,
        supporterCount: res.supporterCount,
        hasSupported: res.hasSupported,
        // Priority may be bumped by server when supporter thresholds are hit
        ...(res.priority ? { priority: res.priority } : {}),
      }));
    } catch (e) {
      setIssue(before);
      setError(e.message);
    } finally {
      setSupporting(false);
    }
  }

  // Citizen Satisfaction handler (Accept / Dispute)
  async function handleCitizenFeedback(satisfied) {
    if (!user) return navigate('/login', { state: { from: `/issues/${id}` } });
    setCitizenActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch(`/api/issues/${id}/citizen-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          satisfied,
          notes: satisfied ? 'Citizen confirmed satisfied with the solution.' : disputeReason.trim(),
        }),
      });
      setIssue(updated);
      setShowDisputeForm(false);
      setDisputeReason('');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setCitizenActionLoading(false);
    }
  }

  // Admin Verification handler (Approve / Reject)
  async function handleAdminVerify(action) {
    setAdminActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch(`/api/issues/${id}/verify-resolution`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          adminNotes: adminNote.trim(),
        }),
      });
      setIssue(updated);
      setShowAdminRejectInput(false);
      setAdminNote('');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  // Admin Reopen handler
  async function handleAdminReopen() {
    setAdminActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch(`/api/issues/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ note: adminNote.trim() || 'Reopened by Admin following citizen dissatisfaction.' }),
      });
      setIssue(updated);
      setAdminNote('');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  const [confirmDetachTarget, setConfirmDetachTarget] = useState(null); // { id, title }
  const [isDetaching, setIsDetaching] = useState(false);

  async function executeDetach() {
    if (!confirmDetachTarget?.id) return;
    const targetIssueId = confirmDetachTarget.id;
    setIsDetaching(true);
    setActionError(null);
    try {
      await apiFetch(`/api/issues/${targetIssueId}/duplicate`, {
        method: 'PATCH',
        body: JSON.stringify({ duplicateOfId: null }),
      });
      setConfirmDetachTarget(null);
      await load();
    } catch (e) {
      setActionError(e.message || 'Failed to detach issue');
    } finally {
      setIsDetaching(false);
    }
  }

  if (notFound) {
    return <NotFound title="That report does not exist" hint="The link may be wrong, or the report may have been removed." />;
  }
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton count={2} className="h-56" />
          <Skeleton count={2} className="h-40" />
        </div>
      </main>
    );
  }
  if (error && !issue) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ErrorState message={error} onRetry={load} />
      </main>
    );
  }

  const photos = issue.photos ?? [];
  const resolutionPhotos = issue.resolution?.evidence ?? [];
  const hasMap = Array.isArray(issue.location?.coordinates) && issue.location.coordinates.length === 2;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/feed" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
        <Icon name="left" className="size-4" />
        All reports
      </Link>

      {/* Duplicate alert */}
      {issue.duplicateOf && issue.parent && (
        <div className="mt-4 rounded-2xl border border-acknowledged-600/30 bg-acknowledged-50 p-4">
          <p className="text-sm font-medium">This report is similar to an earlier report of the same issue.</p>
          <p className="mt-1 text-sm text-ink-muted">
            It is being tracked under the original, which is currently <StatusPill status={issue.parent.status} /> .
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <Link to={`/issues/${issue.parent._id}`} className="text-sm font-medium text-brand-600 hover:underline">
              View the original report &rarr;
            </Link>
            {isStaff && (
              <button
                type="button"
                onClick={() => setConfirmDetachTarget({ id: issue._id, title: issue.title })}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-xs transition-colors cursor-pointer"
                title="Detach from original to manage this as a standalone report"
              >
                Detach from original
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── WORKFLOW BANNER 1: PENDING ADMIN VERIFICATION ── */}
      {issue.status === 'Pending Verification' && (
        <div className="mt-4 rounded-2xl border border-purple-300 bg-purple-50 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-200/70 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                <span className="size-2 rounded-full bg-purple-600 animate-pulse" />
                Under Administrative Review
              </span>
              <h3 className="mt-1.5 text-base font-bold text-purple-950">Resolution Proof Submitted by Officer</h3>
              <p className="mt-0.5 text-xs sm:text-sm text-purple-900">
                The department has completed physical work and uploaded resolution evidence photos.
                {isAdmin ? ' As Administrator, verify the evidence images below to proceed to resolution.' : ' Municipal administration is currently verifying the proof images.'}
              </p>
            </div>

            {isAdmin && !showAdminRejectInput && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={() => handleAdminVerify('approve')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Approve Proof &amp; Resolve
                </button>
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={() => setShowAdminRejectInput(true)}
                  className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  ✕ Reject Proof
                </button>
              </div>
            )}
          </div>

          {isAdmin && showAdminRejectInput && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <label className="block text-xs font-semibold text-purple-950 uppercase tracking-wider">
                Reason for Rejection (Rework Instructions for Officer)
              </label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-purple-400"
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Explain why the resolution images or work was not satisfactory..."
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminRejectInput(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-ink-muted hover:bg-purple-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={adminActionLoading || !adminNote.trim()}
                  onClick={() => handleAdminVerify('reject')}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Rejection &amp; Return to In Progress
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WORKFLOW BANNER 2: RESOLVED — CITIZEN SATISFACTION CONFIRMATION ── */}
      {issue.status === 'Resolved' && (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                ✓ Resolution Verified by Administration
              </span>
              <h3 className="mt-1.5 text-base font-bold text-emerald-950">Awaiting Citizen Confirmation for Final Closure</h3>
              <p className="mt-0.5 text-xs sm:text-sm text-emerald-900">
                The municipality has repaired this issue and verified the resolution photos.
                {isMine
                  ? ' Please inspect the Before & After photos below and confirm if you are satisfied.'
                  : ' Final closure will take place once the reporting citizen confirms satisfaction.'}
              </p>
            </div>

            {/* If viewed by the reporter: Prompt for Satisfaction / Dispute */}
            {isMine && !showDisputeForm && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={citizenActionLoading}
                  onClick={() => handleCitizenFeedback(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  ✓ Yes, I am Satisfied (Final Close)
                </button>
                <button
                  type="button"
                  disabled={citizenActionLoading}
                  onClick={() => setShowDisputeForm(true)}
                  className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  ✕ Not Satisfied
                </button>
              </div>
            )}
          </div>

          {/* Dispute Input Form */}
          {isMine && showDisputeForm && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-900">
                Why are you unsatisfied with the resolution? <span className="text-rose-600">*</span>
              </label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-brand-500 focus:bg-surface focus:outline-none"
                rows={3}
                required
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Explain what is still unresolved or defective..."
              />
              <div className="mt-2.5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-ink-muted hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={citizenActionLoading || !disputeReason.trim()}
                  onClick={() => handleCitizenFeedback(false)}
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Submit Dispute to Administration
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WORKFLOW BANNER 3: CITIZEN UNSATISFIED / DISPUTED ── */}
      {issue.status === 'Unsatisfied' && (
        <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-900">
                Citizen Unsatisfied
              </span>
              <h3 className="mt-1.5 text-base font-bold text-rose-950">Resolution Disputed by Citizen</h3>
              {issue.citizenFeedback?.notes && (
                <p className="mt-1 rounded-lg bg-white/80 p-2.5 text-xs text-rose-950 italic border border-rose-200">
                  Citizen Feedback: "{issue.citizenFeedback.notes}"
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="shrink-0">
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleAdminReopen}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  ↺ Reopen Issue (Send back to In Progress)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WORKFLOW BANNER 4: CLOSED (FINAL RESOLUTION) ── */}
      {issue.status === 'Closed' && (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-emerald-600 text-white font-bold text-sm">
              ✓
            </span>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Officially Resolved &amp; Closed</h3>
              <p className="text-xs sm:text-sm text-emerald-850">
                The citizen who reported this complaint has verified and confirmed satisfaction with the solution.
              </p>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
          {actionError}
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── The report itself ── */}
        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={issue.status} size="md" />
              <span className="rounded-full bg-canvas px-2.5 py-1 text-sm text-ink-muted">
                {issue.category}
              </span>
              {/* showMet here but not in the feed: "fixed on time" is worth saying once on the
                  report itself, and is wallpaper on every resolved card in a list. */}
              <SlaBadge sla={issue.sla} showMet />
              {/* Priority badge with color coding */}
              {issue.priority === 'high' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  <span className="size-2 rounded-full bg-red-600" />
                  High Priority
                </span>
              )}
              {issue.priority === 'medium' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <span className="size-2 rounded-full bg-amber-600" />
                  Medium Priority
                </span>
              )}
              {/* Supporter count */}
              {(issue.supporterCount > 0) && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  issue.supporterCount >= 10 ? 'bg-red-100 text-red-700 border-red-200' :
                  issue.supporterCount >= 5 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-brand-50 text-brand-700 border-brand-200'
                }`}>
                  {issue.supporterCount} supporter{issue.supporterCount === 1 ? '' : 's'}
                </span>
              )}
              {issue.assignedOfficer && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                  Officer: {issue.assignedOfficer.name}{issue.duplicateOf ? ' (Original)' : ''}
                </span>
              )}
              {isMine && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200">
                  Submitted by you
                </span>
              )}
              {isAdmin && !issue.duplicateOf && issue.status !== 'Resolved' && issue.status !== 'Closed' && (
                <button
                  type="button"
                  onClick={() => setShowAttachModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                  title="Manually link this report as a duplicate of an existing root report"
                >
                  <Icon name="link" className="size-3 text-brand-600" />
                  Attach as Similar Report
                </button>
              )}
            </div>
            {/* The reference was officer-only until now, which made "Find by ID" unusable for the
                person who filed the report — they had never been shown the thing it asks for.
                Tap to copy: it is what you quote on a phone call or in a WhatsApp message. */}
            <button type="button" onClick={copyRef} title="Copy reference"
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-canvas
                px-2.5 py-1 font-mono text-xs font-semibold text-ink-muted transition-colors
                hover:bg-brand-50 hover:text-brand-700">
              #{shortId(issue)}
              <Icon name={refCopied ? 'tick' : 'link'}
                className={`size-3.5 ${refCopied ? 'text-resolved-600' : ''}`} />
            </button>

            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[1.75rem]">{issue.title}</h1>
            <p className="mt-3 text-ink-muted">{issue.description}</p>
          </header>

          <dl className={`grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 ${card}`}>
            <Field icon="users" label="Department">
              {issue.department || <span className="text-ink-muted">Not yet assigned</span>}
            </Field>
            <Field icon="shield" label="Officer">
              {issue.assignedOfficer?.name ? (
                <span>
                  {issue.assignedOfficer.name}
                  {issue.duplicateOf && <span className="ml-1 text-[11px] text-ink-muted">(via original report)</span>}
                </span>
              ) : (
                <span className="text-ink-muted">Department Pool</span>
              )}
            </Field>
            <Field icon="sliders" label="Priority">
              {issue.priority
                ? <span className={`capitalize font-semibold ${
                    issue.priority === 'high' ? 'text-red-600' :
                    issue.priority === 'medium' ? 'text-amber-600' : 'text-slate-500'
                  }`}>{issue.priority}</span>
                : <span className="text-ink-muted">Auto-set</span>}
            </Field>
            <Field icon="map" label="Location">{issue.area || issue.address || 'Not given'}</Field>
          </dl>


          {/* ── BEFORE & AFTER RESOLUTION PHOTOS SECTION ── */}
          {resolutionPhotos.length > 0 && (
            <section className={`p-5 ${card} border-purple-200/90 bg-purple-50/15 shadow-sm space-y-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="font-bold text-ink flex items-center gap-2">
                    <span className="rounded-md bg-purple-600 px-2.5 py-0.5 text-xs font-bold text-white">
                      Resolution Verification
                    </span>
                    Proof of Work
                  </h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    Visual comparison between the reported defect and official municipal repair.
                  </p>
                </div>
                {issue.resolution?.verifiedBy && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    ✓ Verified by Admin
                  </span>
                )}
              </div>

              {/* Interactive Split Comparison Slider (when both Before & After photos exist) */}
              {photos.length > 0 && (
                <BeforeAfterSlider
                  beforeSrc={photos[0]}
                  afterSrc={resolutionPhotos[0]}
                  resolutionNote={issue.resolution?.note}
                />
              )}

              {/* Full Evidence Gallery */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                  All Resolution Evidence Photos ({resolutionPhotos.length})
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {resolutionPhotos.map((src, idx) => (
                    <a key={idx} href={src} target="_blank" rel="noreferrer"
                      className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-slate-50">
                      <SafeImage src={src} alt="Resolution proof" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" fallbackText="Proof photo" />
                      <span aria-hidden="true"
                        className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-ink-muted shadow-sm">
                        <Icon name="zoom" className="size-4" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Reported Citizen Photos */}
          {(photos.length > 0 || hasMap) && (
            <div className={`grid items-start gap-6 ${photos.length > 0 && hasMap ? 'md:grid-cols-2' : ''}`}>
              {photos.length > 0 && (
                <section className={`p-5 ${card}`}>
                  <h2 className="font-semibold">
                    Reported Photos <span className="font-normal text-ink-muted">({photos.length})</span>
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Initial photos submitted by the citizen.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((src, idx) => (
                      <a key={idx} href={src} target="_blank" rel="noreferrer"
                        className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-slate-50">
                        <SafeImage src={src} alt={`Photo of: ${issue.title}`} className="size-full object-cover transition-transform duration-200 group-hover:scale-105" fallbackText="Photo unavailable" />
                        <span aria-hidden="true"
                          className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-ink-muted shadow-sm">
                          <Icon name="zoom" className="size-4" />
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {hasMap && (
                <section className={`p-5 ${card}`}>
                  <h2 className="font-semibold">Location</h2>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {issue.address || issue.area || 'Pinned location'}
                  </p>
                  <div className="mt-4 h-56 overflow-hidden rounded-xl border border-line">
                    <FeedMap issues={[issue]} numbered={false} />
                  </div>
                </section>
              )}
            </div>
          )}

          {issue.linkedDuplicates?.length > 0 && (
            <section className={`p-5 ${card}`}>
              <h2 className="font-semibold">
                Similar reports by {issue.linkedDuplicates.length}{' '}
                {issue.linkedDuplicates.length === 1 ? 'citizen' : 'citizens'}
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {issue.linkedDuplicates.slice(0, visibleDuplicates).map(d => (
                  <li key={d._id} className="py-2.5">
                    <div className="flex min-h-9 items-center justify-between gap-3 text-sm">
                      <Link to={`/issues/${d._id}`}
                        className="truncate font-medium hover:text-brand-600">
                        {d.title}
                      </Link>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <time dateTime={d.createdAt} className="text-xs text-ink-muted">
                          {timeAgo(d.createdAt)}
                        </time>
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => setConfirmDetachTarget({ id: d._id, title: d.title })}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Detach this report so it becomes an independent standalone report"
                          >
                            Detach
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {issue.linkedDuplicates.length > 3 && (
                <div className="mt-3 pt-2 border-t border-line flex items-center justify-between text-xs text-ink-muted">
                  <span>
                    Showing {Math.min(visibleDuplicates, issue.linkedDuplicates.length)} of {issue.linkedDuplicates.length}
                  </span>
                  {visibleDuplicates < issue.linkedDuplicates.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleDuplicates(prev => prev + 5)}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      Show more (+{issue.linkedDuplicates.length - visibleDuplicates} more)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisibleDuplicates(3)}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── What happened to it ── */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className={`p-5 ${card}`}>
            <h2 className="font-semibold">Progress Trail</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Every status change is recorded and never edited.
            </p>
            <StatusTimeline history={issue.statusHistory} />
          </section>

          <ShareIssue issue={issue} />

          {canSupport && (
            <section className={`p-5 ${card}`}>
              <h2 className="font-semibold">Affected by this too?</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {issue.supporterCount === 0
                  ? 'Nobody else has reported this yet.'
                  : `${issue.supporterCount} ${issue.supporterCount === 1 ? 'person has' : 'people have'} said this affects them.`}
              </p>

              {error && issue && (
                <p role="alert" className="mt-3 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={support}
                disabled={issue.hasSupported || supporting}
                className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center
                  gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors
                  duration-200 hover:bg-brand-700 disabled:cursor-default disabled:bg-resolved-600
                  disabled:opacity-100"
              >
                {supporting && <Spinner label="Saving" />}
                {issue.hasSupported ? 'You reported this too' : 'I have this problem too'}
              </button>
            </section>
          )}
        </aside>
      </div>

      {/* Custom Confirmation Dialog for Detaching */}
      <ConfirmDialog
        isOpen={Boolean(confirmDetachTarget)}
        title="Detach similar issue?"
        message={
          <>
            Are you sure you want to detach{' '}
            <strong className="font-semibold text-slate-900">
              {confirmDetachTarget?.title ? `"${confirmDetachTarget.title}"` : 'this issue'}
            </strong>
            ?
            <br />
            It will become an independent, standalone report with its own lifecycle, officer assignment, and status.
          </>
        }
        confirmText="Detach report"
        cancelText="Cancel"
        tone="danger"
        isPending={isDetaching}
        onConfirm={executeDetach}
        onClose={() => !isDetaching && setConfirmDetachTarget(null)}
      />

      {/* Admin Manual Duplicate Linking Modal */}
      {isAdmin && (
        <AttachDuplicateModal
          issue={issue}
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          onAttached={async () => {
            setShowAttachModal(false);
            await load();
          }}
        />
      )}
    </main>
  );
}
