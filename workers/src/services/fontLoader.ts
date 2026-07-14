// workers/src/services/fontLoader.ts
// Loads Roboto fonts — tries R2 first, falls back to Google Fonts CDN

const fontCache = new Map<string, ArrayBuffer>();

// CDN fallback URLs for Roboto
const ROBOTO_CDN: Record<string, string> = {
  'Roboto-Regular': 'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1Mu4WxKOzezNVE.ttf',
  'Roboto-Bold':    'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1Mu7GxKOzezNVE.ttf',
};

/**
 * Load font: tries CERT_IMAGES R2 bucket first, then CDN fallback
 */
export async function loadFont(env: any, fontName: string): Promise<ArrayBuffer> {
  if (fontCache.has(fontName)) return fontCache.get(fontName)!;

  // Try R2 (CERT_IMAGES bucket)
  try {
    const key = `fonts/${fontName}.ttf`;
    const bucket: R2Bucket | undefined = env.CERT_IMAGES;
    if (bucket) {
      const obj = await bucket.get(key);
      if (obj) {
        const buf = await obj.arrayBuffer();
        fontCache.set(fontName, buf);
        return buf;
      }
    }
  } catch (_) { /* fall through to CDN */ }

  // CDN fallback
  const url = ROBOTO_CDN[fontName];
  if (url) {
    const res = await fetch(url);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      fontCache.set(fontName, buf);
      return buf;
    }
  }

  throw new Error(`Font not found: ${fontName}`);
}

/**
 * Load Roboto Regular + Bold — used by certificateRenderer
 */
export async function loadRobotoFonts(env?: any): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  const [regular, bold] = await Promise.all([
    loadFont(env ?? {}, 'Roboto-Regular'),
    loadFont(env ?? {}, 'Roboto-Bold'),
  ]);
  return { regular, bold };
}

/**
 * Preload multiple fonts at once
 */
export async function preloadFonts(env: any, fontNames: string[]): Promise<Record<string, ArrayBuffer>> {
  const fonts: Record<string, ArrayBuffer> = {};
  await Promise.all(
    fontNames.map(async (name) => {
      try { fonts[name] = await loadFont(env, name); }
      catch (error) { console.warn(`Cannot load font: ${name}`, error); }
    })
  );
  return fonts;
}