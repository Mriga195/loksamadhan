// The shield-and-pin mark: civic protection (shield) around a located, verified report (pin +
// check). Served from /public rather than inlined — it is a raster original, and every place
// that shows it wants the same file at a different size.
export default function Logo({ className = 'size-9' }) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={`${className} object-contain`} />;
}
