import { createBrowserRouter } from 'react-router-dom';
import App from './App';

// ── Placeholder pages — each lane fills their own ──
function Feed() { return <h2 className="p-8">Feed — Lane 3 implements</h2>; }
import Report from './pages/Report';
function IssueDetail() { return <h2 className="p-8">Issue Detail — Lane 3 implements</h2>; }
function Login() { return <h2 className="p-8">Login — Lane 3 implements</h2>; }
function Register() { return <h2 className="p-8">Register — Lane 3 implements</h2>; }
function OfficerDashboard() { return <h2 className="p-8">Officer Dashboard — Lane 2 implements</h2>; }

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
      { path: 'dashboard', element: <OfficerDashboard /> },
    ],
  },
]);

export default router;
