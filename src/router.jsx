import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { GuestRoute, ProtectedRoute } from './components/routing/RouteGuards';
import CatalogPage from './pages/CatalogPage';
import DetailsPage from './pages/DetailsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import OfflinePage from './pages/OfflinePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CollectionDetailsPage from './pages/profile/CollectionDetailsPage';
import CollectionsPage from './pages/profile/CollectionsPage';
import HistoryPage from './pages/profile/HistoryPage';
import LibraryPage from './pages/profile/LibraryPage';
import ProfileLayout from './pages/profile/ProfileLayout';
import ProfileOverview from './pages/profile/ProfileOverview';
import ReviewsPage from './pages/profile/ReviewsPage';
import SettingsPage from './pages/profile/SettingsPage';
import StatsPage from './pages/profile/StatsPage';

// Vite кладёт сюда base из vite.config.js ('/' локально, '/<repo>/' на GitHub Pages)
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/movie', element: <CatalogPage key="movie" mediaType="movie" /> },
      { path: '/tv', element: <CatalogPage key="tv" mediaType="tv" /> },
      { path: '/movie/:id', element: <DetailsPage mediaType="movie" /> },
      { path: '/tv/:id', element: <DetailsPage mediaType="tv" /> },
      { path: '/offline', element: <OfflinePage /> },

      // только для гостей
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },

      // только для вошедших
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/profile',
            element: <ProfileLayout />,
            children: [
              { index: true, element: <ProfileOverview /> },
              { path: 'library', element: <LibraryPage /> },
              { path: 'reviews', element: <ReviewsPage /> },
              { path: 'collections', element: <CollectionsPage /> },
              { path: 'collections/:id', element: <CollectionDetailsPage /> },
              { path: 'stats', element: <StatsPage /> },
              { path: 'history', element: <HistoryPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename });
