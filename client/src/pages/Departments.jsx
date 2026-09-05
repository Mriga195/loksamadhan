import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLang } from '../LangContext';
import Icon from '../components/Icon';

// One page for all civic departments, tab-switched like Feed's filters (state lives in the
// URL via ?dept=, so a department is a shareable link). `category` maps to the values Report.jsx
// actually submits; a department without a matching intake category just skips the
// "Report an issue" link instead of pointing it somewhere fake.

// Each department's translatable text is kept in EN_DEPTS.
// The id, icon, and category fields are never translated — they're sent to the server as-is.

// Pastel-first themes: soft tints per department so every tab feels distinct but harmonious
const THEMES = {
  'water-supply':    { tabBg: '#dbeafe', tabText: '#2563eb', iconBg: '#eff6ff', accent: '#3b82f6', accentDark: '#2563eb', textAccent: '#3b82f6', factBg: '#eff6ff', factText: '#1d4ed8', svgFill: '#bfdbfe', panelBg: '#f8fbff', divider: '#bfdbfe' },
  'solid-waste':     { tabBg: '#d1fae5', tabText: '#059669', iconBg: '#f0fdf4', accent: '#10b981', accentDark: '#059669', textAccent: '#059669', factBg: '#f0fdf4', factText: '#065f46', svgFill: '#a7f3d0', panelBg: '#f7fdf9', divider: '#a7f3d0' },
  'roads':           { tabBg: '#fce7f3', tabText: '#9d174d', iconBg: '#fdf2f8', accent: '#ec4899', accentDark: '#db2777', textAccent: '#9d174d', factBg: '#fdf2f8', factText: '#831843', svgFill: '#f9a8d4', panelBg: '#fdf8fb', divider: '#f9a8d4' },
  'street-lighting': { tabBg: '#ecfccb', tabText: '#3f6212', iconBg: '#f7fee7', accent: '#84cc16', accentDark: '#65a30d', textAccent: '#4d7c0f', factBg: '#f7fee7', factText: '#365314', svgFill: '#bef264', panelBg: '#f9fdf0', divider: '#bef264' },
  'drainage':        { tabBg: '#ccfbf1', tabText: '#0f766e', iconBg: '#f0fdfa', accent: '#14b8a6', accentDark: '#0f766e', textAccent: '#0f766e', factBg: '#f0fdfa', factText: '#134e4a', svgFill: '#99f6e4', panelBg: '#f5fdfb', divider: '#99f6e4' },
  'parks':           { tabBg: '#d1fae5', tabText: '#059669', iconBg: '#f0fdf4', accent: '#10b981', accentDark: '#059669', textAccent: '#059669', factBg: '#f0fdf4', factText: '#065f46', svgFill: '#a7f3d0', panelBg: '#f7fdf9', divider: '#a7f3d0' },
};

const EN_DEPTS = [
  {
    id: 'water-supply',
    icon: 'droplet',
    image: '/dept/water-supply.webp',
    name: 'Water Supply',
    summary: 'Treats and distributes drinking water, and maintains the pipeline network.',
    functions: [
      'Sourcing, treating, and distributing potable water to households',
      'Laying and maintaining water pipelines and pumping stations',
      'Metering, billing, and leak/contamination complaints',
    ],
    fact: 'A single leaking tap can waste over 10,000 litres a year — reporting leaks quickly helps conserve supply.',
  },
  {
    id: 'solid-waste',
    icon: 'trash',
    image: '/dept/solid-waste.webp',
    name: 'Solid Waste Management',
    summary: 'Collects, transports, and disposes of household and street waste.',
    functions: [
      'Door-to-door garbage collection and street sweeping',
      'Segregation, transport, and disposal per the Solid Waste Management Rules, 2016',
      'Public toilets and sanitation drives',
    ],
    fact: 'Segregating waste at source into wet and dry categories is mandatory under the Solid Waste Management Rules, 2016.',
  },
  {
    id: 'roads',
    icon: 'wrench',
    image: '/dept/roads.webp',
    name: 'Roads & Infrastructure',
    summary: 'Builds and repairs roads, footpaths, and public infrastructure.',
    functions: [
      'Construction and repair of roads, footpaths, and flyovers',
      'Potholes, encroachments, and traffic-safety infrastructure',
      'Coordinating with utilities that dig up roads',
    ],
    fact: 'A pothole left unrepaired through monsoon can double in size as water erodes the base layer beneath it.',
  },
  {
    id: 'street-lighting',
    icon: 'bulb',
    image: '/dept/street-lighting.webp',
    name: 'Street Lighting',
    summary: 'Installs and maintains street lights for public safety.',
    functions: [
      'Installing and repairing street lights',
      'Replacing faulty or unlit fixtures',
      'Upgrades to energy-efficient lighting',
    ],
    fact: 'Well-lit streets are consistently linked to fewer night-time accidents and a stronger sense of public safety.',
  },
  {
    id: 'drainage',
    icon: 'droplet',
    image: '/dept/drainage.webp',
    name: 'Drainage & Sewerage',
    summary: 'Maintains storm-water drains and sewage lines to prevent flooding and overflow.',
    functions: [
      'Storm-water drain clearing, especially before monsoon',
      'Sewage line maintenance and overflow response',
      'Waterlogging complaints',
    ],
    fact: 'Clearing storm-water drains before monsoon is one of the most effective ways cities prevent urban flooding.',
  },
  {
    id: 'parks',
    icon: 'tree',
    image: '/dept/parks.webp',
    category: null,
    name: 'Parks & Gardens',
    summary: 'Maintains public parks, gardens, and green spaces.',
    functions: [
      'Upkeep of parks, gardens, and street trees',
      'Playground equipment and public seating',
      'Tree planting and horticulture',
    ],
    fact: 'Well-maintained parks improve community well-being and environmental quality.',
  },
];

const EN_UI = {
  pageTitle: 'Departments',
  pageDesc: 'The civic departments that issues on LokSamadhan get routed to, and what each one is responsible for.',
  reportIssue: 'Report an issue',
  viewIssues: 'View issues',
  didYouKnow: 'Did you know?',
  learnMore: 'Learn more',
};

export default function Departments() {
  const [params, setParams] = useSearchParams();
  const { lang, translate } = useLang();
  const [depts, setDepts] = useState(EN_DEPTS);
  const [ui, setUi] = useState(EN_UI);

  const activeId = params.get('dept') || EN_DEPTS[0].id;
  const active = depts.find((d) => d.id === activeId) || depts[0];
  const activeEN = EN_DEPTS.find((d) => d.id === activeId) || EN_DEPTS[0];
  const theme = THEMES[activeId] || THEMES['water-supply'];

  useEffect(() => {
    if (lang === 'en') { setDepts(EN_DEPTS); setUi(EN_UI); return; }

    const uiStrings = Object.values(EN_UI);
    const deptStrings = EN_DEPTS.flatMap(d => [d.name, d.summary, ...d.functions, d.fact]);
    const allStrings = [...uiStrings, ...deptStrings];

    translate(allStrings).then((vals) => {
      const uiVals = vals.slice(0, uiStrings.length);
      setUi(Object.fromEntries(Object.keys(EN_UI).map((k, i) => [k, uiVals[i]])));

      let cursor = uiStrings.length;
      const translated = EN_DEPTS.map(d => {
        const name = vals[cursor++];
        const summary = vals[cursor++];
        const functions = d.functions.map(() => vals[cursor++]);
        const fact = vals[cursor++];
        return { ...d, name, summary, functions, fact };
      });
      setDepts(translated);
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (id) => setParams(id === EN_DEPTS[0].id ? {} : { dept: id });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Page header */}
      <h1 className="text-3xl font-extrabold">{ui.pageTitle}</h1>
      <div className="mt-2 h-1 w-10 rounded-full bg-brand-600" />
      <p className="mt-4 max-w-2xl text-sm text-ink-muted">{ui.pageDesc}</p>

      {/* Department tabs */}
      <div role="tablist" aria-label="Departments" className="mt-6 flex flex-wrap gap-3">
        {depts.map((dept) => {
          const t = THEMES[dept.id] || THEMES['water-supply'];
          const isActive = dept.id === active.id;
          return (
            <button
              key={dept.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(dept.id)}
              style={isActive
                ? { backgroundColor: t.tabBg, color: t.tabText, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
                : {}}
              className={
                'flex min-h-[56px] items-center gap-3 rounded-2xl px-4 text-left text-sm transition-all duration-200 ' +
                (isActive
                  ? 'ring-1'
                  : 'bg-surface text-ink shadow-sm hover:shadow-md')
              }
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                style={isActive
                  ? { backgroundColor: 'rgba(255,255,255,0.6)', color: t.tabText }
                  : { backgroundColor: t.iconBg, color: t.accent }}
              >
                <Icon name={dept.icon} className="size-[18px]" />
              </span>
              <span className="font-medium leading-tight">{dept.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main panel */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Left: image + details */}
        <div
          role="tabpanel"
          className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-line shadow-sm sm:flex-row"
          style={{ backgroundColor: theme.panelBg }}
        >
          {/* Image */}
          <div
            className="flex min-h-[200px] flex-shrink-0 items-center justify-center overflow-hidden sm:w-56"
            style={{ background: `linear-gradient(135deg, ${theme.tabBg}80, ${theme.iconBg})` }}
          >
            {active.image
              ? <img src={active.image} alt="" aria-hidden="true" className="size-full object-cover" />
              : <Icon name={active.icon} className="size-24" style={{ color: theme.svgFill }} />}
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col p-6">
            {/* Title row */}
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.tabBg, color: theme.tabText }}
              >
                <Icon name={active.icon} className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold leading-tight">{active.name}</h2>
                <p className="text-sm" style={{ color: theme.textAccent }}>{active.summary}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mt-4 h-px" style={{ backgroundColor: theme.divider }} />

            {/* Functions list */}
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {active.functions.map((fn, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.tabBg, color: theme.tabText }}
                  >
                    <Icon name="tick" className="size-3" />
                  </span>
                  <span className="text-ink">{fn}</span>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={active.category !== undefined && active.category !== null
                  ? `/report?category=${activeEN.category}`
                  : '/report'}
                className="inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150"
                style={{ backgroundColor: theme.tabBg, color: theme.tabText }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = theme.divider; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = theme.tabBg; }}
              >
                <Icon name={active.icon} className="size-4" />
                {ui.learnMore}
                <Icon name="right" className="size-4" />
              </Link>
              {active.category && (
                <Link
                  to={`/feed?category=${activeEN.category}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-canvas px-4 text-sm font-medium hover:border-slate-300 transition-colors duration-150"
                >
                  <Icon name="home" className="size-[18px]" />
                  {ui.viewIssues}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right: Did you know? */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 shadow-sm border border-line"
          style={{ backgroundColor: theme.factBg }}
        >
          <span
            className="flex size-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.tabBg, color: theme.tabText, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <Icon name="bulb" className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold" style={{ color: theme.factText }}>{ui.didYouKnow}</h3>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">{active.fact}</p>

          {/* Decorative background illustration */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 translate-x-4 translate-y-4"
            aria-hidden="true"
          >
            <Icon name={active.icon} className="size-32 opacity-20" style={{ color: theme.accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
