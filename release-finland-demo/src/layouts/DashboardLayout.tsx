import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  FileText,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { notifications as notificationsApi } from '../lib/api';
import type { Notification } from '../types';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = () => {
      // DEMO MODE: Build notifications from localStorage for customer
      const token = localStorage.getItem('token');
      if (token?.startsWith('demo-token-')) {
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
        const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
        const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
        const readNotifications = JSON.parse(localStorage.getItem('demo-customer-notifications-read') || '[]');
        
        // Get user email to filter
        const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
        const userEmail = authData.state?.user?.email?.toLowerCase();
        
        // Filter apps for this user
        const userApps = storedApps.filter((app: any) => 
          app.contact_email?.toLowerCase() === userEmail
        );
        const userAppIds = userApps.map((a: any) => String(a.id));
        
        const demoNotifications: Notification[] = [];
        
        // New offers for user's applications
        storedOffers
          .filter((offer: any) => 
            userAppIds.includes(String(offer.application_id)) && 
            (offer.status === 'SENT' || offer.status === 'APPROVED')
          )
          .forEach((offer: any) => {
            const notifId = `offer-${offer.id}`;
            demoNotifications.push({
              id: offer.id,
              title: 'Uusi tarjous!',
              message: `Rahoittaja on lähettänyt sinulle tarjouksen`,
              is_read: readNotifications.includes(notifId),
              action_url: `/dashboard/applications/${offer.application_id}`,
              created_at: offer.created_at,
              notification_type: 'OFFER_NEW'
            });
          });
        
        // Contracts sent
        storedContracts
          .filter((contract: any) => 
            userAppIds.includes(String(contract.application_id)) && 
            contract.status === 'SENT'
          )
          .forEach((contract: any) => {
            const notifId = `contract-${contract.id}`;
            demoNotifications.push({
              id: 1000 + contract.id,
              title: 'Sopimus allekirjoitettavana!',
              message: `Rahoittaja on lähettänyt sopimuksen allekirjoitettavaksi`,
              is_read: readNotifications.includes(notifId),
              action_url: `/dashboard/applications/${contract.application_id}`,
              created_at: contract.sent_at || contract.created_at,
              notification_type: 'CONTRACT_SENT'
            });
          });
        
        // Info requests from financier
        storedInfoRequests
          .filter((ir: any) => 
            userAppIds.includes(String(ir.application_id)) && 
            ir.sender === 'financier' && 
            ir.status === 'PENDING'
          )
          .forEach((ir: any) => {
            const notifId = `ir-${ir.id}`;
            demoNotifications.push({
              id: 2000 + ir.id,
              title: 'Lisätietopyyntö',
              message: `Rahoittaja pyytää lisätietoja hakemukseesi`,
              is_read: readNotifications.includes(notifId),
              action_url: `/dashboard/applications/${ir.application_id}`,
              created_at: ir.created_at,
              notification_type: 'INFO_REQUEST'
            });
          });
        
        // Sort by date (newest first)
        demoNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setNotificationsList(demoNotifications.slice(0, 10));
        setUnreadCount(demoNotifications.filter(n => !n.is_read).length);
        return;
      }
      
      // Real API mode
      const fetchFromApi = async () => {
        try {
          const [countRes, listRes] = await Promise.all([
            notificationsApi.getUnreadCount(),
            notificationsApi.list()
          ]);
          setUnreadCount(countRes.data.count);
          setNotificationsList(listRes.data.slice(0, 10));
        } catch (error) {
          console.error('Failed to fetch notifications');
        }
      };
      fetchFromApi();
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000); // Check more frequently in demo
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      const notification = notificationsList.find(n => n.id === id);
      let notifId = '';
      if (notification?.notification_type === 'OFFER_NEW') {
        notifId = `offer-${id}`;
      } else if (notification?.notification_type === 'CONTRACT_SENT') {
        notifId = `contract-${id - 1000}`;
      } else if (notification?.notification_type === 'INFO_REQUEST') {
        notifId = `ir-${id - 2000}`;
      }
      
      const readNotifications = JSON.parse(localStorage.getItem('demo-customer-notifications-read') || '[]');
      if (!readNotifications.includes(notifId)) {
        readNotifications.push(notifId);
        localStorage.setItem('demo-customer-notifications-read', JSON.stringify(readNotifications));
      }
      
      setNotificationsList(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    
    try {
      await notificationsApi.markAsRead(id);
      setNotificationsList(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      const allNotifIds = notificationsList.map(n => {
        if (n.notification_type === 'OFFER_NEW') return `offer-${n.id}`;
        if (n.notification_type === 'CONTRACT_SENT') return `contract-${n.id - 1000}`;
        if (n.notification_type === 'INFO_REQUEST') return `ir-${n.id - 2000}`;
        return `notif-${n.id}`;
      });
      localStorage.setItem('demo-customer-notifications-read', JSON.stringify(allNotifIds));
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      return;
    }
    
    try {
      await notificationsApi.markAllAsRead();
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Yhteenveto' },
    { path: '/dashboard/applications', icon: FileText, label: 'Hakemukset' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-midnight-950 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Customer Portal */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <span className="text-white font-display font-bold text-lg">Oma Portaali</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3 px-4 py-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.first_name?.[0] || user?.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user?.first_name || user?.email}
                </p>
                <p className="text-slate-400 text-sm truncate">Asiakas</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-semibold text-midnight-900">Ilmoitukset</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Merkitse kaikki luetuksi
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsList.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p>Ei ilmoituksia</p>
                        </div>
                      ) : (
                        notificationsList.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                              !notification.is_read ? 'bg-orange-50' : ''
                            }`}
                            onClick={() => {
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id);
                              }
                              if (notification.action_url) {
                                navigate(notification.action_url);
                                setNotificationsOpen(false);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-midnight-900' : 'text-slate-700'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notification.created_at).toLocaleString('fi-FI')}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.first_name?.[0] || user?.email[0].toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profiili</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-slate-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Kirjaudu ulos</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

