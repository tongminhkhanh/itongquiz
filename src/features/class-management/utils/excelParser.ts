import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CreateStudentPayload } from '../types';

// --- Template Download ---

export const downloadStudentTemplate = async (): Promise<void> => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('HocSinh');

    // Column widths
    sheet.columns = [
        { key: 'name', width: 22 },
        { key: 'username', width: 32 },
        { key: 'password', width: 27 },
        { key: 'phone', width: 17 },
    ];

    // Header row
    sheet.addRow(['Họ và tên *', 'Tên đăng nhập (để trống tự tạo)', 'Mật khẩu (để trống tự tạo)', 'SĐT phụ huynh']);
    // Sample data rows
    sheet.addRow(['Nguyễn Văn A', 'a.nv.101', 'xyz123', '0987654321']);
    sheet.addRow(['Trần Thị B', '', '', '']);
    sheet.addRow(['Lê Minh C', '', '', '']);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'Mau_Them_Hoc_Sinh.xlsx');
};

// --- Excel Parser ---

export const parseStudentExcel = (file: File, classId: string): Promise<CreateStudentPayload[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const arrayBuffer = evt.target?.result as ArrayBuffer;
                if (!arrayBuffer) {
                    reject(new Error('Không đọc được nội dung file.'));
                    return;
                }

                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);

                const sheet = workbook.worksheets[0];
                if (!sheet || sheet.rowCount <= 1) {
                    reject(new Error('File trống hoặc không có dữ liệu (cần ít nhất 1 dòng dữ liệu không tính tiêu đề).'));
                    return;
                }

                const students: CreateStudentPayload[] = [];

                // rows are 1-indexed; row 1 is the header → start from 2
                sheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // skip header

                    const getCellText = (colIdx: number): string => {
                        const cell = row.getCell(colIdx);
                        const val = cell.value;
                        if (val === null || val === undefined) return '';
                        // Handle rich-text objects
                        if (typeof val === 'object' && 'richText' in val) {
                            return (val as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('');
                        }
                        return String(val).trim();
                    };

                    const fullNameRow = getCellText(1);
                    if (!fullNameRow) return; // skip empty rows

                    let usernameRow = getCellText(2);
                    let passwordRow = getCellText(3);
                    const phoneRow = getCellText(4);

                    // Auto-generate username if empty
                    if (!usernameRow) {
                        const parts = fullNameRow.toLowerCase().split(/\s+/);
                        const firstName = parts[parts.length - 1] || '';
                        const lastInitial = parts[0]?.[0] || '';
                        const mid = parts.length > 2 ? parts.slice(1, -1).map(p => p[0]).join('') : '';
                        const suffix = Math.floor(Math.random() * 900 + 100);
                        const clean = (str: string) =>
                            str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
                        usernameRow = clean(`${firstName}.${lastInitial}${mid}.${suffix}${rowNumber}`);
                    }

                    // Auto-generate password if empty
                    if (!passwordRow) {
                        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
                        for (let k = 0; k < 6; k++) {
                            passwordRow += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }

                    students.push({
                        fullName: fullNameRow,
                        username: usernameRow,
                        password: passwordRow,
                        classId,
                        parentPhone: phoneRow,
                    });
                });

                if (students.length === 0) {
                    reject(new Error('Không tìm thấy dữ liệu học sinh hợp lệ.'));
                } else {
                    resolve(students);
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error.';
                reject(new Error('Lỗi đọc file Excel: ' + msg));
            }
        };

        reader.onerror = () => {
            reject(new Error('Lỗi trình duyệt khi đọc file.'));
        };

        reader.readAsArrayBuffer(file);
    });
};
