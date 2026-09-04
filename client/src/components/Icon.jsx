// One inline-SVG icon set for the dashboard shell. A path dictionary instead of twenty copies
// of the same <svg> boilerplate, and instead of an icon dependency for twenty glyphs.
// Every `d` is drawn on the same 24x24 stroke grid, so they line up at any size.
const PATHS = {
  dashboard: 'M5 20v-6M11 20V8M17 20v-9M3 20h18',
  home: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9',
  clipboard: 'M9 4.5h6v3H9zM9 6H7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2',
  map: 'M12 21s7-5.2 7-10.5a7 7 0 1 0-14 0C5 15.8 12 21 12 21Zm0-12.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z',
  plus: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8.5v7M8.5 12h7',
  logout: 'M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6',
  close: 'M6 6l12 12M18 6L6 18',
  external: 'M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  download: 'M12 4v11M8 11l4 4 4-4M4 19h16',
  wrench: 'M15.5 4a4.5 4.5 0 0 0-4.1 6.4L4 17.8V20h2.2l7.4-7.4A4.5 4.5 0 1 0 15.5 4Z',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3.5 9 2.5 2.5 4.5-4.5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.5V12l3 2',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  left: 'm15 6-6 6 6 6',
  right: 'm9 6 6 6-6 6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  building: 'M4 21h16M6 21V6l6-3 6 3v15M10 10h1M14 10h1M10 14h1M14 14h1',
  photo: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6Zm0 10 4.5-4.5 4 4 3-3L20 16',
};

export default function Icon({ name, className = 'size-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
