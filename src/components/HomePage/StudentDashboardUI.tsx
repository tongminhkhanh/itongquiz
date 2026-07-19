import { useParams } from 'react-router-dom';
import SubjectLibrary from '../student/PracticeLibrary/SubjectLibrary';
import { StudentFloatingSidebar } from '../gamification/StudentFloatingSidebar';
import {
  StudentDashboardContent,
  StudentDashboardModals,
  StudentLiveExamScreen,
  useStudentDashboardController,
} from '../../features/student-dashboard';
import { isPracticeSubjectId } from '../../features/student-dashboard/model';

const StudentDashboardUI = () => {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const controller = useStudentDashboardController();
  const {
    studentSession, liveExam, practice, activeSection, giftShopEnabled,
    assignments, attendance, rewards, account,
  } = controller;

  if (liveExam.shouldRenderScreen) return <StudentLiveExamScreen controller={liveExam} />;
  if (!studentSession) return null;
  if (subjectId) {
    return (
      <SubjectLibrary
        subjectId={subjectId}
        isValidSubject={isPracticeSubjectId(subjectId)}
        onBack={practice.closeSubject}
      />
    );
  }

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
        onSelectSection={controller.setActiveSection}
        onOpenGiftShop={controller.openGiftShop}
        onOpenLiveExam={liveExam.openJoinModal}
        onOpenAvatar={controller.openAvatar}
        onOpenChangePassword={account.open}
        onOpenBadges={controller.openBadgeGallery}
        onLogout={account.logout}
        onSelectHomework={controller.setSelectedHomework}
      />
      <StudentDashboardModals
        studentSession={studentSession}
        attendance={attendance}
        account={account}
        rewards={rewards}
        liveExam={liveExam}
        selectedHomework={controller.selectedHomework}
        homeworkSubmission={controller.homeworkSubmission}
        isAvatarOpen={controller.isAvatarOpen}
        isBadgeGalleryOpen={controller.isBadgeGalleryOpen}
        onCloseHomework={() => controller.setSelectedHomework(null)}
        onCloseAvatar={controller.closeAvatar}
        onCloseBadgeGallery={controller.closeBadgeGallery}
      />
      <StudentFloatingSidebar />
    </div>
  );
};

export default StudentDashboardUI;
