import { useState } from 'react';
import Icon from './Icon';

// Share one report.
//
// WhatsApp is the whole point: a report gathers supporters when it reaches the neighbourhood
// group, and supporterCount is what drives priority and duplicate-linking. A share button that
// opened a generic OS sheet would be one extra tap on the way to the same place.
//
// wa.me is WhatsApp's own universal link — it opens the installed app on a phone and
// web.whatsapp.com on a desktop, with no SDK and no app-id.
export default function ShareIssue({ issue }) {
  const [copied, setCopied] = useState(false);

  // Not location.href: that carries whatever query string the reader arrived with.
  const url = `${window.location.origin}/issues/${issue._id}`;
  const place = issue.address || issue.area;
  const text = `${issue.title}${place ? ` — ${place}` : ''}\n`
    + `Status: ${issue.status === 'Submitted' ? 'Pending' : issue.status}\n\n`
    + `Reported on LokSamadhan. If this affects you too, add your support here:\n${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context and permission. Fall back to selecting the link so
      // the reader can copy it by hand rather than getting nothing.
      window.prompt('Copy this link', url);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Spread the word</h2>
      <p className="mt-1 text-sm text-ink-muted">
        More people backing a report means it gets prioritised sooner.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg
            bg-[#25D366] px-4 text-sm font-semibold text-white transition-colors
            hover:bg-[#1da851]"
        >
          {/* WhatsApp's mark is a filled glyph, so it does not go through the stroke-based
              Icon set — it would come out as an outline of itself. */}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.21.89 2.39 1.01 2.55.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
          </svg>
          Share on WhatsApp
        </a>

        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg
            border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors
            hover:bg-canvas sm:shrink-0"
        >
          <Icon name={copied ? 'tick' : 'link'} className={`size-[18px] ${copied ? 'text-resolved-600' : ''}`} />
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </section>
  );
}
