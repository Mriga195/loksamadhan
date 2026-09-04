import { createBrowserRouter } from 'react-router-dom';
import App from './App';

import Feed from './pages/Feed';
import Report from './pages/Report';
import IssueDetail from './pages/IssueDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import OfficerDashboard from './pages/OfficerDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Feed /> },
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
  { path: '/dashboard', element: <OfficerDashboard /> },
]);

export default router;
