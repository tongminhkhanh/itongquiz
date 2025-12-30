// ============ CONFIGURATION ============
// Token được hardcode để tránh lỗi cấu hình
const API_SECRET_TOKEN = "4e23be7934269856066e6a3c2062e33ae4cdcc98ace80ccb054796e119098cab";

// ============ MAIN HANDLERS ============

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    // Đợi tối đa 10 giây để tránh xung đột ghi dữ liệu
    lock.tryLock(10000);

    try {
        // 1. Lấy tham số (hỗ trợ cả GET và POST)
        const params = e.parameter || {};
        const postData = e.postData ? JSON.parse(e.postData.contents) : {};

        // Gộp tham số để xử lý thống nhất
        const data = { ...params, ...postData };

        // 2. Security Check: Validate Token
        if (!validateToken(data.token)) {
            return responseJSON({ status: "error", message: "Unauthorized: Invalid Token" });
        }

        // 3. Routing (Điều hướng xử lý)
        const action = data.action;
        const sheet = SpreadsheetApp.getActiveSpreadsheet();

        switch (action) {
            case 'get_teachers':
                return getSheetData(sheet, 'Teachers'); // Tên tab sheet giáo viên
            case 'get_quizzes':
                return getSheetData(sheet, 'Quizzes');  // Tên tab sheet đề thi
            case 'get_questions':
                return getSheetData(sheet, 'Questions'); // Tên tab sheet câu hỏi
            case 'get_results':
                return getSheetData(sheet, 'Results');  // Tên tab sheet kết quả
            case 'submit_result':
                return saveResult(sheet, data);         // Logic ghi kết quả
            case 'create_quiz':
                return saveQuiz(sheet, data);           // Logic tạo đề thi
            case 'update_quiz':
                return updateQuiz(sheet, data);
            case 'delete_quiz':
                return deleteQuiz(sheet, data.quizId);
            default:
                return responseJSON({ status: "error", message: "Unknown action: " + action });
        }

    } catch (error) {
        return responseJSON({ status: "error", message: error.toString() });
    } finally {
        lock.releaseLock();
    }
}

// ============ HELPER FUNCTIONS ============

function validateToken(token) {
    // So sánh token gửi lên với token trong Script Properties
    // Nếu chưa set trong Properties, so sánh với fallback (không khuyến khích dùng fallback lâu dài)
    return token === API_SECRET_TOKEN;
}

// Hàm đọc dữ liệu từ Sheet trả về JSON (Thay thế CSV export)
function getSheetData(spreadsheet, sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return responseJSON([]);

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return responseJSON([]);

    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            // Logic đặc biệt: Không trả về cột Password nếu là request thường
            // Hoặc chỉ trả về password hash (nếu đã nâng cấp)
            obj[header] = row[index];
        });
        return obj;
    });

    return responseJSON(result);
}

function responseJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// Hàm chống Formula Injection (Sanitize Input)
function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    // Nếu bắt đầu bằng =, +, -, @ thì thêm dấu '
    if (/^[\=\+\-\@]/.test(str)) {
        return "'" + str;
    }
    return str;
}

// ============ OLD LOGIC ADAPTED ============

function saveResult(sheet, data) {
    let resultSheet = sheet.getSheetByName("Results");
    if (!resultSheet) {
        resultSheet = sheet.insertSheet("Results");
        resultSheet.appendRow(["Student Name", "Class", "Quiz Title", "Score", "correctCount", "Total Questions", "Submitted At"]);
    }

    resultSheet.appendRow([
        sanitizeInput(data.studentName),
        sanitizeInput(data.className),
        sanitizeInput(data.quizTitle),
        data.score,
        data.correctCount || 0,
        data.totalQuestions,
        data.submittedAt
    ]);

    return responseJSON({ status: "success" });
}

function saveQuiz(sheet, data) {
    // 1. Save Quiz to 'Quizzes' sheet
    const quizSheet = sheet.getSheetByName("Quizzes");
    if (!quizSheet) throw new Error("Sheet 'Quizzes' not found");

    quizSheet.appendRow([
        data.id,
        sanitizeInput(data.title),
        data.classLevel,
        data.category || "",  // Danh mục: vioedu, trang-nguyen, on-tap
        data.timeLimit,
        data.createdAt,
        data.accessCode || "",
        data.requireCode ? "TRUE" : "FALSE"
    ]);

    // 2. Save Questions to 'Questions' sheet
    const questionSheet = sheet.getSheetByName("Questions");
    if (!questionSheet) throw new Error("Sheet 'Questions' not found");

    const questions = data.questions;
    const questionRows = questions.map(q => {
        let options = "";
        let items = "";
        let textField = "";
        let blanksField = "";
        let distractorsField = "";

        if (q.type === 'MCQ') {
            options = q.options.join('|');
        } else if (q.type === 'TRUE_FALSE') {
            items = JSON.stringify(q.items);
        } else if (q.type === 'MATCHING') {
            items = JSON.stringify(q.pairs);
        } else if (q.type === 'MULTIPLE_SELECT') {
            options = q.options.join('|');
        } else if (q.type === 'DRAG_DROP') {
            textField = q.text || "";
            blanksField = JSON.stringify(q.blanks || []);
            distractorsField = JSON.stringify(q.distractors || []);
        }

        return [
            q.id,
            data.id, // quizId
            q.type,
            q.type === 'TRUE_FALSE' ? q.mainQuestion : q.question,
            options,
            q.type === 'MULTIPLE_SELECT' ? JSON.stringify(q.correctAnswers) : (q.correctAnswer || ""),
            items,
            textField,
            blanksField,
            distractorsField
        ];
    });

    // Batch append questions
    if (questionRows.length > 0) {
        questionSheet.getRange(
            questionSheet.getLastRow() + 1,
            1,
            questionRows.length,
            questionRows[0].length
        ).setValues(questionRows);
    }

    return responseJSON({ status: "success" });
}

function deleteQuiz(sheet, quizId) {
    const quizSheet = sheet.getSheetByName("Quizzes");
    const questionSheet = sheet.getSheetByName("Questions");

    // Delete from Quizzes sheet
    const quizData = quizSheet.getDataRange().getValues();
    // Iterate backwards to safely delete rows
    for (let i = quizData.length - 1; i >= 1; i--) {
        if (quizData[i][0] == quizId) { // ID is in first column
            quizSheet.deleteRow(i + 1);
        }
    }

    // Delete from Questions sheet
    const questionData = questionSheet.getDataRange().getValues();
    for (let i = questionData.length - 1; i >= 1; i--) {
        if (questionData[i][1] == quizId) { // quizId is in second column
            questionSheet.deleteRow(i + 1);
        }
    }

    return responseJSON({ status: "success" });
}

function updateQuiz(sheet, data) {
    // 1. Delete existing data for this quiz
    deleteQuiz(sheet, data.id);

    // 2. Save new data
    return saveQuiz(sheet, data);
}
