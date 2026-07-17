import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    saveAs: vi.fn(),
}));

vi.mock('file-saver', () => ({
    saveAs: mocks.saveAs,
}));

import {
    downloadStudentTemplate,
    parseStudentExcel,
} from '../src/features/class-management/utils/excelParser';

describe('excelParser', () => {
    it('creates the student template with the dynamically loaded ExcelJS module', async () => {
        await downloadStudentTemplate();

        expect(mocks.saveAs).toHaveBeenCalledOnce();
        const [blob, filename] = mocks.saveAs.mock.calls[0];
        expect(filename).toBe('Mau_Them_Hoc_Sinh.xlsx');
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBeGreaterThan(0);
    });

    it('reads an xlsx file with the dynamically loaded ExcelJS module', async () => {
        const { default: ExcelJS } = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('HocSinh');
        sheet.addRow(['Họ và tên', 'Tên đăng nhập', 'Mật khẩu', 'SĐT']);
        sheet.addRow(['Nguyễn Văn A', 'nguyenvana', 'abc123', '0987654321']);

        const buffer = await workbook.xlsx.writeBuffer();
        const file = new File([buffer], 'students.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        await expect(parseStudentExcel(file, 'class-1')).resolves.toEqual([
            {
                fullName: 'Nguyễn Văn A',
                username: 'nguyenvana',
                password: 'abc123',
                classId: 'class-1',
                parentPhone: '0987654321',
            },
        ]);
    });
});
