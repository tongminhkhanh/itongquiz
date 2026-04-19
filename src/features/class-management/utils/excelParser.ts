import * as XLSX from 'xlsx';
import { CreateStudentPayload } from '../types';

export const downloadStudentTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ['Họ và tên *', 'Tên đăng nhập (để trống tự tạo)', 'Mật khẩu (để trống tự tạo)', 'SĐT phụ huynh'],
        ['Nguyễn Văn A', 'a.nv.101', 'xyz123', '0987654321'],
        ['Trần Thị B', '', '', ''],
        ['Lê Minh C', '', '', '']
    ]);

    // Auto size columns a bit
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HocSinh');
    XLSX.writeFile(wb, 'Mau_Them_Hoc_Sinh.xlsx');
};

export const parseStudentExcel = (file: File, classId: string): Promise<CreateStudentPayload[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Read as 2D array
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // validate
                if (data.length <= 1) {
                    reject(new Error('File trống hoặc không có dữ liệu (cần ít nhất 1 dòng dữ liệu không tính tiêu đề).'));
                    return;
                }

                const students: CreateStudentPayload[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0 || !row[0] || (typeof row[0] === 'string' && !row[0].trim())) {
                        continue; // Skip empty rows
                    }

                    const fullNameRow = String(row[0]).trim();
                    let usernameRow = row[1] ? String(row[1]).trim() : '';
                    let passwordRow = row[2] ? String(row[2]).trim() : '';
                    const phoneRow = row[3] ? String(row[3]).trim() : '';

                    // Generate if empty
                    if (!usernameRow) {
                        const parts = fullNameRow.toLowerCase().split(/\s+/);
                        const firstName = parts[parts.length - 1] || '';
                        const lastInitial = parts[0]?.[0] || '';
                        const mid = parts.length > 2 ? parts.slice(1, -1).map(p => p[0]).join('') : '';
                        const suffix = Math.floor(Math.random() * 900 + 100);
                        
                        const clean = (str: string) => 
                            str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
                        
                        usernameRow = clean(`${firstName}.${lastInitial}${mid}.${suffix}${i}`);
                    }

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
                }

                if (students.length === 0) {
                    reject(new Error('Không tìm thấy dữ liệu học sinh hợp lệ.'));
                } else {
                    resolve(students);
                }
            } catch (err: any) {
                reject(new Error('Lỗi đọc file Excel: ' + (err.message || 'Unknown error.')));
            }
        };

        reader.onerror = () => {
            reject(new Error('Lỗi trình duyệt khi đọc file.'));
        };

        reader.readAsArrayBuffer(file);
    });
};
