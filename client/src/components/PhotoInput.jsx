import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Three fixed slots, filled left to right. The empty slots are drawn rather than hidden so the
// row never reflows as photos are added, and "how many can I still add" is answered by looking.
const MAX = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function PhotoInput({ onPhotosChange }) {
  const [photos, setPhotos] = useState([]);      // File[]
  const [previews, setPreviews] = useState([]);  // object URLs, index-aligned with photos
  const [error, setError] = useState(null);
  const latestPreviews = useRef(previews);
  latestPreviews.current = previews;

  // Revoke on unmount only — revoking per render would blank the images still on screen.
  useEffect(() => () => latestPreviews.current.forEach(URL.revokeObjectURL), []);

  const commit = (files, urls) => {
    setPhotos(files);
    setPreviews(urls);
    onPhotosChange?.(files);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    setError(null);

    if (photos.length + selected.length > MAX) return setError(`Maximum ${MAX} photos allowed.`);
    if (selected.some(f => !TYPES.includes(f.type))) {
      return setError('Only JPEG, PNG and WebP images are allowed.');
    }
    if (selected.some(f => f.size > MAX_BYTES)) {
      return setError('Each photo must be 5MB or smaller.');
    }

    commit([...photos, ...selected], [...previews, ...selected.map(f => URL.createObjectURL(f))]);
  };

  const removePhoto = (i) => {
    URL.revokeObjectURL(previews[i]);
    commit(photos.filter((_, n) => n !== i), previews.filter((_, n) => n !== i));
  };

  return (
    <div>
      {error && <p role="alert" className="mb-2 text-xs font-medium text-rejected-600">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {previews.map((url, i) => (
          <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line">
            <img src={url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center
                rounded-full bg-ink/70 text-white transition-colors hover:bg-rejected-600"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ))}

        {photos.length < MAX && (
          <label
            className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center
              gap-1 rounded-lg border-2 border-dashed border-brand-200 bg-brand-50/60
              text-brand-600 transition-colors hover:bg-brand-50"
          >
            <input
              type="file"
              accept={TYPES.join(',')}
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />
            <Icon name="plus" className="size-6" />
            <span className="text-sm font-medium">Add photo</span>
            <span className="text-xs text-ink-muted">Up to {MAX} photos</span>
          </label>
        )}

        {/* Placeholders for the slots still free. */}
        {Array.from({ length: Math.max(0, MAX - photos.length - 1) }, (_, i) => (
          <div key={`empty-${i}`} aria-hidden="true"
            className="grid aspect-[4/3] place-items-center rounded-lg border-2 border-dashed
              border-line text-slate-300">
            <Icon name="photo" className="size-7" />
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        {photos.length} / {MAX} photos added &nbsp;•&nbsp; Max 5MB each &nbsp;•&nbsp; JPG, PNG
      </p>
    </div>
  );
}
