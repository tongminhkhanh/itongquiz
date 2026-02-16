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
            // --- Virtual Classroom ---
            case 'get_classes':
                return responseJSON(handleGetClasses(data));
            case 'create_class':
                return responseJSON(handleCreateClass(data));
            case 'delete_class':
                return responseJSON(handleDeleteClass(data));
            case 'get_students':
                return responseJSON(handleGetStudents(data));
            case 'add_student':
                return responseJSON(handleAddStudent(data));
            case 'delete_student':
                return responseJSON(handleDeleteStudent(data));
            case 'reset_student_password':
                return responseJSON(handleResetPassword(data));
            case 'student_login':
                return responseJSON(handleStudentLogin(data));
            case 'get_assignments':
                return responseJSON(handleGetAssignments(data));
            case 'get_teacher_assignments':
                return responseJSON(handleGetTeacherAssignments(data));
            case 'get_all_assignments':
                return responseJSON(handleGetAllAssignments(data));
            case 'get_student_assignments':
                return responseJSON(handleGetStudentAssignments(data));
            case 'create_assignment':
                return responseJSON(handleCreateAssignment(data));
            case 'delete_assignment':
                return responseJSON(handleDeleteAssignment(data));
            case 'start_assignment_attempt':
                return handleStartAssignmentAttempt(data);
            case 'update_student_avatar':
                return responseJSON(handleUpdateStudentAvatar(data));

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
        // 👇 Thêm cột "answers" vào header
        resultSheet.appendRow(["Student Name", "Class", "Quiz ID", "Quiz Title", "Score", "correctCount", "Total Questions", "Submitted At", "answers"]);
    }

    // 👇 Thêm cột "answers" vào data row
    resultSheet.appendRow([
        sanitizeInput(data.studentName),
        sanitizeInput(data.className),
        data.quizId || '',
        sanitizeInput(data.quizTitle),
        data.score,
        data.correctCount || 0,
        data.totalQuestions,
        data.submittedAt,
        JSON.stringify(data.answers || {})  // 👈 Cột mới: Lưu answers dạng JSON
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
        } else if (q.type === 'IMAGE_QUESTION') {
            options = (q.options || []).join('|');
            distractorsField = JSON.stringify(q.optionImages || []); // Save optionImages to distractors column
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
        } else if (q.type === 'RIDDLE') {
            // RIDDLE: riddleLines → items, answerLabel → text, hint → sentence (line 263)
            items = JSON.stringify(q.items || q.riddleLines || []);
            textField = q.text || q.answerLabel || "";
        } else if (q.type === 'WORD_SCRAMBLE') {
            // WORD_SCRAMBLE: letters → items, correctWord → correctAnswer, hint → text
            items = JSON.stringify(q.letters || []);
            textField = q.text || q.hint || "";
            q.correctAnswer = q.correctWord || q.correctAnswer || "";
        } else if (q.type === 'ERROR_CORRECTION') {
            // ERROR_CORRECTION: passage → text, wrongWord → distractors, correctWord → correctAnswer
            textField = q.text || q.passage || "";
            distractorsField = q.wrongWord || q.distractors || "";
            q.correctAnswer = q.correctWord || q.correctAnswer || "";
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
            (q.type === 'UNDERLINE' || q.type === 'RIDDLE') ? (q.sentence || q.hint || "") : "",  // sentence column for UNDERLINE and RIDDLE (hint)
            q.type === 'UNDERLINE' ? JSON.stringify(q.words || []) : "",  // Placeholder for 'words' column
            q.type === 'UNDERLINE' ? JSON.stringify(q.correctWordIndexes || []) : "",  // Placeholder for 'correctWordIndexes' column
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
        const distractors = row[colIdx['distractors']]; // Needed for ERROR_CORRECTION (wrongWord)
        const studentAnswer = studentAnswers[qId];

        let isCorrect = false;

        if (qType === 'MCQ' || qType === 'SHORT_ANSWER' || qType === 'IMAGE_QUESTION') {
            // Simple comparison (case-insensitive for SHORT_ANSWER)
            if (qType === 'SHORT_ANSWER') {
                isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
            } else {
                // MCQ và IMAGE_QUESTION:
                // FIX: Handle correctAnswer stored as full text (e.g., "B. 90" or "D. 5*B")
                // Extract just the letter if format is "X. text" or "X) text"
                var normalizedCorrect = String(correctAnswer).trim().toUpperCase();
                var normalizedStudent = String(studentAnswer).trim().toUpperCase();

                // Check if correctAnswer matches pattern like "A. something" or "A) something"
                var letterMatch = normalizedCorrect.match(/^([A-Z])[.\)]\s*/);
                if (letterMatch) {
                    normalizedCorrect = letterMatch[1]; // Extract just the letter
                }

                isCorrect = normalizedStudent === normalizedCorrect;
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
            // UNDERLINE: correctWordIndexes stored in correctAnswer column as JSON string
            // Student sends: [4, 5, 6, 7, 8] (array of selected word indexes)
            // correctAnswer in sheet: "[4,5,6,7,8]" (JSON string)
            try {
                var correctIndexes = JSON.parse(correctAnswer || '[]');
                var studentIndexes = Array.isArray(studentAnswer) ? studentAnswer : [];
                // Sort both to compare regardless of selection order
                var sortedCorrect = correctIndexes.slice().sort(function (a, b) { return a - b; });
                var sortedStudent = studentIndexes.slice().sort(function (a, b) { return a - b; });
                isCorrect = sortedCorrect.length === sortedStudent.length &&
                    sortedCorrect.every(function (idx, i) { return idx === sortedStudent[i]; });
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'WORD_SCRAMBLE') {
            // WORD_SCRAMBLE: correctAnswer is the correct word string
            // Student sends array of letter indexes [2, 0, 1, 3]
            // We need items (letters array) to reconstruct student word
            try {
                var letters = JSON.parse(items || '[]');
                var studentIdxArr = Array.isArray(studentAnswer) ? studentAnswer : [];
                var studentWord = studentIdxArr.map(function (idx) { return letters[idx] || ''; }).join('');
                // Remove all spaces before comparison for multi-word answers (e.g. "rộng lượng")
                isCorrect = studentWord.trim().toLowerCase().replace(/\s+/g, '') === String(correctAnswer).trim().toLowerCase().replace(/\s+/g, '');
            } catch (e) {
                isCorrect = false;
            }
        } else if (qType === 'RIDDLE') {
            // RIDDLE: Simple string comparison (case-insensitive)
            isCorrect = String(studentAnswer || '').trim().toLowerCase() === String(correctAnswer || '').trim().toLowerCase();
        } else if (qType === 'ERROR_CORRECTION') {
            // ERROR_CORRECTION: Student sends { wrongWord, correctWord }
            // correctAnswer = the correct word, distractors = the wrong word in passage
            try {
                var ecStudentWrong = String((studentAnswer && studentAnswer.wrongWord) || '').trim().toLowerCase();
                var ecStudentCorrect = String((studentAnswer && studentAnswer.correctWord) || '').trim().toLowerCase();
                var ecExpectedWrong = String(distractors || '').trim().toLowerCase();
                var ecExpectedCorrect = String(correctAnswer || '').trim().toLowerCase();
                isCorrect = ecStudentWrong === ecExpectedWrong && ecStudentCorrect === ecExpectedCorrect;
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

    // NOTE: Result is saved via submit_result action (saveResult function)
    // Do NOT save here to avoid duplicate rows

    // 4. Return result for client-side display
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

// ============ VIRTUAL CLASSROOM API ============
// Classes, Students, Assignments management
// ================================================

var CLASSROOM_SHEETS = {
    CLASSES: 'Classes',
    STUDENTS: 'Students',
    ASSIGNMENTS: 'Assignments',
};

// --- Classroom Helpers ---

function hashPassword(password) {
    var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    var hexHash = rawHash.map(function (byte) {
        var v = (byte < 0) ? 256 + byte : byte;
        return ('0' + v.toString(16)).slice(-2);
    }).join('');
    return hexHash;
}

function generateId(prefix) {
    return prefix + '-' + Utilities.getUuid().substring(0, 8);
}

function generateRandomPassword() {
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    var password = '';
    for (var i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Read sheet as array of objects (renamed to avoid conflict with existing getSheetData)
function getSheetDataAsObjects(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = data[i][j];
        }
        if (obj.id) rows.push(obj);
    }
    return rows;
}

function appendRowToSheet(sheetName, rowObject) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) { return rowObject[h] || ''; });
    sheet.appendRow(row);
}

function deleteRowById(sheetName, id) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;

    var data = sheet.getDataRange().getValues();
    var idCol = data[0].indexOf('id');
    if (idCol === -1) return false;

    for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idCol]) === String(id)) {
            sheet.deleteRow(i + 1);
            return true;
        }
    }
    return false;
}

// --- Class Handlers ---

function handleGetClasses(body) {
    var classes = getSheetDataAsObjects(CLASSROOM_SHEETS.CLASSES);
    if (body.teacherUsername) {
        classes = classes.filter(function (c) {
            return c.teacherUsername === body.teacherUsername;
        });
    }
    return { status: 'success', data: classes };
}

function handleCreateClass(body) {
    var newClass = {
        id: generateId('c'),
        name: body.name,
        teacherUsername: body.teacherUsername,
        createdAt: new Date().toISOString(),
    };
    appendRowToSheet(CLASSROOM_SHEETS.CLASSES, newClass);
    return { status: 'success', data: newClass };
}

function handleDeleteClass(body) {
    var students = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    students.forEach(function (s) {
        if (s.classId === body.classId) deleteRowById(CLASSROOM_SHEETS.STUDENTS, s.id);
    });
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    assignments.forEach(function (a) {
        if (a.classId === body.classId) deleteRowById(CLASSROOM_SHEETS.ASSIGNMENTS, a.id);
    });
    var ok = deleteRowById(CLASSROOM_SHEETS.CLASSES, body.classId);
    return ok ? { status: 'success' } : { status: 'error', message: 'Class not found' };
}

// --- Student Handlers ---

function handleGetStudents(body) {
    var students = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    students = students.filter(function (s) { return s.classId === body.classId; });

    if (body.role === 'student') {
        students = students.map(function (s) {
            return { id: s.id, fullName: s.fullName, username: s.username, classId: s.classId, avatar: s.avatar || '' };
        });
    } else {
        students = students.map(function (s) {
            return { id: s.id, fullName: s.fullName, username: s.username, classId: s.classId, parentPhone: s.parentPhone || '', avatar: s.avatar || '', createdAt: s.createdAt };
        });
    }
    return { status: 'success', data: students };
}

function handleAddStudent(body) {
    var existing = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    var duplicate = existing.some(function (s) { return s.username === body.username; });
    if (duplicate) return { status: 'error', message: 'Tên đăng nhập đã tồn tại: ' + body.username };

    var newStudent = {
        id: generateId('s'),
        fullName: body.fullName,
        username: body.username,
        passwordHash: hashPassword(body.password),
        classId: body.classId,
        parentPhone: body.parentPhone || '',
        createdAt: new Date().toISOString(),
    };
    appendRowToSheet(CLASSROOM_SHEETS.STUDENTS, newStudent);
    return { status: 'success', data: { id: newStudent.id, fullName: newStudent.fullName, username: newStudent.username, classId: newStudent.classId, parentPhone: newStudent.parentPhone, createdAt: newStudent.createdAt } };
}

function handleDeleteStudent(body) {
    var ok = deleteRowById(CLASSROOM_SHEETS.STUDENTS, body.studentId);
    return ok ? { status: 'success' } : { status: 'error', message: 'Student not found' };
}

function handleResetPassword(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.STUDENTS);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');
    var hashCol = headers.indexOf('passwordHash');

    for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(body.studentId)) {
            var newPassword = generateRandomPassword();
            sheet.getRange(i + 1, hashCol + 1).setValue(hashPassword(newPassword));
            return { status: 'success', data: { newPassword: newPassword } };
        }
    }
    return { status: 'error', message: 'Student not found' };
}

function handleStudentLogin(body) {
    var students = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    var inputHash = hashPassword(body.password);

    var student = students.find(function (s) {
        return s.username === body.username && s.passwordHash === inputHash;
    });
    if (!student) return { status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' };

    var classes = getSheetDataAsObjects(CLASSROOM_SHEETS.CLASSES);
    var cls = classes.find(function (c) { return c.id === student.classId; });

    return { status: 'success', data: { studentId: student.id, fullName: student.fullName, username: student.username, classId: student.classId, className: cls ? cls.name : '', avatar: student.avatar || '' } };
}

function handleUpdateStudentAvatar(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.STUDENTS);
    if (!sheet) return { status: 'error', message: 'Students sheet not found' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');
    var avatarCol = headers.indexOf('avatar');

    // Auto-create avatar column if missing
    if (avatarCol === -1) {
        avatarCol = headers.length;
        sheet.getRange(1, avatarCol + 1).setValue('avatar');
    }

    // Find student and update avatar
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(body.studentId)) {
            sheet.getRange(i + 1, avatarCol + 1).setValue(body.avatar || '');
            return { status: 'success', data: { avatar: body.avatar } };
        }
    }

    return { status: 'error', message: 'Student not found' };
}

// --- Assignment Handlers ---

function autoCloseExpiredAssignments(assignments, sheet, allData) {
    var now = new Date();
    var headers = allData[0];
    var statusCol = headers.indexOf('status');
    var deadlineCol = headers.indexOf('deadline');
    var idCol = headers.indexOf('id');

    for (var i = 1; i < allData.length; i++) {
        var rowId = String(allData[i][idCol]);
        var deadline = new Date(allData[i][deadlineCol]);
        var status = String(allData[i][statusCol]);

        if (status === 'OPEN' && deadline < now) {
            sheet.getRange(i + 1, statusCol + 1).setValue('CLOSED');
            assignments.forEach(function (a) {
                if (a.id === rowId) a.status = 'CLOSED';
            });
        }
    }
}

function handleGetAssignments(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    assignments = assignments.filter(function (a) { return a.classId === body.classId; });
    autoCloseExpiredAssignments(assignments, sheet, allData);
    return { status: 'success', data: assignments };
}

function handleGetTeacherAssignments(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    var classes = getSheetDataAsObjects(CLASSROOM_SHEETS.CLASSES);
    var teacherClassIds = classes.filter(function (c) { return c.teacherUsername === body.teacherUsername; }).map(function (c) { return c.id; });

    assignments = assignments.filter(function (a) { return teacherClassIds.indexOf(a.classId) !== -1; });
    autoCloseExpiredAssignments(assignments, sheet, allData);

    assignments = assignments.map(function (a) {
        var cls = classes.find(function (c) { return c.id === a.classId; });
        a.className = cls ? cls.name : '';
        return a;
    });
    return { status: 'success', data: assignments };
}

function handleGetAllAssignments(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    var classes = getSheetDataAsObjects(CLASSROOM_SHEETS.CLASSES);
    var quizzes = getSheetDataAsObjects('QUIZZES');

    autoCloseExpiredAssignments(assignments, sheet, allData);

    // Enrich assignments with quiz title and class name
    assignments = assignments.map(function (a) {
        var quiz = quizzes.find(function (q) { return String(q.id) === String(a.quizId); });
        var cls = classes.find(function (c) { return c.id === a.classId; });
        a.quizTitle = quiz ? quiz.title : 'Bài tập';
        a.className = cls ? cls.name : '';
        return a;
    });

    return { status: 'success', data: assignments };
}

function handleGetStudentAssignments(body) {
    var students = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    var student = students.find(function (s) { return s.id === body.studentId; });
    if (!student) return { status: 'error', message: 'Student not found' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CLASSROOM_SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    assignments = assignments.filter(function (a) { return a.classId === student.classId; });
    autoCloseExpiredAssignments(assignments, sheet, allData);

    // Count attempts for each assignment from Results sheet (skip STARTED-only rows)
    var resultsSheet = ss.getSheetByName('Results');
    var resultsData = resultsSheet ? resultsSheet.getDataRange().getValues() : [];
    var resultsHeaders = resultsData.length > 0 ? resultsData[0] : [];
    var nameCol = resultsHeaders.indexOf('Student Name');
    var quizIdCol = resultsHeaders.indexOf('Quiz ID');
    var answersCol = resultsHeaders.indexOf('answers');

    assignments = assignments.map(function (a) {
        var attemptCount = 0;
        if (nameCol !== -1 && quizIdCol !== -1) {
            for (var i = 1; i < resultsData.length; i++) {
                if (String(resultsData[i][nameCol]) === student.fullName &&
                    String(resultsData[i][quizIdCol]) === String(a.quizId)) {
                    // Skip STARTED-only rows (incomplete attempts from old logic)
                    var answersStr = answersCol !== -1 ? String(resultsData[i][answersCol]) : '';
                    if (answersStr === '{"status":"STARTED"}') continue;
                    attemptCount++;
                }
            }
        }
        a.attemptCount = attemptCount;
        a.maxAttempts = Number(a.maxAttempts) || 1;
        return a;
    });

    return { status: 'success', data: assignments };
}

function handleCreateAssignment(body) {
    var newAssignment = {
        id: generateId('a'),
        quizId: body.quizId,
        classId: body.classId,
        deadline: body.deadline,
        maxAttempts: Number(body.maxAttempts) || 1,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
    };
    appendRowToSheet(CLASSROOM_SHEETS.ASSIGNMENTS, newAssignment);
    return { status: 'success', data: newAssignment };
}

function handleDeleteAssignment(body) {
    var ok = deleteRowById(CLASSROOM_SHEETS.ASSIGNMENTS, body.assignmentId);
    return ok ? { status: 'success' } : { status: 'error', message: 'Assignment not found' };
}

function handleStartAssignmentAttempt(body) {
    // 1. Get Student Info
    var students = getSheetDataAsObjects(CLASSROOM_SHEETS.STUDENTS);
    var student = students.find(function (s) { return s.id === body.studentId; });
    if (!student) return responseJSON({ status: 'error', message: 'Student not found' });

    // 2. Get Assignment Info
    var assignments = getSheetDataAsObjects(CLASSROOM_SHEETS.ASSIGNMENTS);
    var assignment = assignments.find(function (a) { return String(a.id) === String(body.assignmentId); });
    if (!assignment) return responseJSON({ status: 'error', message: 'Assignment not found' });

    // 3. Server-side Attempt Check (count COMPLETED submissions only)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resultsSheet = ss.getSheetByName('Results');

    var attemptCount = 0;
    if (resultsSheet) {
        var resultsData = resultsSheet.getDataRange().getValues();
        var headers = resultsData.length > 0 ? resultsData[0] : [];
        var nameCol = headers.indexOf('Student Name');
        var quizIdCol = headers.indexOf('Quiz ID');
        var answersCol = headers.indexOf('answers');

        if (nameCol !== -1 && quizIdCol !== -1) {
            for (var i = 1; i < resultsData.length; i++) {
                if (String(resultsData[i][nameCol]) === student.fullName &&
                    String(resultsData[i][quizIdCol]) === String(assignment.quizId)) {
                    // Skip STARTED-only rows (incomplete attempts from old logic)
                    var answersStr = answersCol !== -1 ? String(resultsData[i][answersCol]) : '';
                    if (answersStr === '{"status":"STARTED"}') continue;
                    attemptCount++;
                }
            }
        }
    }

    var maxAttempts = Number(assignment.maxAttempts) || 1;
    if (attemptCount >= maxAttempts) {
        return responseJSON({ status: 'error', message: 'Max attempts reached', attemptCount: attemptCount, maxAttempts: maxAttempts });
    }

    // No longer create a STARTED row - just validate and allow
    return responseJSON({ status: 'success', attemptCount: attemptCount, maxAttempts: maxAttempts });
}

// === END OF CODE ===
