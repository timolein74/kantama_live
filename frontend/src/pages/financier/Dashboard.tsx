import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Euro,
  MessageSquare,
  FileCheck,
  PartyPopper,
  Sparkles,
  FileSignature,
  Bell
} from 'lucide-react';
import { applications, notifications as notificationsApi, offers } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import { isSupabaseConfigured } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Notification } from '../../types';

// Type for application from Supabase
interface DbApplication {
  id: string;
  reference_number?: string;
  company_name: string;
  business_id: string;
  contact_email: string;
  contact_phone: string | null;
  equipment_description: string | null;
  equipment_price: number;
  application_type: 'LEASING' | 'SALE_LEASEBACK';
  status: string;
  requested_term_months: number;
  created_at: string;
  updated_at: string;
}

export default function FinancierDashboard() {
  const { user } = useAuthStore();
  const [appList, setAppList] = useState<DbApplication[]>([]);
  const [acceptedOfferApps, setAcceptedOfferApps] = useState<any[]>([]);
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch applications: only ones this financier has made offers on, or new SUBMITTED ones
        const { data: apps, error: appsError } = await applications.list(user?.id, 'FINANCIER');
        
        if (appsError) {
          console.error('Error fetching applications:', appsError);
          toast.error('Virhe hakemusten latauksessa');
        } else {
          // All returned apps are already filtered for this financier
          setAppList(apps || []);
          
          // Find applications with accepted offers
          const acceptedApps = (apps || []).filter((app: DbApplication) => app.status === 'OFFER_ACCEPTED');
          setAcceptedOfferApps(acceptedApps.map((app: DbApplication) => ({
            customer_name: app.company_name,
            application_id: app.id
          })));
        }

        // Fetch notifications
        if (user?.id) {
          const { data: notifications, error: notifError } = await notificationsApi.list(user.id);
          if (!notifError && notifications) {
            setNotificationList(notifications);
          }
        }
      } catch (error) {
        console.error('Error fetching financier data:', error);
        toast.error('Virhe tietojen latauksessa');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Calculate stats
  const newApplications = appList.filter(a => a.status === 'SUBMITTED_TO_FINANCIER').length;
  const infoRequested = appList.filter(a => a.status === 'INFO_REQUESTED').length;
  const offersSent = appList.filter(a => ['OFFER_RECEIVED', 'OFFER_SENT'].includes(a.status)).length;
  const offersAccepted = appList.filter(a => a.status === 'OFFER_ACCEPTED').length;
  const contractsSent = appList.filter(a => a.status === 'CONTRACT_SENT').length;
  const completed = appList.filter(a => ['SIGNED', 'CLOSED'].includes(a.status)).length;
  const totalValue = appList.reduce((sum, app) => sum + (app.equipment_price || 0), 0);

  const recentApplications = appList.slice(0, 5);

  // Count unread notifications (customer responses)
  const unreadNotifications = notificationList.filter(n => !n.is_read).length;
  
  // Pending actions
  const pendingActions = [
    { count: newApplications, label: 'Uusi hakemus', status: 'SUBMITTED_TO_FINANCIER', color: 'bg-orange-500' },
    { count: infoRequested, label: 'Vastauksia odottaa', status: 'INFO_REQUESTED', color: 'bg-yellow-500' },
    { count: offersAccepted, label: 'Luottopäätös tehtävä', status: 'OFFER_ACCEPTED', color: 'bg-purple-500' },
  ].filter(a => a.count > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-midnight-900">
          Tervetuloa, {user?.first_name || 'Rahoittaja'}!
        </h1>
        <p className="text-slate-600 mt-1">
          Käsittele hakemuksia ja hallitse tarjouksia.
        </p>
      </div>

      {/* CUSTOMER RESPONDED TO INFO REQUEST - Show if unread notifications */}
      {unreadNotifications > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Bell className="w-5 h-5 mr-2 animate-bounce" />
                  Lisätietoja saatavilla!
                </h2>
                <p className="text-blue-100 mt-1">
                  {unreadNotifications === 1 
                    ? 'Asiakas on toimittanut pyydetyt lisätiedot.'
                    : `${unreadNotifications} asiakasta on toimittanut lisätietoja.`}
                </p>
              </div>
            </div>
          </div>
          {/* Show each notification with customer name - clickable to go to messages */}
          <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
            {notificationList.filter(n => !n.is_read).slice(0, 5).map((notif) => (
              <Link
                key={notif.id}
                to={notif.action_url || '/financier/applications'}
                onClick={async (e) => {
                  // Mark notification as read and remove from list
                  try {
                    await notificationsApi.markAsRead(String(notif.id));
                    setNotificationList(prev => prev.map(n => 
                      n.id === notif.id ? { ...n, is_read: true } : n
                    ));
                  } catch (err) {
                    console.error('Error marking notification as read:', err);
                  }
                }}
                className="block bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg block">{notif.message?.split(' on ')[0] || 'Asiakas'}</span>
                      <span className="text-sm text-blue-200">Lisätiedot toimitettu</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold group-hover:bg-blue-50 transition-colors">
                    <span>Avaa lisätiedot</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* CUSTOMER ACCEPTED OFFER - Prominent notification with customer names */}
      {offersAccepted > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Tarjous hyväksytty!
                </h2>
                {acceptedOfferApps.length > 0 ? (
                  <div className="mt-2">
                    {acceptedOfferApps.map((offer, idx) => (
                      <p key={idx} className="text-green-100 font-medium">
                        • <strong>{offer.customer_name}</strong> on hyväksynyt tarjouksen
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-100 mt-1">
                    Asiakas on hyväksynyt tarjouksen. Tee luottopäätös.
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/financier/applications?status=OFFER_ACCEPTED"
              className="bg-white text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors flex items-center"
            >
              <FileSignature className="w-5 h-5 mr-2" />
              Tee luottopäätös
            </Link>
          </div>
        </motion.div>
      )}

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200"
        >
          <h3 className="font-semibold text-emerald-900 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Odottavat toimenpiteet
          </h3>
          <div className="flex flex-wrap gap-3">
            {pendingActions.map((action) => (
              <Link
                key={action.status}
                to={`/financier/applications?status=${action.status}`}
                className="bg-white rounded-lg px-4 py-2 border border-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <span className={`inline-block w-6 h-6 ${action.color} text-white rounded-full text-center text-sm font-medium mr-2`}>
                  {action.count}
                </span>
                <span className="text-emerald-900">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Uudet hakemukset', value: newApplications, icon: FileText, color: 'bg-orange-500' },
          { label: 'Tarjouksia lähetetty', value: offersSent, icon: Euro, color: 'bg-blue-500' },
          { label: 'Sopimukset', value: contractsSent + completed, icon: FileCheck, color: 'bg-purple-500' },
          { label: 'Kokonaisarvo', value: formatCurrency(totalValue), icon: TrendingUp, color: 'bg-green-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-display font-bold text-midnight-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-midnight-900">Hakemukset</h2>
            <Link
              to="/financier/applications"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center"
            >
              Näytä kaikki
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ei hakemuksia käsiteltävänä</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  to={`/financier/applications/${app.id}`}
                  className="block p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        app.application_type === 'LEASING' ? 'bg-blue-100' : 'bg-emerald-100'
                      }`}>
                        {app.application_type === 'LEASING' ? (
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <RefreshCw className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-midnight-900">{app.reference_number || `#${app.id.slice(0, 8)}`}</p>
                          <span className={getStatusColor(app.status as any)}>
                            {getStatusLabel(app.status as any)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{app.company_name}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-midnight-900">
                      {formatCurrency(app.equipment_price || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-midnight-900">Ilmoitukset</h2>
          </div>

          {notificationList.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ei ilmoituksia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificationList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border ${
                    notif.is_read ? 'bg-white border-slate-100' : 'bg-emerald-50 border-emerald-100'
                  }`}
                >
                  <p className="font-medium text-midnight-900">{notif.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-2">{formatDate(notif.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Status distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="font-display font-bold text-midnight-900 mb-6">Hakemusten jakautuminen</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Uudet', value: newApplications, color: 'bg-orange-100 text-orange-700' },
            { label: 'Lisätiedot', value: infoRequested, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Tarjottu', value: offersSent, color: 'bg-blue-100 text-blue-700' },
            { label: 'Hyväksytty', value: offersAccepted, color: 'bg-purple-100 text-purple-700' },
            { label: 'Sopimus', value: contractsSent, color: 'bg-indigo-100 text-indigo-700' },
            { label: 'Valmis', value: completed, color: 'bg-green-100 text-green-700' },
          ].map((status) => (
            <div key={status.label} className={`rounded-xl p-4 text-center ${status.color}`}>
              <p className="text-2xl font-bold">{status.value}</p>
              <p className="text-sm mt-1">{status.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}



