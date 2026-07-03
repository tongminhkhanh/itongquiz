import os, sys

results = []

def check(label, cond):
    status = 'PASS' if cond else 'FAIL'
    results.append((status, label))
    icon = '[OK]' if cond else '[FAIL]'
    print(f'  {icon} {label}')

root = r'C:\itongquiz1\itongquiz1\src\features\results\components'

# --- 1. File ton tai ---
check('PhieuPrintView.tsx ton tai',       os.path.exists(os.path.join(root, 'PhieuPrintView.tsx')))
check('PhieuFromResultsPanel.tsx ton tai',os.path.exists(os.path.join(root, 'PhieuFromResultsPanel.tsx')))

# --- 2. PhieuPrintView noi dung ---
with open(os.path.join(root, 'PhieuPrintView.tsx'), encoding='utf-8') as f:
    pv = f.read()

check('PhieuPrintView: co header PHIEU KET QUA',  'PHIEU KET QUA' in pv.upper().replace('\u1ebe','E').replace('\u1eba','A'))
check('PhieuPrintView: co @media print',          '@media print'            in pv)
check('PhieuPrintView: co window.print()',         'window.print()'         in pv)
check('PhieuPrintView: co A4 portrait',            'A4 portrait'            in pv)
check('PhieuPrintView: export default',            'export default PhieuPrintView' in pv)
check('PhieuPrintView: InfoRow component',         'const InfoRow'          in pv)
check('PhieuPrintView: ResultBox component',       'const ResultBox'        in pv)
check('PhieuPrintView: Section component',         'const Section'          in pv)
check('PhieuPrintView: import PhieuNhanXet types', 'PhieuNhanXet'           in pv)
check('PhieuPrintView: co showPrintButton prop',   'showPrintButton'        in pv)

# --- 3. PhieuFromResultsPanel tich hop ---
with open(os.path.join(root, 'PhieuFromResultsPanel.tsx'), encoding='utf-8') as f:
    panel = f.read()

check('Panel: import PhieuPrintView',     'PhieuPrintView'          in panel)
check('Panel: state showPrintModal',      'showPrintModal'          in panel)
check('Panel: Printer icon import',       'Printer'                 in panel)
check('Panel: render <PhieuPrintView',    '<PhieuPrintView'         in panel)
check('Panel: setShowPrintModal(true)',   'setShowPrintModal(true)' in panel)
check('Panel: dong modal (false)',        'setShowPrintModal(false)'in panel)

fails = [r for r in results if r[0] == 'FAIL']
print()
print('='*50)
if fails:
    print(f'THAT BAI: {len(fails)}/{len(results)} test failed')
    for _, l in fails:
        print(f'  - {l}')
    sys.exit(1)
else:
    print(f'TAT CA {len(results)}/{len(results)} TEST PASS!')
    sys.exit(0)
