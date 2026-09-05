import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch as api } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import MapPicker from '../components/MapPicker';
import PhotoInput from '../components/PhotoInput';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { field, primaryBtn } from '../formStyles';

const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];

const DEPT_CATEGORY_MAP = {
  'water-supply': 'Water',
  'water supply': 'Water',
  'water': 'Water',
  'solid-waste': 'Sanitation',
  'solid waste': 'Sanitation',
  'solid waste management': 'Sanitation',
  'sanitation': 'Sanitation',
  'roads': 'Road',
  'road': 'Road',
  'roads & infrastructure': 'Road',
  'street-lighting': 'Streetlight',
  'street lighting': 'Streetlight',
  'streetlight': 'Streetlight',
  'drainage': 'Drainage',
  'drainage & sewerage': 'Drainage',
  'parks': 'Other',
  'parks & gardens': 'Other',
  'other': 'Other',
};

function resolveCategory(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  const directMatch = CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
  if (directMatch) return directMatch;
  return DEPT_CATEGORY_MAP[trimmed.toLowerCase()] || '';
}

const EN = {
  pageTitle: 'Report a civic issue',
  pageSub: 'Help us identify and fix problems in your community. Provide details and location below.',
  loginBanner: 'You can fill this in now \u2014 we will ask you to log in when you submit, and bring you straight back here with everything you have entered.',
  step1Label: 'Category', step1Hint: 'Choose the issue category that best fits your report.',
  step1Placeholder: 'Select issue category\u2026',
  step2Label: 'Location', step2Hint: 'Drag the map or drop a pin on the exact location.',
  step2AddressPlaceholder: 'Landmark or street address (optional)',
  step2AddressHint: 'e.g. Near Mission Chariali flyover',
  step3Label: 'Details', step3Hint: 'Provide clear details so our team can understand and take action quickly.',
  titlePlaceholder: 'Give it a short title \u2014 e.g. Large pothole near central bus stand',
  descPlaceholder: 'Describe the issue, severity, exact spot, or any danger posed\u2026',
  step4Label: 'Photos', step4Hint: 'Add up to 3 photos to help us identify the issue better.',
  photoNote: 'Why photos help?', photoNoteBody: 'Clear photos help our team triage and resolve issues faster.',
  cancel: 'Cancel', submit: 'Submit report', submitting: 'Submitting\u2026',
  errCategory: 'Please select a category', errLocation: 'Please select a location on the map',
  errTitle: 'Title must be at least 5 characters', errDesc: 'Description must be at least 10 characters',
};

const Report = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { lang, translate } = useLang();
  const [t, setT] = useState(EN);
  const draft = routeLocation.state?.draft;

  const [category, setCategory] = useState(() => {
    if (draft?.category && CATEGORIES.includes(draft.category)) {
      return draft.category;
    }
    const fromState = routeLocation.state?.category;
    if (fromState) {
      const resolved = resolveCategory(fromState);
      if (resolved) return resolved;
    }
    const params = new URLSearchParams(routeLocation.search);
    const fromQuery = params.get('category') || params.get('dept');
    if (fromQuery) {
      const resolved = resolveCategory(fromQuery);
      if (resolved) return resolved;
    }
    return '';
  });
  const [address, setAddress] = useState(draft?.address || '');
  const [location, setLocation] = useState(draft?.location || [92.7926, 26.6338]);
  const [pinAddress, setPinAddress] = useState(draft?.pinAddress || '');
  const [pinArea, setPinArea] = useState(draft?.pinArea || '');
  const [pinRegion, setPinRegion] = useState(draft?.pinRegion || '');
  const [title, setTitle] = useState(draft?.title || '');
  const [description, setDescription] = useState(draft?.description || '');
  const [photos, setPhotos] = useState(draft?.photos || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationChange = (coords, info) => {
    setLocation(coords);
    if (info?.displayName) setPinAddress(info.displayName);
    if (info?.area) setPinArea(info.area);
    if (info?.region || info?.district || info?.city) {
      setPinRegion(info.region || info.district || info.city);
    }
  };

  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    translate(Object.values(EN)).then(vals =>
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])))
    );
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (draft?.category) return;
    const fromState = routeLocation.state?.category;
    if (fromState) {
      const resolved = resolveCategory(fromState);
      if (resolved) { setCategory(resolved); return; }
    }
    const params = new URLSearchParams(routeLocation.search);
    const fromQuery = params.get('category') || params.get('dept');
    if (fromQuery) {
      const resolved = resolveCategory(fromQuery);
      if (resolved) setCategory(resolved);
    }
  }, [routeLocation.search, routeLocation.state, draft?.category]);

  useEffect(() => {
    if (!authLoading && user && (user.role === 'officer' || user.role === 'admin'))
      navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && routeLocation.state?.pendingSupportId) {
      const supportId = routeLocation.state.pendingSupportId;
      api(`/api/issues/${supportId}/support`, { method: 'POST' })
        .then(() => navigate(`/issues/${supportId}`, { state: { message: 'Support registered for existing report!' } }))
        .catch(err => setError(err.message || 'Failed to register support'));
    }
  }, [user, routeLocation.state]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    if (!category) { setError(t.errCategory); return; }
    if (!location || location.length !== 2) { setError(t.errLocation); return; }
    if (!title.trim() || title.trim().length < 5) { setError(t.errTitle); return; }
    if (!description.trim() || description.trim().length < 10) { setError(t.errDesc); return; }
    if (!user) {
      const ds = { category, address, location, pinAddress, pinArea, title, description, photos };
      try { navigate('/login', { state: { from: '/report', draft: ds } }); }
      catch { navigate('/login', { state: { from: '/report', draft: { ...ds, photos: [] } } }); }
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim()); fd.append('description', description.trim());
      fd.append('category', category);

      // Save the location according to the pin; if Landmark or street is filled then save both
      const landmark = address.trim().slice(0, 30);
      let finalAddress = '';
      if (landmark && pinAddress) {
        finalAddress = `${landmark}, ${pinAddress}`;
      } else if (landmark) {
        finalAddress = landmark;
      } else if (pinAddress) {
        finalAddress = pinAddress;
      } else {
        finalAddress = 'Tezpur, Assam';
      }

      const finalArea = pinArea || (landmark ? landmark : 'Tezpur');

      fd.append('address', finalAddress);
      fd.append('area', finalArea);
      if (pinRegion) fd.append('region', pinRegion);
      fd.append('lng', location[0]); fd.append('lat', location[1]);
      photos.forEach(f => fd.append('photos', f));
      const res = await api('/api/issues', { method: 'POST', body: fd, isForm: true });
      navigate(`/issues/${res._id || res.id}`, { state: { message: 'Issue reported successfully!' } });
    } catch (err) { setError(err.message || 'Failed to submit report'); setSubmitting(false); }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex items-center gap-5">
        <span aria-hidden="true" className="hidden size-20 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 sm:grid">
          <Icon name="clipboard" className="size-10" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.pageSub}</p>
        </div>
      </header>

      {!authLoading && !user && (
        <p className="mt-6 flex items-start gap-3 rounded-card border border-brand-100 bg-brand-50 px-5 py-4 text-sm">
          <Icon name="info" className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <span className="text-ink-muted">{t.loginBanner}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-rejected-50 px-4 py-3 text-sm text-rejected-600">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Step n={1} icon="grid" label={t.step1Label} required hint={t.step1Hint}>
          <select value={category} onChange={e => setCategory(e.target.value)} required className={`${field} cursor-pointer`}>
            <option value="">{t.step1Placeholder}</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </Step>

        <Step n={2} icon="map" label={t.step2Label} required hint={t.step2Hint}>
          <MapPicker onLocationChange={handleLocationChange} initialLocation={location} />
          <input
            type="text"
            value={address}
            maxLength={30}
            onChange={e => setAddress(e.target.value.slice(0, 30))}
            placeholder={t.step2AddressPlaceholder}
            className={`${field} mt-4`}
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
            <span>{t.step2AddressHint}</span>
            <span className={address.length >= 30 ? 'font-semibold text-amber-600' : ''}>
              {address.length}/30
            </span>
          </div>
        </Step>

        <Step n={3} icon="clipboard" label={t.step3Label} required hint={t.step3Hint}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder} required minLength={5} className={field} />
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={t.descPlaceholder} rows={4} required minLength={10} className={`${field} mt-4 py-3`} />
        </Step>

        <Step n={4} icon="camera" label={t.step4Label} optional hint={t.step4Hint}>
          <PhotoInput onPhotosChange={setPhotos} initialPhotos={photos} />
        </Step>

        <aside className="flex items-start gap-3 rounded-card border border-brand-100 bg-brand-50 px-5 py-4 text-sm">
          <Icon name="info" className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <span>
            <span className="block font-semibold text-brand-700">{t.photoNote}</span>
            <span className="block text-ink-muted">{t.photoNoteBody}</span>
          </span>
        </aside>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/feed')}
            className="min-h-13 w-full cursor-pointer rounded-lg border border-line bg-surface px-6 text-base font-medium text-ink shadow-sm transition-colors hover:bg-canvas sm:w-auto">
            {t.cancel}
          </button>
          <button type="submit" disabled={submitting} className={`${primaryBtn} w-full sm:w-auto`}>
            {submitting ? <Spinner label="Submitting" /> : <Icon name="send" className="size-5" />}
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
      </form>
    </main>
  );
};

function Step({ n, icon, label, required, optional, hint, children }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="flex gap-3">
          <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-semibold text-white">{n}</span>
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
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
