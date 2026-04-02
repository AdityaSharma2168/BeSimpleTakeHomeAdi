'use client';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { SubmissionsPage } from '@/views/SubmissionsPage';
import { QueueDetailPage } from '@/views/QueueDetailPage';
import { JudgesPage } from '@/views/JudgesPage';
import { ResultsPage } from '@/views/ResultsPage';
import { SettingsPage } from '@/views/SettingsPage';

export function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR - BrowserRouter requires document
  if (!mounted) {
    return null;
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/submissions" replace />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/submissions/:queueId" element={<QueueDetailPage />} />
          <Route path="/judges" element={<JudgesPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
