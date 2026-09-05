import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { apiFetch } from './api';

// ── Language context ─────────────────────────────────────────────────────────
//
// Provides { lang, setLang, translate, loading } to the whole tree.
//
// translate(texts: string[]) → Promise<string[]>
//   - If lang === 'en', returns the originals immediately — no API call.
//   - Otherwise checks a session-level cache first (Map keyed by text),
//     fetches only uncached strings, merges results, returns all.
//   - On any error the originals are returned so the UI always renders.
//
// The cache lives in a ref (not state) so it persists across re-renders and
// across page navigations within the same session, but is cleared on full
// refresh. This keeps the session snappy without growing unboundedly.

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || 'en'
  );
  const [loading, setLoading] = useState(false);

  // session cache: `${lang}:${text}` → translatedText
  const cache = useRef(new Map());
  const pendingCount = useRef(0);

  const setLang = useCallback((l) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  }, []);

  const translate = useCallback(async (texts) => {
    if (lang === 'en') return texts;

    // Separate cached from uncached
    const uncached = [];
    const uncachedIndices = [];
    texts.forEach((text, i) => {
      const key = `${lang}:${text}`;
      if (!cache.current.has(key)) {
        uncached.push(text);
        uncachedIndices.push(i);
      }
    });

    // Fetch only what's missing
    if (uncached.length > 0) {
      pendingCount.current += 1;
      setLoading(true);
      try {
        const { translations } = await apiFetch('/api/translate', {
          method: 'POST',
          body: JSON.stringify({ texts: uncached, target: lang }),
        });
        uncached.forEach((text, idx) => {
          cache.current.set(`${lang}:${text}`, translations[idx] ?? text);
        });
      } catch (err) {
        console.warn('Translation request failed:', err);
      } finally {
        pendingCount.current = Math.max(0, pendingCount.current - 1);
        if (pendingCount.current === 0) {
          setLoading(false);
        }
      }
    }

    return texts.map((text) => cache.current.get(`${lang}:${text}`) ?? text);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, translate, loading }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
