/**
 * Google Apps Script - Virtual Classroom API
 *
 * INSTRUCTIONS:
 * 1. Open your existing Google Apps Script project
 * 2. Copy-paste the functions below into a new file (e.g., Classroom.gs)
 * 3. Make sure the doPost function calls routeClassroomAction()
 * 4. Create 3 new sheets: "Classes", "Students", "Assignments"
 *
 * Sheet Headers:
 * - Classes:      id | name | teacherUsername | createdAt
 * - Students:     id | fullName | username | passwordHash | classId | parentPhone | createdAt
 * - Assignments:  id | quizId | classId | deadline | status | createdAt
 */

// ==========================================
// CONFIGURATION
// ==========================================

var SHEETS = {
    CLASSES: 'Classes',
    STUDENTS: 'Students',
    ASSIGNMENTS: 'Assignments',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Simple SHA256 hash for passwords (GAS has built-in Utilities)
 */
function hashPassword(password) {
    var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    var hexHash = rawHash.map(function (byte) {
        var v = (byte < 0) ? 256 + byte : byte;
        return ('0' + v.toString(16)).slice(-2);
    }).join('');
    return hexHash;
}

/**
 * Generate a unique ID with prefix
 */
function generateId(prefix) {
    return prefix + '-' + Utilities.getUuid().substring(0, 8);
}

/**
 * Generate a random password (6 characters, easy to remember for kids)
 */
function generateRandomPassword() {
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Exclude confusing chars like l, 1, o, 0
    var password = '';
    for (var i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Get sheet data as array of objects (header row = keys)
 */
function getSheetData(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // Only header row or empty

    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = data[i][j];
        }
        // Skip empty rows
        if (obj.id) rows.push(obj);
    }
    return rows;
}

/**
 * Append a row to a sheet
 */
function appendRow(sheetName, rowObject) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) { return rowObject[h] || ''; });
    sheet.appendRow(row);
}

/**
 * Delete a row by ID
 */
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

// ==========================================
// ROUTING (Add to your existing doPost)
// ==========================================

/**
 * Route classroom actions. Call this from your doPost function:
 *
 *   function doPost(e) {
 *     var body = JSON.parse(e.postData.contents);
 *     // ... existing routing ...
 *     // Add this line:
 *     var classroomResult = routeClassroomAction(body.action, body);
 *     if (classroomResult !== null) return ContentService.createTextOutput(JSON.stringify(classroomResult));
 *     // ... rest of your routing ...
 *   }
 */
function routeClassroomAction(action, body) {
    var lock = LockService.getScriptLock();

    switch (action) {
        // --- Classes ---
        case 'get_classes':
            return handleGetClasses(body);
        case 'create_class':
            lock.waitLock(10000);
            try { return handleCreateClass(body); }
            finally { lock.releaseLock(); }
        case 'delete_class':
            lock.waitLock(10000);
            try { return handleDeleteClass(body); }
            finally { lock.releaseLock(); }

        // --- Students ---
        case 'get_students':
            return handleGetStudents(body);
        case 'add_student':
            lock.waitLock(10000);
            try { return handleAddStudent(body); }
            finally { lock.releaseLock(); }
        case 'delete_student':
            lock.waitLock(10000);
            try { return handleDeleteStudent(body); }
            finally { lock.releaseLock(); }
        case 'reset_student_password':
            lock.waitLock(10000);
            try { return handleResetPassword(body); }
            finally { lock.releaseLock(); }
        case 'student_login':
            return handleStudentLogin(body);

        // --- Assignments ---
        case 'get_assignments':
            return handleGetAssignments(body);
        case 'get_teacher_assignments':
            return handleGetTeacherAssignments(body);
        case 'get_student_assignments':
            return handleGetStudentAssignments(body);
        case 'create_assignment':
            lock.waitLock(10000);
            try { return handleCreateAssignment(body); }
            finally { lock.releaseLock(); }
        case 'delete_assignment':
            lock.waitLock(10000);
            try { return handleDeleteAssignment(body); }
            finally { lock.releaseLock(); }
        case 'update_assignment_deadline':
            lock.waitLock(10000);
            try { return handleUpdateAssignmentDeadline(body); }
            finally { lock.releaseLock(); }

        default:
            return null; // Not a classroom action
    }
}

// ==========================================
// CLASS HANDLERS
// ==========================================

function handleGetClasses(body) {
    var classes = getSheetData(SHEETS.CLASSES);
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
    appendRow(SHEETS.CLASSES, newClass);
    return { status: 'success', data: newClass };
}

function handleDeleteClass(body) {
    // Delete all students in this class first
    var students = getSheetData(SHEETS.STUDENTS);
    students.forEach(function (s) {
        if (s.classId === body.classId) {
            deleteRowById(SHEETS.STUDENTS, s.id);
        }
    });
    // Delete all assignments for this class
    var assignments = getSheetData(SHEETS.ASSIGNMENTS);
    assignments.forEach(function (a) {
        if (a.classId === body.classId) {
            deleteRowById(SHEETS.ASSIGNMENTS, a.id);
        }
    });
    // Delete the class
    var ok = deleteRowById(SHEETS.CLASSES, body.classId);
    return ok
        ? { status: 'success' }
        : { status: 'error', message: 'Class not found' };
}

// ==========================================
// STUDENT HANDLERS
// ==========================================

function handleGetStudents(body) {
    var students = getSheetData(SHEETS.STUDENTS);
    students = students.filter(function (s) {
        return s.classId === body.classId;
    });

    // Strip sensitive fields for student role
    if (body.role === 'student') {
        students = students.map(function (s) {
            return {
                id: s.id,
                fullName: s.fullName,
                username: s.username,
                classId: s.classId,
            };
        });
    } else {
        // For teacher: include parentPhone, exclude passwordHash
        students = students.map(function (s) {
            return {
                id: s.id,
                fullName: s.fullName,
                username: s.username,
                classId: s.classId,
                parentPhone: s.parentPhone || '',
                createdAt: s.createdAt,
            };
        });
    }

    return { status: 'success', data: students };
}

function handleAddStudent(body) {
    // Check username uniqueness
    var existing = getSheetData(SHEETS.STUDENTS);
    var duplicate = existing.some(function (s) {
        return s.username === body.username;
    });
    if (duplicate) {
        return { status: 'error', message: 'Tên đăng nhập đã tồn tại: ' + body.username };
    }

    var newStudent = {
        id: generateId('s'),
        fullName: body.fullName,
        username: body.username,
        passwordHash: hashPassword(body.password),
        classId: body.classId,
        parentPhone: body.parentPhone || '',
        createdAt: new Date().toISOString(),
    };
    appendRow(SHEETS.STUDENTS, newStudent);

    // Return without passwordHash
    return {
        status: 'success',
        data: {
            id: newStudent.id,
            fullName: newStudent.fullName,
            username: newStudent.username,
            classId: newStudent.classId,
            parentPhone: newStudent.parentPhone,
            createdAt: newStudent.createdAt,
        },
    };
}

function handleDeleteStudent(body) {
    var ok = deleteRowById(SHEETS.STUDENTS, body.studentId);
    return ok
        ? { status: 'success' }
        : { status: 'error', message: 'Student not found' };
}

function handleResetPassword(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.STUDENTS);
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
    var students = getSheetData(SHEETS.STUDENTS);
    var inputHash = hashPassword(body.password);

    var student = students.find(function (s) {
        return s.username === body.username && s.passwordHash === inputHash;
    });

    if (!student) {
        return { status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' };
    }

    // Get class name
    var classes = getSheetData(SHEETS.CLASSES);
    var cls = classes.find(function (c) { return c.id === student.classId; });

    return {
        status: 'success',
        data: {
            studentId: student.id,
            fullName: student.fullName,
            username: student.username,
            classId: student.classId,
            className: cls ? cls.name : '',
        },
    };
}

// ==========================================
// ASSIGNMENT HANDLERS
// ==========================================

/**
 * Auto-close expired assignments (called internally)
 */
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
            // Update in-memory too
            assignments.forEach(function (a) {
                if (a.id === rowId) a.status = 'CLOSED';
            });
        }
    }
}

function handleGetAssignments(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetData(SHEETS.ASSIGNMENTS);

    // Filter by classId
    assignments = assignments.filter(function (a) {
        return a.classId === body.classId;
    });

    // Auto-close expired
    autoCloseExpiredAssignments(assignments, sheet, allData);

    return { status: 'success', data: assignments };
}

function handleGetTeacherAssignments(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetData(SHEETS.ASSIGNMENTS);

    // Get teacher's class IDs
    var classes = getSheetData(SHEETS.CLASSES);
    var teacherClassIds = classes
        .filter(function (c) { return c.teacherUsername === body.teacherUsername; })
        .map(function (c) { return c.id; });

    // Filter assignments by teacher's classes
    assignments = assignments.filter(function (a) {
        return teacherClassIds.indexOf(a.classId) !== -1;
    });

    // Auto-close expired
    autoCloseExpiredAssignments(assignments, sheet, allData);

    // Enrich with class name
    assignments = assignments.map(function (a) {
        var cls = classes.find(function (c) { return c.id === a.classId; });
        a.className = cls ? cls.name : '';
        return a;
    });

    return { status: 'success', data: assignments };
}

function handleGetStudentAssignments(body) {
    // Get student's classId
    var students = getSheetData(SHEETS.STUDENTS);
    var student = students.find(function (s) { return s.id === body.studentId; });
    if (!student) return { status: 'error', message: 'Student not found' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'success', data: [] };

    var allData = sheet.getDataRange().getValues();
    var assignments = getSheetData(SHEETS.ASSIGNMENTS);

    assignments = assignments.filter(function (a) {
        return a.classId === student.classId;
    });

    // Auto-close expired
    autoCloseExpiredAssignments(assignments, sheet, allData);

    return { status: 'success', data: assignments };
}

function handleCreateAssignment(body) {
    var newAssignment = {
        id: generateId('a'),
        quizId: body.quizId,
        classId: body.classId,
        deadline: body.deadline,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
    };
    appendRow(SHEETS.ASSIGNMENTS, newAssignment);
    return { status: 'success', data: newAssignment };
}

function handleDeleteAssignment(body) {
    var ok = deleteRowById(SHEETS.ASSIGNMENTS, body.assignmentId);
    return ok
        ? { status: 'success' }
        : { status: 'error', message: 'Assignment not found' };
}

/**
 * Update assignment deadline (and optionally re-open if new deadline is in future)
 */
function handleUpdateAssignmentDeadline(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.ASSIGNMENTS);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');
    var deadlineCol = headers.indexOf('deadline');
    var statusCol = headers.indexOf('status');

    for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(body.assignmentId)) {
            // Update deadline
            sheet.getRange(i + 1, deadlineCol + 1).setValue(body.newDeadline);

            // Re-open if new deadline is in the future and currently CLOSED
            var newDeadline = new Date(body.newDeadline);
            var currentStatus = String(data[i][statusCol]);
            if (currentStatus === 'CLOSED' && newDeadline > new Date()) {
                sheet.getRange(i + 1, statusCol + 1).setValue('OPEN');
            }

            return {
                status: 'success',
                data: {
                    assignmentId: body.assignmentId,
                    newDeadline: body.newDeadline,
                    status: (newDeadline > new Date()) ? 'OPEN' : currentStatus,
                },
            };
        }
    }

    return { status: 'error', message: 'Assignment not found' };
}
