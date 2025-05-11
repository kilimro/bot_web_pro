import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import BotsPage from './pages/BotsPage';
import BotDetailPage from './pages/BotDetailPage';
import KeywordRepliesPage from './pages/KeywordRepliesPage';
import PluginsPage from './pages/PluginsPage';
import AiModelPage from './pages/AiModelPage';
import FriendsPage from './pages/FriendsPage';
import MomentsPage from './pages/MomentsPage';
import AuthKeysPage from './pages/AuthKeysPage';
import MonitoringPage from './pages/MonitoringPage';
import SettingsPage from './pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'bots', element: <BotsPage /> },
      { path: 'bots/:id', element: <BotDetailPage /> },
      { path: 'bots/keyword-replies', element: <KeywordRepliesPage /> },
      { path: 'bots/plugins', element: <PluginsPage /> },
      { path: 'bots/ai-model', element: <AiModelPage /> },
      { path: 'bots/friends', element: <FriendsPage /> },
      { path: 'bots/moments', element: <MomentsPage /> },
      { path: 'auth-keys', element: <AuthKeysPage /> },
      { path: 'monitoring', element: <MonitoringPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;