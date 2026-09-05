import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import Footer from './components/Footer';
import Nav from './components/Nav';
import { useSeo } from './seo';

// React Router keeps the window scroll position across navigations, so following a footer link
// from the bottom of one page drops you at the bottom of the next one. Reset it here, once, for
// every route under <App /> — the alternative is remembering to do it in each page.
//
// Two deliberate exceptions:
//   POP           — Back/Forward. The browser restores where the reader was, and that position
//                   is the right one; overriding it loses their place.
//   search change — '?dept=' and the feed's filters are controls ON the current page, not a new
//                   page, so changing one must not throw the reader back to the top.
//
// The remembered pathname is what makes the second case work: `navigationType` flips from POP to
// PUSH when a filter is applied, which re-runs this effect on its own. Without the guard that
// counts as "a navigation happened" and scrolls, even though the page never changed.
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}

export default function App() {
  useSeo();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ScrollToTop />
      <Nav />
      <div className="flex-1 pt-20">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
