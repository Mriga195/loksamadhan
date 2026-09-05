import { createBrowserRouter } from 'react-router-dom';
import App from './App';

import Home from './pages/Home';
import Feed from './pages/Feed';
import Departments from './pages/Departments';
import Report from './pages/Report';
import IssueDetail from './pages/IssueDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import OfficerDashboard from './pages/OfficerDashboard';

import ErrorBoundary from './components/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: 'feed', element: <Feed /> },
      { path: 'departments', element: <Departments /> },
      { path: 'report', element: <Report /> },
      { path: 'issues/:id', element: <IssueDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // The dashboard is deliberately NOT a child of <App />: it renders its own shell (top bar +
  // sidebar), and nesting it would stack that under the public site nav.
  { path: '/dashboard', element: <OfficerDashboard />, errorElement: <ErrorBoundary /> },
]);

export default router;
