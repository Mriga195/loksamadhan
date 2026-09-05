import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'LokSamadhan';

// One entry per public route. Anything not listed keeps the index.html defaults.
const ROUTES = {
  '/':            ['Report civic issues and track them in public', 'Report potholes, broken streetlights, uncollected garbage and water leaks. File once, see it on the map, and follow every status change your municipality makes.'],
  '/feed':        ['Live civic issue feed',      'Browse every reported civic issue on the map, filter by department and status, and see what your municipality has fixed.'],
  '/departments': ['Departments',                'See which municipal department handles roads, water, sanitation, electricity and more — and how fast each one resolves complaints.'],
  '/report':      ['Report an issue',            'File a civic complaint in under a minute: add a photo, drop a pin on the map, and get a tracking link.'],
};

// Private routes are noindex; robots.txt disallows them too, but a crawler that
// follows a direct link never reads robots.txt for the meta.
const NOINDEX = ['/login', '/register', '/profile', '/dashboard'];

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Set the document title/description for the current route. Pass overrides for dynamic pages. */
export function useSeo(title, description) {
  const { pathname } = useLocation();

  useEffect(() => {
    const [routeTitle, routeDesc] = ROUTES[pathname] || [];
    const t = title || routeTitle;
    const d = description || routeDesc;

    document.title = t ? `${t} — ${SITE}` : SITE;
    if (d) {
      setMeta('name', 'description', d);
      setMeta('property', 'og:description', d);
    }
    setMeta('property', 'og:title', document.title);

    const noindex = NOINDEX.some(p => pathname.startsWith(p));
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = new URL(pathname, import.meta.env.VITE_SITE_URL || location.origin).href;
  }, [pathname, title, description]);
}
