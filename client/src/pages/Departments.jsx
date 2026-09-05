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
const EN_DEPTS = [
  {
    id: 'water-supply',
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
    id: 'parks', icon: 'tree', category: null,
    name: 'Parks & Gardens',
    icon: 'tree',
    image: '/dept/parks.webp',
    category: null,
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
};

export default function Departments() {
  const [params, setParams] = useSearchParams();
  const { lang, translate } = useLang();
  const [depts, setDepts] = useState(EN_DEPTS);
  const [ui, setUi] = useState(EN_UI);

  const activeId = params.get('dept') || EN_DEPTS[0].id;
  const active = depts.find((d) => d.id === activeId) || depts[0];
  const activeEN = EN_DEPTS.find((d) => d.id === activeId) || EN_DEPTS[0];

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
      <h1 className="text-3xl font-extrabold">{ui.pageTitle}</h1>
      <div className="mt-2 h-1 w-10 rounded-full bg-brand-600" />
      <p className="mt-4 max-w-2xl text-sm text-ink-muted">{ui.pageDesc}</p>

      <div role="tablist" aria-label="Departments" className="mt-6 flex flex-wrap gap-3">
        {depts.map((dept) => (
          <button key={dept.id} type="button" role="tab"
            aria-selected={dept.id === active.id} onClick={() => selectTab(dept.id)}
            className={
              'flex min-h-[64px] items-center gap-3 rounded-2xl px-4 text-left text-sm shadow-sm transition-colors duration-200 ' +
              (dept.id === active.id ? 'bg-brand-600 text-white' : 'bg-surface text-ink hover:bg-brand-50')
            }>
            <span className={
              'flex size-9 shrink-0 items-center justify-center rounded-full ' +
              (dept.id === active.id ? 'bg-white/20' : 'bg-brand-50 text-brand-600')
            }>
              <Icon name={dept.icon} className="size-[18px]" />
            </span>
            <span className="font-medium leading-tight">{dept.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div role="tabpanel" className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 sm:flex-row">
          <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 sm:max-w-xs">
            {active.image
              ? <img src={active.image} alt="" aria-hidden="true" className="size-full object-cover" />
              : <Icon name={active.icon} className="size-24 text-brand-200" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon name={active.icon} className="size-5" />
              </span>
              <h2 className="text-lg font-semibold">{active.name}</h2>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{active.summary}</p>

            <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
              {active.functions.map((fn, i) => (
                <li key={i} className="flex gap-2 py-2.5">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {fn}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={active.category ? `/report?category=${activeEN.category}` : '/report'}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
                <Icon name="plus" className="size-[18px]" />
                {ui.reportIssue}
                <Icon name="right" className="size-4" />
              </Link>
              {active.category && (
                <Link
                  to={`/feed?category=${activeEN.category}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-canvas px-4 text-sm font-medium hover:border-slate-300">
                  <Icon name="home" className="size-[18px]" />
                  {ui.viewIssues} {active.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-brand-50 p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/70 text-brand-600">
            <Icon name="bulb" className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold text-brand-700">{ui.didYouKnow}</h3>
          <p className="mt-2 text-sm text-ink-muted">{active.fact}</p>
          <Icon name={active.icon} className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-brand-100" />
        </div>
      </div>
    </div>
  );
}
