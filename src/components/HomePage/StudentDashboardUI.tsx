import { useState } from 'react';
import SubjectLibrary from '../student/PracticeLibrary/SubjectLibrary';
import { StudentFloatingSidebar } from '../gamification/StudentFloatingSidebar';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useHomeworkStore } from '../../features/homework/stores/useHomeworkStore';
import type { HomeworkAssignment } from '../../features/homework/types';
import { useQuizStore } from '../../../stores/quizStore';
import {
  StudentDashboardContent,
  StudentDashboardModals,
  StudentLiveExamScreen,
  useStudentAccount,
  useStudentAssignments,
  useStudentAttendance,
  useStudentLiveExam,
  useStudentPracticeCatalog,
  useStudentRewards,
  type StudentDashboardSection,
} from '../../features/student-dashboard';

const StudentDashboardUI = () => {
  const studentSession = useClassroomStore((state) => state.studentSession);
  const homeworkSubmissions = useHomeworkStore((state) => state.submissions);
  const setView = useQuizStore((state) => state.setView);
  const [activeSection, setActiveSection] = useState<StudentDashboardSection>('dashboard');
  const [selectedHomework, setSelectedHomework] = useState<HomeworkAssignment | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isBadgeGalleryOpen, setIsBadgeGalleryOpen] = useState(false);
  const giftShopEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false')
    .toLowerCase() === 'true';

  const practice = useStudentPracticeCatalog();
  const assignments = useStudentAssignments(studentSession?.studentId);
  const attendance = useStudentAttendance(studentSession?.username, practice.quizzes);
  const rewards = useStudentRewards(studentSession?.username);
  const account = useStudentAccount(studentSession);
  const liveExam = useStudentLiveExam();

  if (liveExam.shouldRenderScreen) return <StudentLiveExamScreen controller={liveExam} />;
  if (!studentSession) return null;
  if (practice.selectedSubject) return <SubjectLibrary subjectId={practice.selectedSubject}
    onBack={practice.closeSubject} />;

  const openGiftShop = () => { if (giftShopEnabled) setView('shop'); };
  const selectedSubmission = selectedHomework ? homeworkSubmissions
    .find((submission) => submission.assignment_id === selectedHomework.id) : undefined;

  return (
    <div className="student-dashboard min-h-dvh bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">
      <StudentDashboardContent
        studentSession={studentSession}
        activeSection={activeSection}
        giftShopEnabled={giftShopEnabled}
        assignments={assignments}
        attendance={attendance}
        practice={practice}
        rewards={rewards}
        onSelectSection={setActiveSection}
        onOpenGiftShop={openGiftShop}
        onOpenLiveExam={liveExam.openJoinModal}
        onOpenAvatar={() => setIsAvatarOpen(true)}
        onOpenChangePassword={account.open}
        onOpenBadges={() => setIsBadgeGalleryOpen(true)}
        onLogout={account.logout}
        onSelectHomework={setSelectedHomework}
      />
      <StudentDashboardModals
        studentSession={studentSession}
        attendance={attendance}
        account={account}
        rewards={rewards}
        liveExam={liveExam}
        selectedHomework={selectedHomework}
        homeworkSubmission={selectedSubmission}
        isAvatarOpen={isAvatarOpen}
        isBadgeGalleryOpen={isBadgeGalleryOpen}
        onCloseHomework={() => setSelectedHomework(null)}
        onCloseAvatar={() => setIsAvatarOpen(false)}
        onCloseBadgeGallery={() => setIsBadgeGalleryOpen(false)}
      />
      <StudentFloatingSidebar />
    </div>
  );
};

export default StudentDashboardUI;
