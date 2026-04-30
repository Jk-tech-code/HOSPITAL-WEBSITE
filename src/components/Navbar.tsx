import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { Activity, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-medical-primary rounded-lg group-hover:rotate-12 transition-transform">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-slate-900">HealthGuard</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors">Home</Link>
            <a href="#departments" className="text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors">Departments</a>
            <a href="#doctors" className="text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors">Doctors</a>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to={profile?.role === 'admin' ? '/admin' : '/dashboard'} 
                  className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 py-4 px-4 space-y-4">
          <Link to="/" className="block text-base font-medium text-slate-600">Home</Link>
          <a href="#departments" className="block text-base font-medium text-slate-600">Departments</a>
          <a href="#doctors" className="block text-base font-medium text-slate-600">Doctors</a>
          {user ? (
             <Link to="/dashboard" className="block text-base font-medium text-slate-600">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="block text-base font-medium text-slate-600">Login</Link>
              <Link to="/signup" className="block btn-primary text-center">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
