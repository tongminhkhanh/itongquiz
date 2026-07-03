// Font loader for Cloudflare Worker
// Roboto is fetched from Google Fonts CDN and cached via Cache API
// This avoids bundling binary .woff files which may cause issues with wrangler

const ROBOTO_REGULAR_URL = 'https://fonts.gstatic.com/s/roboto/v47/KFOmCnqEu92Fr1Mu4mxK.woff2';
const ROBOTO_BOLD_URL    = 'https://fonts.gstatic.com/s/roboto/v47/KFOlCnqEu92Fr1MmWUlfBBc4.woff2';
const CACHE_KEY_REGULAR  = 'roboto-regular-v47';
const CACHE_KEY_BOLD     = 'roboto-bold-v47';

async function fetchAndCacheFont(url: string, cacheKey: string): Promise<ArrayBuffer> {
  const cache = caches.default;
  const cacheRequest = new Request(`https://font-cache.internal/${cacheKey}`);

  const cached = await cache.match(cacheRequest);
  if (cached) return cached.arrayBuffer();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font: ${url}`);

  // Cache for 7 days
  const cloned = res.clone();
  const headers = new Headers(cloned.headers);
  headers.set('Cache-Control', 'public, max-age=604800');
  await cache.put(cacheRequest, new Response(await cloned.arrayBuffer(), { headers }));

  return res.arrayBuffer();
}

export interface LoadedFonts {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

export async function loadRobotoFonts(): Promise<LoadedFonts> {
  const [regular, bold] = await Promise.all([
    fetchAndCacheFont(ROBOTO_REGULAR_URL, CACHE_KEY_REGULAR),
    fetchAndCacheFont(ROBOTO_BOLD_URL, CACHE_KEY_BOLD),
  ]);
  return { regular, bold };
}
