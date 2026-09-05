import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch as api } from '../api';
import { useAuth } from '../AuthContext';
import MapPicker from '../components/MapPicker';
import PhotoInput from '../components/PhotoInput';
import DuplicatePanel from '../components/DuplicatePanel';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { field, primaryBtn } from '../formStyles';

const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];

const Report = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null); // [lng, lat]
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // File[]
  const [duplicateOfId, setDuplicateOfId] = useState(null);

  const [duplicates, setDuplicates] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Reporting requires an account — POST /api/issues is auth(true), so an anonymous visitor who
  // reaches this URL directly would fill the whole form and lose it to a 401 on submit. Waits for
  // authLoading so a signed-in user with a valid token is never bounced mid-validation.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/report' }, replace: true });
    if (!authLoading && user && (user.role === 'officer' || user.role === 'admin')) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Check if returning from login after "This is my issue" action
  useEffect(() => {
    if (user && routeLocation.state?.pendingSupportId) {
      const supportId = routeLocation.state.pendingSupportId;
      api(`/api/issues/${supportId}/support`, { method: 'POST' })
        .then(() => {
          navigate(`/issues/${supportId}`, {
            state: { message: 'Support registered for existing report!' }
          });
        })
        .catch((err) => {
          setError(err.message || 'Failed to register support');
        });
    }
  }, [user, routeLocation.state]);

  // Debounced duplicate detection trigger (400ms)
  useEffect(() => {
    const lng = location ? location[0] : null;
    const lat = location ? location[1] : null;

    if (!category || lng == null || lat == null || title.trim().length < 5) {
      setDuplicates([]);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          lng: String(lng),
          lat: String(lat),
          category: category,
          text: title.trim(),
        });

        const data = await api(`/api/issues/similar?${query.toString()}`, {
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setDuplicates(data.items || []);
          setIsSearching(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching duplicate candidates:', err);
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [category, location, title]);

  const handleSupportIssue = async (issue) => {
    const issueId = typeof issue === 'string' ? issue : issue._id;

    if (!user) {
      // Stash pending state and redirect to login
      navigate('/login', {
        state: {
          from: '/report',
          pendingSupportId: issueId,
        },
      });
      return;
    }

    try {
      await api(`/api/issues/${issueId}/support`, { method: 'POST' });
      navigate(`/issues/${issueId}`, {
        state: { message: 'You have supported this issue!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to support issue');
    }
  };

  const handleReportAsNew = (issueId) => {
    setDismissedIds((prev) => new Set(prev).add(issueId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError('Please select a category');
      return;
    }

    if (!location || location.length !== 2) {
      setError('Please select a location on the map');
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      if (address.trim()) {
        formData.append('address', address.trim());
      }
      formData.append('lng', location[0]);
      formData.append('lat', location[1]);

      if (duplicateOfId) {
        formData.append('duplicateOf', duplicateOfId);
      }

      photos.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await api('/api/issues', {
        method: 'POST',
        body: formData,
        isForm: true,
      });

      navigate(`/issues/${res._id || res.id}`, {
        state: { message: 'Issue reported successfully!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to submit report');
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex items-center gap-5">
        <span aria-hidden="true"
          className="hidden size-20 shrink-0 place-items-center rounded-2xl bg-brand-50
            text-brand-600 sm:grid">
          <Icon name="clipboard" className="size-10" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Report a civic issue</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Help us identify and fix problems in your community.<br className="hidden sm:inline" />
            Provide details and location below.
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-rejected-50 px-4 py-3 text-sm text-rejected-600">
          {error}
        </p>
      )}

      {/* Each step is a card with its own label column: the number, an icon and one line of
          guidance on the left, the controls on the right. Long form, four landmarks. */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Step n={1} icon="grid" label="Category" required
          hint="Choose the issue category that best fits your report.">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={`${field} cursor-pointer`}
          >
            <option value="">Select issue category…</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </Step>

        <Step n={2} icon="map" label="Location" required
          hint="Drag the map or drop a pin on the exact location.">
          <MapPicker onLocationChange={setLocation} />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Landmark or street address (optional)"
            className={`${field} mt-4`}
          />
          <p className="mt-1.5 text-right text-xs text-ink-muted">
            e.g. Near Mission Chariali flyover
          </p>
        </Step>

        <Step n={3} icon="clipboard" label="Details" required
          hint="Provide clear details so our team can understand and take action quickly.">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a short title — e.g. Large pothole near central bus stand"
            required
            minLength={5}
            className={field}
          />

          {/* Duplicates surface here, between the title and the description: the title is what
              the search runs on, and it is cheaper to join an existing report before writing
              a paragraph than after. */}
          <DuplicatePanel
            duplicates={duplicates}
            isSearching={isSearching}
            dismissedIds={dismissedIds}
            onSupportIssue={handleSupportIssue}
            onReportAsNew={handleReportAsNew}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue, severity, exact spot, or any danger posed…"
            rows={4}
            required
            minLength={10}
            className={`${field} mt-4 py-3`}
          />
        </Step>

        <Step n={4} icon="camera" label="Photos" optional
          hint="Add up to 3 photos to help us identify the issue better.">
          <PhotoInput onPhotosChange={setPhotos} />
        </Step>

        {/* Sits outside the step grid so it spans the full card width, as in the design. */}
        <aside className="flex items-start gap-3 rounded-card border border-brand-100 bg-brand-50
          px-5 py-4 text-sm">
          <Icon name="info" className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <span>
            <span className="block font-semibold text-brand-700">Why photos help?</span>
            <span className="block text-ink-muted">
              Clear photos help our team triage and resolve issues faster.
            </span>
          </span>
        </aside>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="min-h-13 cursor-pointer rounded-lg border border-line bg-surface px-6
              text-base font-medium text-ink shadow-sm transition-colors hover:bg-canvas"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? <Spinner label="Submitting" /> : <Icon name="send" className="size-5" />}
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>
    </main>
  );
};

// One card per step: number, icon and guidance in the label column, controls in the wide one.
function Step({ n, icon, label, required, optional, hint, children }) {
  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="flex gap-3">
          <span aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600
              text-xs font-semibold text-white">
            {n}
          </span>
          <span aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name={icon} className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              {label}
              {required && <span className="ml-1 text-rejected-600" aria-hidden="true">*</span>}
              {optional && <span className="ml-1 font-normal text-ink-muted">(optional)</span>}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{hint}</p>
          </div>
        </div>

        <div>{children}</div>
      </div>
    </section>
  );
}

export default Report;
