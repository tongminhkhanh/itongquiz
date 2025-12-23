function doPost(e) {
    try {
        // Check if e exists
        if (!e || !e.postData) {
            return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No postData. Please deploy as Web App." }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        const data = JSON.parse(e.postData.contents);
        const sheet = SpreadsheetApp.getActiveSpreadsheet();

        // Dispatch based on type/action
        if (data.type === 'result') {
            return saveResult(sheet, data);
        } else if (data.action === 'delete') {
            return deleteQuiz(sheet, data.quizId);
        } else if (data.action === 'update') {
            return updateQuiz(sheet, data);
        } else {
            // Default to saving new quiz
            return saveQuiz(sheet, data);
        }

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function saveResult(sheet, data) {
    let resultSheet = sheet.getSheetByName("Results");
    if (!resultSheet) {
        resultSheet = sheet.insertSheet("Results");
        resultSheet.appendRow(["Student Name", "Class", "Quiz Title", "Score", "Total Questions", "Submitted At"]);
    }

    resultSheet.appendRow([
        data.studentName,
        data.className,
        data.quizTitle,
        data.score,
        data.totalQuestions,
        data.submittedAt
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
}

function saveQuiz(sheet, data) {
    // 1. Save Quiz to 'Quizzes' sheet
    const quizSheet = sheet.getSheetByName("Quizzes");
    if (!quizSheet) throw new Error("Sheet 'Quizzes' not found");

    quizSheet.appendRow([
        data.id,
        data.title,
        data.classLevel,
        data.timeLimit,
        data.createdAt,
        data.accessCode || "",      // Column F: accessCode
        data.requireCode ? "TRUE" : "FALSE"  // Column G: requireCode
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
            // For multiple select, correctAnswer column will store the JSON array of correct answers
            // We reuse the 'correctAnswer' column which is usually a string, but here it's a JSON string
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
            textField,        // Column H: text (for DRAG_DROP)
            blanksField,      // Column I: blanks (for DRAG_DROP)
            distractorsField  // Column J: distractors (for DRAG_DROP)
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

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
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

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
}

function updateQuiz(sheet, data) {
    // 1. Delete existing data for this quiz
    deleteQuiz(sheet, data.id);

    // 2. Save new data
    return saveQuiz(sheet, data);
}

// --- HÀM TEST ---
function testSaveResult() {
    const mockEvent = {
        postData: {
            contents: JSON.stringify({
                type: "result",
                studentName: "Test Student",
                className: "1A",
                quizTitle: "Test Quiz",
                score: 10,
                totalQuestions: 10,
                submittedAt: new Date().toISOString()
            })
        }
    };
    console.log(doPost(mockEvent).getContent());
}
