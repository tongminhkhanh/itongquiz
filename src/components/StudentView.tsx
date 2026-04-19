import React from 'react';
import { Quiz, StudentResult } from '../types';
import { 
  AccessCodeForm, 
  StudentInfoForm, 
  SubmitConfirmModal, 
  ResultScreen, 
  QuestionRenderer 
} from './student';
import RewardOverlay from './gamification/RewardOverlay';
import { useQuizPlayer } from '../features/quiz-player/hooks/useQuizPlayer';
import QuizHeader from '../features/quiz-player/components/QuizHeader';
import QuizNavigation from '../features/quiz-player/components/QuizNavigation';
import QuizPagination from '../features/quiz-player/components/QuizPagination';

/**
 * [SENIOR ENGINEERING REFACTOR]
 * StudentView: The main entry point for students taking a quiz.
 * Now refactored into a high-performance, modular 'Shell' component.
 * 
 * Logic is centralized in 'useQuizPlayer' hook.
 * UI is decomposed into specialized sub-components for better maintainability.
 */

interface Props {
  quiz: Quiz;
  onExit: () => void;
  onSaveResult: (result: StudentResult) => void | Promise<void>;
}

const StudentView: React.FC<Props> = ({ quiz, onExit, onSaveResult }) => {
  const {
    step, studentName, setStudentName, studentClass, setStudentClass, studentAvatar,
    enteredCode, setEnteredCode, codeError, answers, timeLeft, result,
    shuffledQuestions, isSubmitting, submitError, showReward, setShowReward,
    showSubmitConfirm, setShowSubmitConfirm,
    rewardData, currentPage, setCurrentPage, totalPages, questionsOnCurrentPage,
    handleStart, handleCodeVerify, handleAnswerChange, handleMatchingClick, handleSubmit, isQuestionAnswered
  } = useQuizPlayer({ quiz, onExit, onSaveResult });

  // 1. Access Code Step
  if (step === 'code') {
    return (
      <AccessCodeForm
        quizTitle={quiz.title}
        enteredCode={enteredCode}
        onCodeChange={setEnteredCode}
        onVerify={handleCodeVerify}
        codeError={codeError}
        onExit={onExit}
      />
    );
  }

  // 2. Student Info Step
  if (step === 'info') {
    return (
      <StudentInfoForm
        quiz={quiz}
        studentName={studentName}
        onNameChange={setStudentName}
        studentClass={studentClass}
        onClassChange={setStudentClass}
        onStart={handleStart}
        onExit={onExit}
      />
    );
  }

  // 3. Quiz Execution Step
  if (step === 'quiz') {
    const QUESTIONS_PER_PAGE = 10;
    const answeredCount = shuffledQuestions.filter(isQuestionAnswered).length;
    const unansweredCount = shuffledQuestions.length - answeredCount;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header: Timer & Progress */}
        <QuizHeader 
          title={quiz.title} 
          timeLeft={timeLeft} 
          totalQuestions={shuffledQuestions.length} 
          answeredCount={answeredCount}
          isPractice={quiz.isPractice || false}
          studentName={studentName}
          avatar={studentAvatar}
        />

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar: Navigation Grid (Visible on Desktop) */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <QuizNavigation 
                questions={shuffledQuestions}
                answers={answers}
                isQuestionAnswered={isQuestionAnswered}
                currentPage={currentPage}
                QUESTIONS_PER_PAGE={QUESTIONS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </aside>

            {/* Main Content: Questions List */}
            <main className="flex-1 min-w-0">
              <div className="space-y-8">
                {questionsOnCurrentPage.map((q, idx) => (
                  <div 
                    key={q.id} 
                    id={`question-${q.id}`} 
                    className="scroll-mt-32 transition-all duration-500"
                  >
                    <QuestionRenderer
                      question={q}
                      index={(currentPage - 1) * QUESTIONS_PER_PAGE + idx}
                      answers={answers}
                      onAnswerChange={handleAnswerChange}
                      onMatchingClick={handleMatchingClick}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination & Submit Button */}
              <QuizPagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onSubmit={() => setShowSubmitConfirm(true)}
                isSubmitting={isSubmitting}
              />

              {submitError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center font-medium">
                  {submitError}
                </div>
              )}
            </main>
          </div>
        </div>

        {/* Modals */}
        <SubmitConfirmModal
          isOpen={showSubmitConfirm}
          unansweredCount={unansweredCount}
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={() => {
            setShowSubmitConfirm(false);
            handleSubmit();
          }}
        />
      </div>
    );
  }

  // 4. Result Step
  if (step === 'result' && result) {
    return (
      <>
        <ResultScreen
          quiz={quiz}
          result={result}
          answers={answers}
          onExit={onExit}
          studentName={studentName}
          studentClass={studentClass}
        />
        
        {showReward && rewardData && (
          <RewardOverlay
            expEarned={rewardData.expEarned}
            coinsEarned={rewardData.coinsEarned}
            newLevel={rewardData.newLevel}
            leveledUp={rewardData.leveledUp}
            onClose={() => setShowReward(false)}
          />
        )}
      </>
    );
  }

  return null;
};

export default StudentView;
