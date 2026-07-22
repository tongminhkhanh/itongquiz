import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ParentPortalFallback, ParentPortalLayout } from './layout/ParentPortalLayout';
import ParentActivatePage from './pages/ParentActivatePage';
import ParentLoginPage from './pages/ParentLoginPage';
import { useParentPortalStore } from './useParentPortalStore';

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const session = useParentPortalStore(state => state.session);
  return session ? <>{children}</> : <Navigate to="/login" replace />;
};

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <ParentPortalLayout>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-500">{description}</p>
    </section>
  </ParentPortalLayout>
);

export default function ParentPortalApp() {
  const restoreSession = useParentPortalStore(state => state.restoreSession);
  const session = useParentPortalStore(state => state.session);
  const [restoreComplete, setRestoreComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void restoreSession().finally(() => {
      if (active) setRestoreComplete(true);
    });
    return () => { active = false; };
  }, [restoreSession]);

  if (!restoreComplete) return <ParentPortalFallback />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
      <Route path="/activate" element={<ParentActivatePage />} />
      <Route path="/login" element={<ParentLoginPage />} />
      <Route path="/dashboard" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Tổng quan tuần" description="Theo dõi kết quả và tiến bộ học tập của con." />
        </ProtectedRoute>
      )} />
      <Route path="/notifications" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Thông báo" description="Các thông tin mới từ giáo viên và hệ thống." />
        </ProtectedRoute>
      )} />
      <Route path="/results" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Kết quả học tập" description="Lịch sử kết quả trong năm học." />
        </ProtectedRoute>
      )} />
      <Route path="/results/:resultId" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Chi tiết kết quả" description="Điểm số và nhận xét của giáo viên." />
        </ProtectedRoute>
      )} />
      <Route path="/assignments" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Bài tập" description="Bài tập đang chờ và lịch sử đã hoàn thành." />
        </ProtectedRoute>
      )} />
      <Route path="/certificates" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Chứng nhận" description="Giấy khen và thành tích của con." />
        </ProtectedRoute>
      )} />
      <Route path="/profile" element={(
        <ProtectedRoute>
          <PlaceholderPage title="Thông tin học sinh" description="Thông tin liên kết phụ huynh hiện tại." />
        </ProtectedRoute>
      )} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
