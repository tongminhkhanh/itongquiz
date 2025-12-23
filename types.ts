export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  MATCHING = 'MATCHING',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
}

export interface MCQQuestion {
  id: string;
  type: QuestionType.MCQ;
  question: string;
  options: string[]; // [A, B, C, D]
  correctAnswer: string; // "A", "B", "C", or "D"
  image?: string; // URL or Base64
}

export interface MultipleSelectQuestion {
  id: string;
  type: QuestionType.MULTIPLE_SELECT;
  question: string;
  options: string[];
  correctAnswers: string[]; // ["A", "C"]
  image?: string;
}

export interface TrueFalseItem {
  id: string;
  statement: string;
  isCorrect: boolean; // True if statement is correct (Đ), False if incorrect (S)
}

export interface TrueFalseQuestion {
  id: string;
  type: QuestionType.TRUE_FALSE;
  mainQuestion: string; // e.g., "Về nước:"
  items: TrueFalseItem[];
  image?: string;
}

export interface ShortAnswerQuestion {
  id: string;
  type: QuestionType.SHORT_ANSWER;
  question: string;
  correctAnswer: string; // Short string
  image?: string;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingQuestion {
  id: string;
  type: QuestionType.MATCHING;
  question: string; // "Nối cột A với cột B"
  pairs: MatchingPair[];
  image?: string;
}

// Image Library Item for teacher uploads
export interface ImageLibraryItem {
  id: string;
  name: string; // File name or description
  data: string; // Base64 data
  topic?: string; // Optional topic tag
  createdAt: string;
}

export type Question = MCQQuestion | TrueFalseQuestion | ShortAnswerQuestion | MatchingQuestion | MultipleSelectQuestion;

export interface Quiz {
  id: string;
  title: string; // e.g., "Ôn tập Khoa học lớp 3: Không khí và Nước"
  classLevel: string; // 1, 2, 3, 4, 5
  timeLimit: number; // in minutes
  questions: Question[];
  createdAt: string;
}

export interface StudentResult {
  id: string; // UUID
  quizId: string;
  studentName: string;
  studentClass: string;
  score: number; // 0-10
  correctCount: number;
  totalQuestions: number;
  timeTaken: number; // in minutes
  submittedAt: string;
  answers: Record<string, any>; // Store student answers
}

export interface Teacher {
  username: string;
  password: string; // Plain text for this simple app
  fullName: string;
}
