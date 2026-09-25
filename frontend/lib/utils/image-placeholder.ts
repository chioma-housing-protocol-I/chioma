// Static shimmer blurDataURL for next/image `placeholder="blur"`. A fixed
// SVG works for any image regardless of aspect ratio — next/image stretches
// and blurs it to fill the frame while the real image loads.
const SHIMMER = `
  <svg width="700" height="475" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#1e293b" offset="20%" />
        <stop stop-color="#334155" offset="50%" />
        <stop stop-color="#1e293b" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="700" height="475" fill="#1e293b" />
    <rect width="700" height="475" fill="url(#g)" />
  </svg>`;

function toBase64(str: string): string {
  return typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);
}

export const shimmerBlurDataURL = `data:image/svg+xml;base64,${toBase64(SHIMMER)}`;
