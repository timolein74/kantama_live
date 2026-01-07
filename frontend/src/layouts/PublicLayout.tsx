import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '../components/Logo';
import ChatBot from '../components/ChatBot';

// Custom event for changing form type
export const setFormType = (type: 'leasing' | 'slb') => {
  window.dispatchEvent(new CustomEvent('setFormType', { detail: type }));
};

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'FINANCIER': return '/financier';
      default: return '/dashboard';
    }
  };

  // Handle navigation clicks
  const handleNavClick = (type: 'leasing' | 'slb' | 'how-it-works') => {
    setMobileMenuOpen(false);
    
    // If not on landing page, navigate there first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation then scroll
      setTimeout(() => {
        if (type === 'how-it-works') {
          document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          setFormType(type);
          document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }
    
    if (type === 'how-it-works') {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setFormType(type);
      document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo to="/" size="md" variant="light" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => handleNavClick('leasing')} 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Leasing
              </button>
              <button 
                onClick={() => handleNavClick('slb')} 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Takaisinvuokraus
              </button>
              <button 
                onClick={() => handleNavClick('how-it-works')} 
                className="text-slate-300 hover:text-white transition-colors"
              >
                N�in se toimii
              </button>
            </nav>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate(getDashboardLink())}
                  className="btn-primary"
                >
                  Oma portaali
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Kirjaudu</span>
                  </Link>
                  <Link to="/register" className="btn-primary">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Rekister�idy
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-white/10">
            <div className="px-4 py-4 space-y-4">
              <button 
                onClick={() => handleNavClick('leasing')} 
                className="block text-slate-300 hover:text-white w-full text-left"
              >
                Leasing
              </button>
              <button 
                onClick={() => handleNavClick('slb')} 
                className="block text-slate-300 hover:text-white w-full text-left"
              >
                Takaisinvuokraus
              </button>
              <button 
                onClick={() => handleNavClick('how-it-works')} 
                className="block text-slate-300 hover:text-white w-full text-left"
              >
                N�in se toimii
              </button>
              <div className="pt-4 border-t border-white/10 space-y-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => navigate(getDashboardLink())}
                    className="btn-primary w-full"
                  >
                    Oma portaali
                  </button>
                ) : (
                  <>
                    <Link to="/login" className="btn-secondary w-full">
                      Kirjaudu
                    </Link>
                    <Link to="/register" className="btn-primary w-full">
                      Rekister�idy
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo to="/" size="sm" variant="light" />
              </div>
              <p className="text-sm">
                Yritysrahoitusta helposti ja nopeasti. Leasing ja takaisinvuokraus yrityksille.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Palvelut</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => handleNavClick('leasing')} className="hover:text-white transition-colors">Leasing</button></li>
                <li><button onClick={() => handleNavClick('slb')} className="hover:text-white transition-colors">Takaisinvuokraus</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Tietoa</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Tietosuoja</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">K�ytt�ehdot</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm">
            <p>� 2025 Juuri Rahoitus. Kaikki oikeudet pid�tet��n.</p>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <ChatBot />
    </div>
  );
}

