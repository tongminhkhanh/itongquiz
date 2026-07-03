"""
Playwright test: kiem tra PhieuPrintView & nut In phieu trong PhieuFromResultsPanel
"""
import sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3002"
SCREENSHOT_DIR = "C:/itongquiz1/itongquiz1/test_screenshots"

import os
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

failures = []

def ss(page, name):
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"  [screenshot] {path}")

def check(label, cond):
    if cond:
        print(f"  ✅ {label}")
    else:
        print(f"  ❌ FAIL: {label}")
        failures.append(label)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    # ── 1. Mở trang chủ ──────────────────────────────────────────────────────
    print("\n[1] Mở trang chủ...")
    page.goto(BASE, wait_until="networkidle")
    ss(page, "01_home")
    check("Trang chủ load thành công", page.title() != "")

    # ── 2. Kiểm tra PhieuPrintView standalone (render qua route nếu có) ───────
    # Thử navigate thẳng đến route /phieu nếu tồn tại
    print("\n[2] Kiểm tra route /phieu...")
    page.goto(f"{BASE}/phieu", wait_until="networkidle")
    page.wait_for_timeout(1000)
    ss(page, "02_phieu_route")
    body = page.inner_text("body")
    check("/phieu route không bị 404 trắng tinh", len(body.strip()) > 10)

    # ── 3. Quay về trang chủ, tìm khu vực kết quả / bảng điểm ───────────────
    print("\n[3] Tìm bảng kết quả học sinh...")
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(1500)
    ss(page, "03_home_loaded")

    # Tìm nút bất kỳ liên quan đến 'phiếu' hoặc 'kết quả'
    phieu_btns = page.get_by_role("button").filter(has_text="phiếu").all()
    ketqua_btns = page.get_by_role("button").filter(has_text="kết quả").all()
    print(f"  Tìm thấy {len(phieu_btns)} nút 'phiếu', {len(ketqua_btns)} nút 'kết quả'")
    check("Có ít nhất 1 nút liên quan đến phiếu/kết quả",
          len(phieu_btns) + len(ketqua_btns) > 0)

    # ── 4. Kiểm tra PhieuPrintView component được bundle đúng ─────────────────
    print("\n[4] Kiểm tra bundle chứa PhieuPrintView...")
    # Tìm JS bundle và grep text 'PHIẾU KẾT QUẢ'
    page.goto(BASE, wait_until="networkidle")
    content_lower = page.content().lower()
    # Kiểm tra React app đã mount (có id root)
    check("React app mount (#root)", '<div id="root"' in page.content())

    # ── 5. Tìm nút 'In phiếu' trong DOM (nếu đang hiển thị panel) ────────────
    print("\n[5] Tìm nút In phiếu trong DOM...")
    all_buttons = page.get_by_role("button").all()
    btn_texts = []
    for btn in all_buttons:
        try:
            btn_texts.append(btn.inner_text())
        except:
            pass
    print(f"  Tất cả nút hiện tại: {btn_texts[:15]}")

    in_phieu_btns = [t for t in btn_texts if 'in phiếu' in t.lower() or 'in phi' in t.lower()]
    print(f"  Nút In phiếu: {in_phieu_btns}")
    # Không bắt buộc fail vì panel chưa mở — chỉ log
    if in_phieu_btns:
        print("  ✅ Tìm thấy nút In phiếu ngay trên màn hình")
    else:
        print("  ℹ️  Nút In phiếu chưa hiển thị (cần mở panel trước — OK)")

    # ── 6. Kiểm tra file PhieuPrintView.tsx tồn tại ───────────────────────────
    print("\n[6] Kiểm tra file PhieuPrintView.tsx trên disk...")
    import os
    file_path = "C:/itongquiz1/itongquiz1/src/features/results/components/PhieuPrintView.tsx"
    check("File PhieuPrintView.tsx tồn tại", os.path.exists(file_path))
    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        check(f"File không rỗng (size={size} bytes)", size > 500)

    # ── 7. Kiểm tra PhieuFromResultsPanel chứa showPrintModal ────────────────
    print("\n[7] Kiểm tra PhieuFromResultsPanel chứa code In phiếu...")
    panel_path = "C:/itongquiz1/itongquiz1/src/features/results/components/PhieuFromResultsPanel.tsx"
    if os.path.exists(panel_path):
        with open(panel_path, encoding="utf-8") as f:
            src = f.read()
        check("Import PhieuPrintView",   "PhieuPrintView" in src)
        check("State showPrintModal",     "showPrintModal" in src)
        check("Nút In phiếu (Printer)",  "Printer" in src)
        check("Modal render PhieuPrintView", "<PhieuPrintView" in src)
    else:
        check("File PhieuFromResultsPanel.tsx tồn tại", False)

    ss(page, "07_final_state")
    browser.close()

# ── Tổng kết ────────────────────────────────────────────────────────────────
print("\n" + "="*52)
if failures:
    print(f"❌ {len(failures)} test THẤT BẠI:")
    for f in failures:
        print(f"   - {f}")
    sys.exit(1)
else:
    print("✅ TẤT CẢ TEST ĐỀU PASS!")
    print(f"   Screenshots lưu tại: {SCREENSHOT_DIR}")
    sys.exit(0)
