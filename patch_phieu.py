import re, pathlib

path = pathlib.Path('workers/src/routes/phieu.ts')
txt = path.read_text(encoding='utf-8')

# 1. Extend bot detection
txt = txt.replace(
    '/bot|crawl|facebookexternalhit|zalo|telegram|twitter|linkedin/i',
    '/bot|crawl|spider|facebookexternalhit|zalo|zalocrawler|telegram|whatsapp|viber|slack|twitter|linkedin|line|kakaotalk/i'
)

# 2. Replace renderOgHtml with personalized version
NEW_FN = r"""function renderOgHtml(record: any, publicToken: string): string {
    const studentName = escapeHtml(record.student_name || 'H\u1ecdc sinh');
    const baiTap      = escapeHtml(record.batch_title || record.ten_bai_tap || 'B\u00e0i ki\u1ec3m tra');
    const diem        = record.diem_so != null ? `${record.diem_so}/10` : '';
    const xepLoai     = escapeHtml(record.xep_loai || '');
    const soCauDung   = record.so_cau_dung ?? '';
    const tongCau     = record.tong_cau ?? '';

    const ogTitle = `Phi\u1ebfu k\u1ebft qu\u1ea3: ${studentName} \u2013 ${baiTap}`;
    const ogParts = [
        diem    ? `\u0110i\u1ec3m: ${diem}`                          : null,
        xepLoai ? `X\u1ebfp lo\u1ea1i: ${xepLoai}`                   : null,
        tongCau ? `S\u1ed1 c\u00e2u \u0111\u00fang: ${soCauDung}/${tongCau}` : null,
    ].filter(Boolean);
    const ogDesc = ogParts.length > 0
        ? ogParts.join(' \u00b7 ')
        : 'Xem phi\u1ebfu k\u1ebft qu\u1ea3 h\u1ecdc t\u1eadp t\u1eeb ThiTong';

    const ogImage = 'https://thitong.site/og-phieu.png';
    const url     = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}`;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(ogTitle)} | ThiTong</title>
  <meta name="description" content="${escapeHtml(ogDesc)}"/>
  <meta property="og:type"         content="website"/>
  <meta property="og:site_name"    content="ThiTong"/>
  <meta property="og:title"        content="${escapeHtml(ogTitle)}"/>
  <meta property="og:description"  content="${escapeHtml(ogDesc)}"/>
  <meta property="og:image"        content="${ogImage}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url"          content="${url}"/>
  <meta property="og:locale"       content="vi_VN"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${escapeHtml(ogTitle)}"/>
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}"/>
  <meta name="twitter:image"       content="${ogImage}"/>
  <meta http-equiv="refresh"       content="0;url=${url}"/>
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>\u0110ang chuy\u1ec3n h\u01b0\u1edbng \u0111\u1ebfn phi\u1ebfu k\u1ebft qu\u1ea3...</p>
  <a href="${url}">Nh\u1ea5n \u0111\u00e2y n\u1ebfu kh\u00f4ng t\u1ef1 chuy\u1ec3n</a>
</body>
</html>`;
}"""

txt = re.sub(
    r'function renderOgHtml\(record: any, publicToken: string\): string \{.*?^\}',
    NEW_FN,
    txt,
    flags=re.MULTILINE | re.DOTALL
)

path.write_text(txt, encoding='utf-8')
print('DONE', path.stat().st_size, 'bytes')
