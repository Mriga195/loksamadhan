import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lane 3 will add Navbar here */}
      <Outlet />
    </div>
  );
}

