import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import CasePage from './pages/CasePage';
import SignInPage from './pages/SignInPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import AddCasePage from './pages/AddCasePage';
import PageFullCase from './pages/PageFullCase';
import PageFullProject from './pages/PageFullProject';
import ProfileView from './pages/ProfileView';
import PageFullProcessedCase from './pages/PageFullProcessedCase';

function ProtectedRoute({ children }) {
  const userId = localStorage.getItem('currentUserId');
  console.log('🔍 ProtectedRoute check - currentUserId:', userId);
  if (!userId) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Открытые маршруты */}
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<PageFullProject />} />
      <Route path="/cases" element={<CasePage />} />
      <Route path="/cases/:id" element={<PageFullCase />} />
      <Route path="/processed-cases/:id" element={<PageFullProcessedCase />} />

      {/* Страницы для входа и регистрации */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/add-case" element={<AddCasePage />} />

      {/* ВАЖНО: СНАЧАЛА МАРШРУТ С ПАРАМЕТРОМ, ПОТОМ БЕЗ */}
      <Route path="/profile/:userId" element={<ProfileView />} />
      
      {/* ЗАЩИЩЕННЫЙ МАРШРУТ - СОБСТВЕННЫЙ ПРОФИЛЬ */}
      <Route
        path="/my-profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* РЕДИРЕКТ С /profile НА /my-profile ТОЛЬКО ЕСЛИ НЕТ userId */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Navigate to="/my-profile" replace />
          </ProtectedRoute>
        } 
      />

      {/* Все остальные пути редиректим на главную */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}