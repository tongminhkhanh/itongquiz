# Báo cáo xử lý dependency — 16/07/2026

## Phạm vi

Batch này được tách riêng khỏi các commit LaTeX, Worker/API, công cụ quản trị và visual regression. Việc khắc phục sử dụng:

```bash
npm audit fix
```

Không sử dụng `--force` và không thực hiện migration major-version thủ công.

## Kết quả trước khi khắc phục

| Mức độ | Số lượng |
|---|---:|
| Critical | 1 |
| High | 7 |
| Moderate | 6 |
| Low | 1 |
| Tổng | 15 |

## Kết quả sau khi khắc phục

| Mức độ | Số lượng |
|---|---:|
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |
| Tổng | 0 |

`npm audit fix` chỉ cập nhật lockfile trong phạm vi semver được phép bởi `package.json`; không dùng `--force`.

## Lệnh vận hành

```bash
npm run audit:dependencies
npm run audit:dependencies:production
npm run audit:dependencies:enforce
```

Hai lệnh đầu sinh báo cáo JSON trong `reports/` và các file đó được Git bỏ qua. Lệnh `audit:dependencies:enforce` trả mã lỗi khi dependency production còn High hoặc Critical.

## Kết quả xác minh

Tất cả cổng bắt buộc đã đạt sau khi cập nhật lockfile:

- TypeScript: PASS
- Vitest: **50 file, 276/276 test đạt**
- Production build: PASS với Vite 6.4.3
- Math screenshot regression: **12/12 baseline SHA-256 khớp** với Cypress 15.18.1
- Full dependency audit: **0 vulnerability**
- Production dependency audit: **0 vulnerability**
- Production audit enforcement gate: PASS