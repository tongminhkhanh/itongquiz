# Inject ResultRowPhieuModal render into ResultsTab.tsx
TARGET = 'src/components/TeacherDashboard/ResultsTab.tsx'

with open(TARGET, encoding='utf-8') as f:
    src = f.read()

MARKER = '{showPhieuPanel && ('
IDX = src.rfind(MARKER)  # last occurrence
if IDX == -1:
    print('MARKER NOT FOUND'); exit(1)

# Find the closing )}
END = src.find(')}', IDX)
if END == -1:
    print('END NOT FOUND'); exit(1)
END += 2  # include )}

# Also skip newline after )}
after_block = src[END:END+4]
if after_block.startswith('\r\n'):
    END += 2
elif after_block.startswith('\n'):
    END += 1

INSERT = '''        {/* Modal phi\u1ebfu k\u1ebft qu\u1ea3 cho t\u1eebng h\u1ecdc sinh */}
        {phieuResult && (
            <ResultRowPhieuModal
                result={phieuResult}
                quizTitle={
                    phieuResult.quizTitle ||
                    quizzes.find(q => q.id === phieuResult.quizId)?.title ||
                    'B\u00e0i ki\u1ec3m tra'
                }
                onClose={() => setPhieuResult(null)}
            />
        )}
'''

new_src = src[:END] + INSERT + src[END:]
with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(new_src)
print('DONE - inserted', len(INSERT), 'chars at position', END)
