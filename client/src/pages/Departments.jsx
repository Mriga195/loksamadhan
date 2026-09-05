import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';

// One page for all civic departments, tab-switched like Feed's filters (state lives in the
// URL via ?dept=, so a department is a shareable link). Descriptions are the general functions
// Indian municipal corporations carry out (water & sewerage, solid waste per the SWM Rules 2016,
// roads, street lighting, parks) — this app isn't tied to one city, so nothing here is
// city-specific. `category` maps to the values Report.jsx actually submits (Report.jsx:9); a
// department without a matching intake category just skips the "Report an issue" link instead
// of pointing it somewhere fake.

const DEPARTMENTS = [
  {
    id: 'water-supply',
    name: 'Water Supply',
    icon: 'droplet',
    category: 'Water',
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
    name: 'Solid Waste Management',
    icon: 'trash',
    category: 'Sanitation',
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
    name: 'Roads & Infrastructure',
    icon: 'map',
    category: 'Road',
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
    name: 'Street Lighting',
    icon: 'bulb',
    category: 'Streetlight',
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
    name: 'Drainage & Sewerage',
    icon: 'droplet',
    category: 'Drainage',
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
    name: 'Parks & Gardens',
    icon: 'tree',
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

export default function Departments() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('dept') || DEPARTMENTS[0].id;
  const active = DEPARTMENTS.find((d) => d.id === activeId) || DEPARTMENTS[0];

  const selectTab = (id) => setParams(id === DEPARTMENTS[0].id ? {} : { dept: id });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Departments</h1>
      <div className="mt-2 h-1 w-10 rounded-full bg-brand-600" />
      <p className="mt-4 max-w-2xl text-sm text-ink-muted">
        The civic departments that issues on LokSamadhan get routed to, and what each one is
        responsible for.
      </p>

      <div role="tablist" aria-label="Departments" className="mt-6 flex flex-wrap gap-3">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.id}
            type="button"
            role="tab"
            aria-selected={dept.id === active.id}
            onClick={() => selectTab(dept.id)}
            className={
              'flex min-h-[64px] items-center gap-3 rounded-2xl px-4 text-left text-sm shadow-sm transition-colors duration-200 ' +
              (dept.id === active.id ? 'bg-brand-600 text-white' : 'bg-surface text-ink hover:bg-brand-50')
            }
          >
            <span
              className={
                'flex size-9 shrink-0 items-center justify-center rounded-full ' +
                (dept.id === active.id ? 'bg-white/20' : 'bg-brand-50 text-brand-600')
              }
            >
              <Icon name={dept.icon} className="size-[18px]" />
            </span>
            <span className="font-medium leading-tight">{dept.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div role="tabpanel" className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 sm:flex-row">
          <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 sm:max-w-xs">
            <Icon name={active.icon} className="size-24 text-brand-200" />
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
              {active.functions.map((fn) => (
                <li key={fn} className="flex gap-2 py-2.5">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {fn}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Icon name="plus" className="size-[18px]" />
                Report an issue
                <Icon name="right" className="size-4" />
              </Link>
              {active.category && (
                <Link
                  to={`/feed?category=${active.category}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-canvas px-4 text-sm font-medium hover:border-slate-300"
                >
                  <Icon name="home" className="size-[18px]" />
                  View {active.name} issues
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-brand-50 p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/70 text-brand-600">
            <Icon name="bulb" className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold text-brand-700">Did you know?</h3>
          <p className="mt-2 text-sm text-ink-muted">{active.fact}</p>
          <Icon name={active.icon} className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-brand-100" />
        </div>
      </div>
    </div>
  );
}
