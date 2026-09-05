// Assam bounding box, [lat, lng] as Leaflet wants it.
// ponytail: rectangle, not the state polygon — a few km of neighbouring states fall inside it.
// Swap for a point-in-polygon test against an Assam GeoJSON if that ever matters.
export const ASSAM_BOUNDS = [[24.13, 89.68], [28.22, 96.03]]; // [[S, W], [N, E]]

export const inAssam = (lat, lng) =>
  lat >= ASSAM_BOUNDS[0][0] && lat <= ASSAM_BOUNDS[1][0] &&
  lng >= ASSAM_BOUNDS[0][1] && lng <= ASSAM_BOUNDS[1][1];

// Nominatim viewbox order is west,north,east,south
export const ASSAM_VIEWBOX = `${ASSAM_BOUNDS[0][1]},${ASSAM_BOUNDS[1][0]},${ASSAM_BOUNDS[1][1]},${ASSAM_BOUNDS[0][0]}`;
