import sys

path = 'workers/src/routes/phieu.ts'
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

MARKER_START = 'function renderOgHtml(record: any, publicToken: string): string {'
MARKER_END   = '\nfunction escapeHtml('

start = src.find(MARKER_START)
end   = src.find(MARKER_END, start)
if start == -1 or end == -1:
    print('MARKER NOT FOUND'); sys.exit(1)

new_fn = '''function renderOgHtml(record: any, publicToken: string): string {
    const studentName = escapeHtml(record.student_name || 'Hoc sinh');
    const baiTap      = escapeHtml(record.batch_title || record.ten_bai_tap || 'Bai kiem tra');
    const diem        = record.diem_so  != null ? String(record.diem_so) + '/10' : '';
    const xepLoai     = escapeHtml(record.xep_loai || '');
    const soCauDung   = record.so_cau_dung != null ? String(record.so_cau_dung) : '';
    const tongCau     = record.tong_cau    != null ? String(record.tong_cau)    : '';

    const parts: string[] = [];
    if (diem)                    parts.push('Diem: ' + diem);
    if (xepLoai)                 parts.push('Xep loai: ' + xepLoai);
    if (soCauDung && tongCau)    parts.push('So cau dung: ' + soCauDung + '/' + tongCau);
    const ogTitle = 'Phieu ket qua: ' + studentName + ' - ' + baiTap;
    const ogDesc  = parts.length ? parts.join(' · ') : 'Xem phieu ket qua hoc tap tu ThiTong';
    const ogImage = 'https://thitong.site/og-phieu.png';
    const url     = 'https://' + PUBLIC_PHIEU_HOST + '/p/' + encodeURIComponent(publicToken);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(ogTitle)} | ThiTong</title>
  <meta name="description"         content="${escapeHtml(ogDesc)}"/>
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
  <p>Dang chuyen huong den phieu ket qua...</p>
  <a href="${url}">Nhan day neu khong tu chuyen</a>
</body>
</html>`;
}'''

new_src = src[:start] + new_fn + src[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_src)
print('PATCHED OK - lines:', len(new_src.splitlines()))
