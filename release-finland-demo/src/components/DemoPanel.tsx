import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface DemoUser {
  email: string;
  role: 'CUSTOMER' | 'FINANCIER';
  label: string;
  firstName: string;
  lastName: string;
  companyName: string;
  icon: string;
  color: string;
}

// Release Finland Oy Demo Users - NO ADMIN
const demoUsers: DemoUser[] = [
  {
    email: 'rahoitus@releasefinland.fi',
    role: 'FINANCIER',
    label: 'Release Finland Oy',
    firstName: 'Release',
    lastName: 'Finland',
    companyName: 'Release Finland Oy',
    icon: '🏦',
    color: 'from-emerald-600 to-teal-700',
  },
  {
    email: 'rape@raksarape.fi',
    role: 'CUSTOMER',
    label: 'Raksa Rape Oy',
    firstName: 'Rape',
    lastName: 'Rakentaja',
    companyName: 'Raksa Rape Oy',
    icon: '🏗️',
    color: 'from-orange-500 to-amber-600',
  },
];

export function DemoPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const { user, logout, setDemoUser } = useAuthStore();

  // DEMO MODE: Direct login with localStorage sync
  const handleLogin = (demoUser: DemoUser) => {
    const fakeUser = {
      id: demoUser.role === 'FINANCIER' ? 1 : 2,
      email: demoUser.email,
      role: demoUser.role,
      first_name: demoUser.firstName,
      last_name: demoUser.lastName,
      company_name: demoUser.companyName,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const fakeToken = `demo-token-${demoUser.role.toLowerCase()}`;
    
    // Set localStorage FIRST - synchronously before any navigation
    localStorage.setItem('token', fakeToken);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token: fakeToken, user: fakeUser, isAuthenticated: true },
      version: 0
    }));
    
    // Also update Zustand (for components that might read from it)
    setDemoUser(fakeUser as any, fakeToken);
    
    // Navigate based on role
    const urls: Record<string, string> = {
      FINANCIER: '/financier', 
      CUSTOMER: '/dashboard',
    };
    
    // Small delay to ensure localStorage is written before navigation
    setTimeout(() => {
      window.location.href = urls[demoUser.role];
    }, 50);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Avaa demo-paneeli"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isMinimized ? 'w-auto' : 'w-80'}`}>
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">🏦</span>
            <span className="font-bold">Release Finland Demo</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white/80 hover:text-white p-1 rounded transition-colors"
              title={isMinimized ? 'Laajenna' : 'Pienennä'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMinimized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded transition-colors"
              title="Sulje"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4">
            {/* Current user */}
            {user && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Kirjautuneena:</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'FINANCIER' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {user.role === 'FINANCIER' ? 'Rahoittaja' : 'Asiakas'}
                  </span>
                </div>
              </div>
            )}

            {/* Demo users */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">Vaihda käyttäjää:</div>
              {demoUsers.map((demoUser) => (
                <button
                  key={demoUser.email}
                  onClick={() => handleLogin(demoUser)}
                  disabled={false}
                  className={`w-full p-3 rounded-xl bg-gradient-to-r ${demoUser.color} text-white font-medium 
                    hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    flex items-center gap-3`}
                >
                  <span className="text-2xl">{demoUser.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-semibold">{demoUser.label}</div>
                    <div className="text-xs opacity-80">{demoUser.email}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Logout button */}
            {user && (
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/';
                }}
                className="w-full mt-4 p-2 rounded-xl border-2 border-gray-200 text-gray-600 font-medium
                  hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Kirjaudu ulos
              </button>
            )}

            {/* Clear data button */}
            <button
              onClick={() => {
                // Clear all demo data from localStorage
                localStorage.removeItem('demo-applications');
                localStorage.removeItem('demo-offers');
                localStorage.removeItem('demo-contracts');
                localStorage.removeItem('demo-assignments');
                alert('Demo-data tyhjennetty! Hakemukset, tarjoukset ja sopimukset poistettu.');
                window.location.reload();
              }}
              className="w-full mt-2 p-2 rounded-xl border-2 border-red-200 text-red-600 font-medium
                hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Tyhjennä demo-data
            </button>

            {/* Info */}
            <div className="mt-4 text-xs text-gray-400 text-center">
              Release Finland Oy - Demo-ympäristö
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

