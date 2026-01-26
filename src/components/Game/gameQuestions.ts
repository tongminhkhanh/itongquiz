/**
 * Game Question Bank
 * Bộ câu hỏi cho game "Ong Thợ Tìm Mật"
 */

export interface GameQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
}

export const GAME_QUESTIONS: GameQuestion[] = [
    // === TOÁN HỌC (15 câu) ===
    { id: 'math1', text: '5 + 3 = ?', options: ['6', '7', '8', '9'], correctAnswer: '8' },
    { id: 'math2', text: '10 - 4 = ?', options: ['5', '6', '7', '8'], correctAnswer: '6' },
    { id: 'math3', text: '2 × 3 = ?', options: ['4', '5', '6', '7'], correctAnswer: '6' },
    { id: 'math4', text: '8 ÷ 2 = ?', options: ['2', '3', '4', '5'], correctAnswer: '4' },
    { id: 'math5', text: '7 + 8 = ?', options: ['13', '14', '15', '16'], correctAnswer: '15' },
    { id: 'math6', text: '20 - 7 = ?', options: ['11', '12', '13', '14'], correctAnswer: '13' },
    { id: 'math7', text: '5 × 4 = ?', options: ['15', '20', '25', '30'], correctAnswer: '20' },
    { id: 'math8', text: '12 ÷ 3 = ?', options: ['2', '3', '4', '5'], correctAnswer: '4' },
    { id: 'math9', text: '9 + 6 = ?', options: ['13', '14', '15', '16'], correctAnswer: '15' },
    { id: 'math10', text: '15 - 8 = ?', options: ['5', '6', '7', '8'], correctAnswer: '7' },
    { id: 'math11', text: '3 × 7 = ?', options: ['18', '20', '21', '24'], correctAnswer: '21' },
    { id: 'math12', text: '16 ÷ 4 = ?', options: ['2', '3', '4', '5'], correctAnswer: '4' },
    { id: 'math13', text: '11 + 9 = ?', options: ['18', '19', '20', '21'], correctAnswer: '20' },
    { id: 'math14', text: '25 - 12 = ?', options: ['11', '12', '13', '14'], correctAnswer: '13' },
    { id: 'math15', text: '6 × 6 = ?', options: ['30', '32', '34', '36'], correctAnswer: '36' },

    // === TIẾNG VIỆT (15 câu) ===
    { id: 'viet1', text: 'Con gì kêu "meo meo"?', options: ['Chó', 'Mèo', 'Gà', 'Vịt'], correctAnswer: 'Mèo' },
    { id: 'viet2', text: 'Con gì kêu "gâu gâu"?', options: ['Chó', 'Mèo', 'Heo', 'Bò'], correctAnswer: 'Chó' },
    { id: 'viet3', text: 'Quả gì màu đỏ, vị ngọt?', options: ['Táo', 'Chuối', 'Cam', 'Xoài'], correctAnswer: 'Táo' },
    { id: 'viet4', text: 'Đâu là con vật biết bay?', options: ['Chó', 'Mèo', 'Chim', 'Cá'], correctAnswer: 'Chim' },
    { id: 'viet5', text: 'Thủ đô Việt Nam là?', options: ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Huế'], correctAnswer: 'Hà Nội' },
    { id: 'viet6', text: 'Đâu là màu của lá cây?', options: ['Đỏ', 'Xanh', 'Vàng', 'Tím'], correctAnswer: 'Xanh' },
    { id: 'viet7', text: 'Mặt trời mọc ở đâu?', options: ['Đông', 'Tây', 'Nam', 'Bắc'], correctAnswer: 'Đông' },
    { id: 'viet8', text: 'Con gì sống dưới nước?', options: ['Chó', 'Mèo', 'Cá', 'Gà'], correctAnswer: 'Cá' },
    { id: 'viet9', text: 'Quả gì có màu vàng, vị chua?', options: ['Táo', 'Chanh', 'Cam', 'Xoài'], correctAnswer: 'Chanh' },
    { id: 'viet10', text: 'Ngày có mấy giờ?', options: ['12', '20', '24', '30'], correctAnswer: '24' },
    { id: 'viet11', text: 'Tuần có mấy ngày?', options: ['5', '6', '7', '8'], correctAnswer: '7' },
    { id: 'viet12', text: 'Năm có mấy tháng?', options: ['10', '11', '12', '13'], correctAnswer: '12' },
    { id: 'viet13', text: 'Con ong làm ra gì?', options: ['Sữa', 'Mật', 'Nước', 'Mía'], correctAnswer: 'Mật' },
    { id: 'viet14', text: 'Trái Đất có mấy mùa?', options: ['2', '3', '4', '5'], correctAnswer: '4' },
    { id: 'viet15', text: 'Cầu vồng có mấy màu?', options: ['5', '6', '7', '8'], correctAnswer: '7' },

    // === TIẾNG ANH (10 câu) ===
    { id: 'eng1', text: '"Cat" tiếng Việt là?', options: ['Chó', 'Mèo', 'Gà', 'Vịt'], correctAnswer: 'Mèo' },
    { id: 'eng2', text: '"Dog" tiếng Việt là?', options: ['Chó', 'Mèo', 'Heo', 'Bò'], correctAnswer: 'Chó' },
    { id: 'eng3', text: '"Red" là màu gì?', options: ['Đỏ', 'Xanh', 'Vàng', 'Tím'], correctAnswer: 'Đỏ' },
    { id: 'eng4', text: '"Blue" là màu gì?', options: ['Đỏ', 'Xanh', 'Vàng', 'Tím'], correctAnswer: 'Xanh' },
    { id: 'eng5', text: '"One" là số mấy?', options: ['1', '2', '3', '4'], correctAnswer: '1' },
    { id: 'eng6', text: '"Two" là số mấy?', options: ['1', '2', '3', '4'], correctAnswer: '2' },
    { id: 'eng7', text: '"Apple" là quả gì?', options: ['Táo', 'Chuối', 'Cam', 'Xoài'], correctAnswer: 'Táo' },
    { id: 'eng8', text: '"Sun" nghĩa là?', options: ['Mặt trời', 'Mặt trăng', 'Sao', 'Mây'], correctAnswer: 'Mặt trời' },
    { id: 'eng9', text: '"Water" nghĩa là?', options: ['Lửa', 'Nước', 'Đất', 'Gió'], correctAnswer: 'Nước' },
    { id: 'eng10', text: '"Book" nghĩa là?', options: ['Bút', 'Sách', 'Vở', 'Bảng'], correctAnswer: 'Sách' },

    // === KHOA HỌC (10 câu) ===
    { id: 'sci1', text: 'Nước đóng băng ở nhiệt độ?', options: ['0°C', '10°C', '100°C', '50°C'], correctAnswer: '0°C' },
    { id: 'sci2', text: 'Nước sôi ở nhiệt độ?', options: ['0°C', '50°C', '100°C', '150°C'], correctAnswer: '100°C' },
    { id: 'sci3', text: 'Con người có mấy giác quan?', options: ['3', '4', '5', '6'], correctAnswer: '5' },
    { id: 'sci4', text: 'Tim bơm máu đi khắp?', options: ['Não', 'Gan', 'Thân thể', 'Phổi'], correctAnswer: 'Thân thể' },
    { id: 'sci5', text: 'Cây cần gì để sống?', options: ['Nước & ánh sáng', 'Chỉ nước', 'Chỉ đất', 'Chỉ phân'], correctAnswer: 'Nước & ánh sáng' },
    { id: 'sci6', text: 'Khí CO2 do đâu thải ra?', options: ['Cây cối', 'Con người & động vật', 'Nước', 'Đất'], correctAnswer: 'Con người & động vật' },
    { id: 'sci7', text: 'Mặt trăng quay quanh?', options: ['Mặt trời', 'Trái Đất', 'Sao Hỏa', 'Sao Kim'], correctAnswer: 'Trái Đất' },
    { id: 'sci8', text: 'Kim loại nào nhẹ nhất?', options: ['Sắt', 'Đồng', 'Nhôm', 'Vàng'], correctAnswer: 'Nhôm' },
    { id: 'sci9', text: 'Âm thanh truyền qua?', options: ['Chân không', 'Không khí', 'Chỉ nước', 'Không gì'], correctAnswer: 'Không khí' },
    { id: 'sci10', text: 'Cầu vồng xuất hiện khi?', options: ['Trời mưa & nắng', 'Chỉ mưa', 'Chỉ nắng', 'Đêm tối'], correctAnswer: 'Trời mưa & nắng' },
];

/**
 * Hàm shuffle (xáo trộn) mảng
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Lấy N câu hỏi ngẫu nhiên
 */
export function getRandomQuestions(count: number = 50): GameQuestion[] {
    const shuffled = shuffleArray(GAME_QUESTIONS);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}
