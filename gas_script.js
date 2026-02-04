// ============ CONFIGURATION ============
// Token được hardcode để tránh lỗi cấu hình
const API_SECRET_TOKEN = "[REDACTED-COMPROMISED-SHARED-TOKEN]";

// ============ SHEET STRUCTURE ============
// Teachers Sheet Headers: username | password | fullName | role | class
// - username: Tên đăng nhập (VD: "gv1", "admin")
// - password: Mật khẩu (plain text cho app đơn giản)
// - fullName: Họ tên đầy đủ (VD: "Nguyễn Thị Lan")
// - role: "admin" hoặc "teacher"
// - class: Lớp phụ trách (VD: "3", "4A", "5") - Giáo viên chỉ tạo đề cho lớp này
//
// Quizzes Sheet Headers: id | title | classLevel | category | timeLimit | createdAt | accessCode | requireCode | createdBy
//
// Questions Sheet Headers: id | quizId | type | question | options | correctAnswer | items | text | blanks | distractors | image
//
// ============ MAIN HANDLERS ============

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    // Tăng timeout lên 60 giây để xử lý đề 100 câu hỏi
    lock.tryLock(60000);

    try {
        // 1. Lấy tham số (hỗ trợ cả GET và POST)
        const params = e.parameter || {};
        const postData = e.postData ? JSON.parse(e.postData.contents) : {};

        // Gộp tham số để xử lý thống nhất (dùng Object.assign cho GAS compatibility)
        const data = Object.assign({}, params, postData);

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
            case 'validate_answers':
                return validateAnswers(sheet, data);  // 🔐 Server-side answer validation
            case 'get_announcement':
                return getAnnouncement(sheet);  // 📢 Get announcement for marquee
            case 'save_announcement':
                return saveAnnouncement(sheet, data);  // 📢 Save announcement (admin only)
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

    const result = rows.map(function (row) {
        let obj = {};
        headers.forEach(function (header, index) {
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
        data.requireCode ? "TRUE" : "FALSE",
        sanitizeInput(data.createdBy || "") // Tên giáo viên tạo đề
    ]);

    // 2. Save Questions to 'Questions' sheet
    const questionSheet = sheet.getSheetByName("Questions");
    if (!questionSheet) throw new Error("Sheet 'Questions' not found");

    const questions = data.questions;
    const questionRows = questions.map(function (q) {
        let options = "";
        let items = "";
        let textField = "";
        let blanksField = "";
        let distractorsField = "";
        let imageField = q.image || "";

        if (q.type === 'MCQ') {
            options = q.options.join('|');
        } else if (q.type === 'TRUE_FALSE') {
            items = JSON.stringify(q.items);
        } else if (q.type === 'MATCHING') {
            items = JSON.stringify(q.pairs);
        } else if (q.type === 'MULTIPLE_SELECT') {
            options = q.options.join('|');
        } else if (q.type === 'DRAG_DROP' || q.type === 'DROPDOWN') {
            textField = q.text || "";
            blanksField = JSON.stringify(q.blanks || []);
            distractorsField = JSON.stringify(q.distractors || []); // Handled only for DRAG_DROP usually, harmless for DROPDOWN
        } else if (q.type === 'CATEGORIZATION') {
            items = JSON.stringify(q.items || []);
            // Save categories to options or distractors if needed for reconstruction, 
            // but for validation 'items' (with categoryId) is enough.
            // Let's save categories to 'distractors' to be safe and organized.
            distractorsField = JSON.stringify(q.categories || []);
        } else if (q.type === 'ORDERING') {
            items = JSON.stringify(q.items || []); // The sentences to order
            // Save correctOrder to correctAnswer column
            q.correctAnswer = JSON.stringify(q.correctOrder || []);
        } else if (q.type === 'UNDERLINE') {
            // Save words array to items (reusing items column for arrays)
            items = JSON.stringify(q.words || []);
            // Save correctWordIndexes to correctAnswer column
            q.correctAnswer = JSON.stringify(q.correctWordIndexes || []);
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
            distractorsField,
            imageField  // 🖼️ Image URL for IMAGE_QUESTION type
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

    // Helper to delete rows by filter (Batch Operation)
    function deleteRowsByFilter(targetSheet, colIndex, value) {
        const range = targetSheet.getDataRange();
        const data = range.getValues();
        if (data.length <= 1) return; // Only header

        const headers = [data[0]]; // Keep header
        const rowsToKeep = [];

        for (let i = 1; i < data.length; i++) {
            // Strict string comparison to avoid type mismatch issues
            if (String(data[i][colIndex]) !== String(value)) {
                rowsToKeep.push(data[i]);
            }
        }

        // If data changed (rows removed)
        if (rowsToKeep.length < data.length - 1) {
            // Clear all old data
            targetSheet.clearContents();

            // Write back headers and kept rows
            const newData = headers.concat(rowsToKeep);
            if (newData.length > 0) {
                targetSheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
            }
        }
    }

    deleteRowsByFilter(quizSheet, 0, quizId); // ID is col 0
    deleteRowsByFilter(questionSheet, 1, quizId); // quizId is col 1

    return responseJSON({ status: "success" });
}

// Helper to count questions by quizId
function countQuestionsByQuizId(questionSheet, quizId) {
    if (!questionSheet) return 0;
    const data = questionSheet.getDataRange().getValues();
    // Skip header (row 0), count rows where quizId (col 1) matches
    return data.slice(1).filter(function (row) { return String(row[1]) === String(quizId); }).length;
}

function updateQuiz(sheet, data) {
    // Validate input
    if (!data.id) {
        return responseJSON({ status: "error", message: "Missing quiz ID" });
    }
    if (!data.questions || !Array.isArray(data.questions)) {
        return responseJSON({ status: "error", message: "Invalid questions data" });
    }

    const expectedQuestionCount = data.questions.length;

    // 1. Delete existing data for this quiz
    deleteQuiz(sheet, data.id);

    // 2. Save new data
    const saveResult = saveQuiz(sheet, data);

    // 3. Verify saved question count
    const questionSheet = sheet.getSheetByName("Questions");
    const actualCount = countQuestionsByQuizId(questionSheet, data.id);

    if (actualCount !== expectedQuestionCount) {
        // Log the mismatch for debugging
        console.log('[updateQuiz] Question count mismatch: expected ' + expectedQuestionCount + ', got ' + actualCount);
        return responseJSON({
            status: "error",
            message: 'Save verification failed: expected ' + expectedQuestionCount + ' questions, but ' + actualCount + ' were saved'
        });
    }

    return responseJSON({ status: "success", questionCount: actualCount });
}

// ============ ANSWER VALIDATION ============
// 🔐 Server-side validation to prevent cheating
function validateAnswers(sheet, data) {
    const quizId = data.quizId;
    const studentAnswers = data.answers || {};
    const studentName = data.studentName || "Unknown";
    const studentClass = data.studentClass || "Unknown";

    // 1. Get questions for this quiz
    const questionSheet = sheet.getSheetByName("Questions");
    if (!questionSheet) {
        return responseJSON({ status: "error", message: "Questions sheet not found" });
    }

    const questionData = questionSheet.getDataRange().getValues();
    const headers = questionData[0];
    const rows = questionData.slice(1);

    // Find column indexes
    const colIdx = {};
    headers.forEach(function (h, i) { colIdx[h] = i; });

    // Filter questions for this quiz
    const quizQuestions = rows.filter(function (row) { return row[colIdx['quizId']] == quizId; });

    if (quizQuestions.length === 0) {
        return responseJSON({ status: "error", message: "No questions found for quiz: " + quizId });
    }

    // 2. Validate each answer
    let correctCount = 0;
    const details = [];

    quizQuestions.forEach(function (row) {
        const qId = row[colIdx['id']];
        const qType = row[colIdx['type']];
        const correctAnswer = row[colIdx['correctAnswer']];
        const items = row[colIdx['items']];
        const studentAnswer = studentAnswers[qId];

        let isCorrect = false;

        if (qType === 'MCQ' || qType === 'SHORT_ANSWER' || qType === 'IMAGE_QUESTION') {
            // Simple comparison (case-insensitive for SHORT_ANSWER)
            if (qType === 'SHORT_ANSWER') {
                isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
            } else {
                isCorrect = String(studentAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
            }
        } else if (qType === 'MULTIPLE_SELECT') {
            // Compare arrays
            try {
                const correct = JSON.parse(correctAnswer);
                const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                isCorrect = correct.length === student.length &&
                    correct.every(function (a) { return student.includes(a); });
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'TRUE_FALSE') {
            // Compare each item's isCorrect value
            try {
                const itemsData = JSON.parse(items);
                const studentItems = studentAnswer || {};
                isCorrect = itemsData.every(function (item, i) {
                    var itemId = item.id || ('item-' + i);
                    var studentVal = studentItems[itemId];
                    // Compare as strings to handle boolean/string mismatches safely
                    return String(studentVal) === String(item.isCorrect);
                });
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'MATCHING') {
            // Compare pairs
            try {
                const pairs = JSON.parse(items);
                const studentPairs = studentAnswer || {};
                isCorrect = pairs.every(function (pair) {
                    // Use pair.left as key to lookup student answer
                    return studentPairs[pair.left] === pair.right;
                });
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'ORDERING') {
            // Compare order array
            try {
                const correctOrder = JSON.parse(correctAnswer);
                isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(correctOrder);
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'DRAG_DROP' || qType === 'DROPDOWN') {
            // Compare blanks array
            try {
                const blanks = JSON.parse(row[colIdx['blanks']]);
                let studentBlanks = studentAnswer || [];

                // FIX: DRAG_DROP từ Client gửi lên dạng Object { index: "word" }, cần convert sang Array theo thứ tự
                if (qType === 'DRAG_DROP' && !Array.isArray(studentAnswer) && typeof studentAnswer === 'object' && studentAnswer !== null) {
                    // Sort keys numerically to reconstruct order: 1, 3, 5... (indices from split)
                    const sortedKeys = Object.keys(studentAnswer).sort(function (a, b) {
                        return Number(a) - Number(b);
                    });
                    studentBlanks = sortedKeys.map(function (k) { return studentAnswer[k]; });
                }

                if (qType === 'DRAG_DROP') {
                    // blanks is array of correct words
                    const sArr = Array.isArray(studentBlanks) ? studentBlanks : [];
                    isCorrect = blanks.length === sArr.length &&
                        blanks.every(function (b, i) {
                            return String(b).trim().toLowerCase() === String(sArr[i] || '').trim().toLowerCase();
                        });
                } else {
                    // DROPDOWN: blanks is array of {id, correctAnswer, options}
                    // studentAnswer is Object { blankId: value }
                    // FIX: Use loose comparison (trim + lowerCase)
                    isCorrect = blanks.every(function (blank) {
                        var sVal = studentAnswer[blank.id] || '';
                        var cVal = blank.correctAnswer || '';
                        return String(sVal).trim().toLowerCase() === String(cVal).trim().toLowerCase();
                    });
                }
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'CATEGORIZATION') {
            // Support CATEGORIZATION (Phân loại)
            try {
                const itemsData = JSON.parse(row[colIdx['items']] || '[]');
                const sAns = studentAnswer || {};

                isCorrect = itemsData.length > 0 && itemsData.every(function (item) {
                    // Nếu item có categoryId gán sẵn (đáp án), check xem HS có xếp đúng không
                    if (item.categoryId) {
                        return sAns[item.id] === item.categoryId;
                    }
                    return true;
                });
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'UNDERLINE') {
            // Compare selected word indexes
            try {
                const correctIndexes = JSON.parse(row[colIdx['correctWordIndexes']] || '[]');
                const studentIndexes = studentAnswer || [];
                isCorrect = correctIndexes.length === studentIndexes.length &&
                    correctIndexes.every(function (idx) { return studentIndexes.includes(idx); });
            } catch (e) {
                isCorrect = false;
            }
        }

        if (isCorrect) correctCount++;

        details.push({
            questionId: qId,
            isCorrect: isCorrect,
            correctAnswer: correctAnswer  // Return correct answer for review
        });
    });

    // 3. Calculate score
    const total = quizQuestions.length;
    const score = total > 0 ? Math.round((correctCount / total) * 10 * 10) / 10 : 0; // Score out of 10

    // 4. Save result to Results sheet
    let resultSheet = sheet.getSheetByName("Results");
    if (!resultSheet) {
        resultSheet = sheet.insertSheet("Results");
        resultSheet.appendRow(["Student Name", "Class", "Quiz ID", "Quiz Title", "Score", "correctCount", "Total Questions", "Submitted At"]);
    }

    // Get quiz title
    const quizSheet = sheet.getSheetByName("Quizzes");
    let quizTitle = "Unknown";
    if (quizSheet) {
        const quizData = quizSheet.getDataRange().getValues();
        const quizRow = quizData.find(function (r) { return r[0] == quizId; });
        if (quizRow) quizTitle = quizRow[1]; // title is column B
    }

    resultSheet.appendRow([
        sanitizeInput(studentName),
        sanitizeInput(studentClass),
        quizId,
        quizTitle,
        score,
        correctCount,
        total,
        new Date().toISOString()
    ]);

    // 5. Return result
    return responseJSON({
        status: "success",
        score: score,
        correctCount: correctCount,
        total: total,
        details: details
    });
}

// ============ ANNOUNCEMENT FUNCTIONS ============

/**
 * Get active announcement for marquee display
 */
function getAnnouncement(sheet) {
    var announcementSheet = sheet.getSheetByName("Announcements");

    // Create sheet if not exists
    if (!announcementSheet) {
        announcementSheet = sheet.insertSheet("Announcements");
        announcementSheet.appendRow(["id", "content", "isActive", "updatedAt"]);
        // Add default empty announcement
        announcementSheet.appendRow(["1", "", false, new Date().toISOString()]);
    }

    var data = announcementSheet.getDataRange().getValues();
    if (data.length < 2) {
        return responseJSON({
            status: "success",
            announcement: null
        });
    }

    // Get first row (single announcement)
    var row = data[1];
    var announcement = {
        id: row[0],
        content: row[1] || "",
        isActive: row[2] === true || row[2] === "true" || row[2] === "TRUE",
        updatedAt: row[3]
    };

    return responseJSON({
        status: "success",
        announcement: announcement
    });
}

/**
 * Save announcement (admin only)
 */
function saveAnnouncement(sheet, data) {
    var content = sanitizeInput(data.content || "");
    var isActive = data.isActive === true || data.isActive === "true";

    var announcementSheet = sheet.getSheetByName("Announcements");

    // Create sheet if not exists
    if (!announcementSheet) {
        announcementSheet = sheet.insertSheet("Announcements");
        announcementSheet.appendRow(["id", "content", "isActive", "updatedAt"]);
    }

    var dataRows = announcementSheet.getDataRange().getValues();

    if (dataRows.length < 2) {
        // No existing announcement, create new
        announcementSheet.appendRow(["1", content, isActive, new Date().toISOString()]);
    } else {
        // Update existing announcement (row 2)
        announcementSheet.getRange(2, 2).setValue(content);
        announcementSheet.getRange(2, 3).setValue(isActive);
        announcementSheet.getRange(2, 4).setValue(new Date().toISOString());
    }

    return responseJSON({
        status: "success",
        message: "Announcement saved successfully"
    });
}

// === END OF CODE ===
