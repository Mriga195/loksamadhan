import { Outlet } from 'react-router-dom';
import Footer from './components/Footer';
import Nav from './components/Nav';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Nav />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
