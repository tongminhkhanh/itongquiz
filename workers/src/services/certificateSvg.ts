import type { FieldConfig } from '../types/certificates';

export type CertificateTextData = Record<FieldConfig['key'], string>;

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildCertificateSvg(bgHref: string, fieldsConfig: FieldConfig[], data: CertificateTextData, width: number, height: number): string {
  const textNodes = fieldsConfig.map((field) => {
    const rawValue = data[field.key];
    if (rawValue === undefined || rawValue === null || rawValue === '') return '';
    const anchor = field.align === 'left' ? 'start' : field.align === 'right' ? 'end' : 'middle';
    const maxWidthAttr = field.maxWidth ? ` textLength="${field.maxWidth}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text x="${field.x}" y="${field.y}" font-family="sans-serif" font-size="${field.fontSize ?? 32}" font-weight="${field.fontWeight === 'bold' ? '700' : '400'}" fill="${field.color ?? '#000000'}" text-anchor="${anchor}" dominant-baseline="middle"${maxWidthAttr}>${escapeXml(String(rawValue))}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${bgHref}" xlink:href="${bgHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>${textNodes}</svg>`;
}
