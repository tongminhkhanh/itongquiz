// workers/src/services/fontLoader.ts

const fontCache = new Map<string, ArrayBuffer>();

/**
 * Load font from R2 with caching
 * @param env - Cloudflare Worker environment
 * @param fontName - Font name without extension (e.g., 'Roboto-Regular')
 */
export async function loadFont(env: any, fontName: string): Promise<ArrayBuffer> {
  if (fontCache.has(fontName)) {
    return fontCache.get(fontName)!;
  }

  const key = `fonts/${fontName}.ttf`; // Hoặc .otf
  const obj = await env.R2.get(key);

  if (!obj) {
    throw new Error(`Font không tồn tại trong R2: ${fontName}`);
  }

  const buffer = await obj.arrayBuffer();
  fontCache.set(fontName, buffer);
  return buffer;
}

/**
 * Preload multiple fonts at once
 */
export async function preloadFonts(env: any, fontNames: string[]): Promise<Record<string, ArrayBuffer>> {
  const fonts: Record<string, ArrayBuffer> = {};

  await Promise.all(
    fontNames.map(async (name) => {
      try {
        fonts[name] = await loadFont(env, name);
      } catch (error) {
        console.warn(`Không thể load font: ${name}`, error);
      }
    })
  );

  return fonts;
}