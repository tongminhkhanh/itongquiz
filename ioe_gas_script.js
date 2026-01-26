// ============ IOE SYSTEM - GAS SCRIPT ============
// Dùng riêng cho hệ thống IOE (Olympic Tiếng Anh)
// Deploy làm Web App riêng cho IOE Sheet

const IOE_API_SECRET_TOKEN = "ioe-4e23be7934269856066e6a3c2062e33ae4cdcc98";

// ============ MAIN HANDLERS ============

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const params = e.parameter || {};
        const postData = e.postData ? JSON.parse(e.postData.contents) : {};
        const data = { ...params, ...postData };

        // Security Check
        if (!validateToken(data.token)) {
            return responseJSON({ status: "error", message: "Unauthorized: Invalid Token" });
        }

        const action = data.action;
        const sheet = SpreadsheetApp.getActiveSpreadsheet();

        switch (action) {
            case 'get_quizzes':
                return getSheetData(sheet, 'Quizzes');
            case 'get_questions':
                return getSheetData(sheet, 'IoeQuestions');
            case 'get_results':
                return getSheetData(sheet, 'Results');
            case 'submit_result':
                return saveResult(sheet, data);
            case 'create_quiz':
                return saveQuiz(sheet, data);
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
    return token === IOE_API_SECRET_TOKEN;
}

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

function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    if (/^[\=\+\-\@]/.test(str)) {
        return "'" + str;
    }
    return str;
}

// ============ IOE DATA OPERATIONS ============

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
        data.category || "ioe",  // Default category for IOE
        data.timeLimit,
        data.createdAt,
        data.accessCode || "",
        data.requireCode ? "TRUE" : "FALSE"
    ]);

    // 2. Save Questions to 'IoeQuestions' sheet
    const questionSheet = sheet.getSheetByName("IoeQuestions");
    if (!questionSheet) throw new Error("Sheet 'IoeQuestions' not found");

    const questions = data.questions || [];
    const questionRows = questions.map(q => {
        let options = "";
        let items = "";
        let textField = "";
        let blanksField = "";
        let distractorsField = "";
        let sentence = "";
        let words = "";
        let correctWordIndex = "";

        if (q.type === 'MCQ' || q.type === 'IMAGE_QUESTION') {
            options = (q.options || []).join('|');
        } else if (q.type === 'TRUE_FALSE') {
            items = JSON.stringify(q.items || []);
        } else if (q.type === 'MATCHING') {
            items = JSON.stringify(q.pairs || []);
        } else if (q.type === 'MULTIPLE_SELECT') {
            options = (q.options || []).join('|');
        } else if (q.type === 'ORDERING') {
            items = JSON.stringify(q.items || []);
        } else if (q.type === 'SHORT_ANSWER') {
            // correctAnswer already handled
        }

        return [
            q.id,
            data.id, // quizId
            q.type,
            q.type === 'TRUE_FALSE' ? q.mainQuestion : q.question,
            options,
            q.type === 'MULTIPLE_SELECT' ? JSON.stringify(q.correctAnswers) :
                (q.type === 'ORDERING' ? JSON.stringify(q.correctOrder) : (q.correctAnswer || "")),
            items,
            textField,
            blanksField,
            distractorsField,
            sentence,
            words,
            correctWordIndex
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

    return responseJSON({ status: "success", quizId: data.id });
}

function deleteQuiz(sheet, quizId) {
    const quizSheet = sheet.getSheetByName("Quizzes");
    const questionSheet = sheet.getSheetByName("IoeQuestions");

    // Delete from Quizzes sheet
    const quizData = quizSheet.getDataRange().getValues();
    for (let i = quizData.length - 1; i >= 1; i--) {
        if (quizData[i][0] == quizId) {
            quizSheet.deleteRow(i + 1);
        }
    }

    // Delete from Questions sheet
    const questionData = questionSheet.getDataRange().getValues();
    for (let i = questionData.length - 1; i >= 1; i--) {
        if (questionData[i][1] == quizId) {
            questionSheet.deleteRow(i + 1);
        }
    }

    return responseJSON({ status: "success" });
}

function updateQuiz(sheet, data) {
    deleteQuiz(sheet, data.id);
    return saveQuiz(sheet, data);
}
