import { useState, useEffect } from 'react';
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
  Bell,
  Euro,
  Sparkles,
  Upload,
  MessageSquare
} from 'lucide-react';
import { applications, messages, notifications as notificationsApi } from '../../lib/api';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Application, Notification } from '../../types';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [appList, setAppList] = useState<Application[]>([]);
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [pendingInfoRequests, setPendingInfoRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch user's applications from Supabase (by user_id OR email)
        const { data: userApps, error } = await applications.list(user.id, user.role, user.email);
        
        if (error) {
          console.error('Error fetching applications:', error);
          toast.error('Virhe hakemusten latauksessa');
        } else {
          setAppList((userApps || []) as Application[]);
          
          // Check for applications with INFO_REQUESTED status (excluding rejected ones) and fetch their messages
          const infoRequestedApps = (userApps || []).filter((a: Application) => 
            a.status === 'INFO_REQUESTED' && !['REJECTED', 'OFFER_REJECTED'].includes(a.status)
          );
          
          if (infoRequestedApps.length > 0) {
            // Fetch pending info requests for each application
            const pendingReqs: any[] = [];
            for (const app of infoRequestedApps) {
              const { data: msgs } = await messages.listByApplication(String(app.id));
              const infoReqs = (msgs || []).filter((m: any) => m.is_info_request && !m.is_read);
              if (infoReqs.length > 0) {
                pendingReqs.push({
                  application_id: app.id,
                  application: app,
                  messages: infoReqs
                });
              }
            }
            setPendingInfoRequests(pendingReqs);
          } else {
            setPendingInfoRequests([]);
          }
          
          // Fetch unread notifications for customer
          const { data: notifs } = await notificationsApi.list(user.id);
          console.log('Customer Dashboard: Notifications loaded:', notifs?.length, 'unread:', notifs?.filter((n: any) => !n.is_read)?.length);
          if (notifs) {
            // Filter for unread message notifications
            const unreadMsgs = notifs.filter((n: any) => !n.is_read);
            setNotificationList(unreadMsgs);
          }
        }
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    // Refresh notifications every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate stats - exclude rejected applications from active counts
  const rejectedStatuses = ['REJECTED', 'OFFER_REJECTED'];
  const activeApps = appList.filter(a => !rejectedStatuses.includes(a.status));
  const totalApplications = appList.length;
  // "Käsittelyssä" = only after admin has accepted and sent to financier
  const pendingApplications = activeApps.filter(a => 
    ['SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED'].includes(a.status)
  ).length;
  // "Hakemuksia" = just submitted, waiting for admin to accept
  const newApplications = activeApps.filter(a => a.status === 'SUBMITTED').length;
  const offersAvailable = activeApps.filter(a => a.status === 'OFFER_SENT').length;
  const contractsReady = activeApps.filter(a => a.status === 'CONTRACT_SENT').length;
  const completed = appList.filter(a => ['SIGNED', 'CLOSED'].includes(a.status)).length;
  const rejectedCount = appList.filter(a => rejectedStatuses.includes(a.status)).length;

  const recentApplications = appList.slice(0, 3);

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
          Tervetuloa, {user?.company_name || user?.first_name || 'Asiakas'}!
        </h1>
        <p className="text-slate-600 mt-1">
          Seuraa rahoitushakemuksiasi ja hallitse tarjouksia.
        </p>
      </div>

      {/* OFFER AVAILABLE - Most important notification */}
      {offersAvailable > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Euro className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {offersAvailable === 1 ? 'Uusi tarjous saatavilla!' : `${offersAvailable} tarjousta saatavilla!`}
                </h2>
                <p className="text-green-100 mt-1">
                  Rahoittaja on lähettänyt sinulle tarjouksen. Tarkista se ja hyväksy sopimus.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/applications"
              className="bg-white text-green-700 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors flex items-center"
            >
              Katso tarjoukset
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* CONTRACT READY - Most important after offer */}
      {contractsReady > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Sopimus valmiina allekirjoitettavaksi!
                </h2>
                <p className="text-purple-100 mt-1">
                  Rahoitussopimuksesi on valmis. Tarkista ja allekirjoita sopimus.
                </p>
              </div>
            </div>
            <Link
              to={`/dashboard/applications/${appList.find(a => a.status === 'CONTRACT_SENT')?.id}?tab=contract`}
              className="bg-white text-purple-700 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center"
            >
              Avaa sopimus
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* NEW MESSAGES - Colorful banner for ALL unread notifications */}
      {notificationList.length > 0 && (
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
                  {notificationList.length === 1 ? 'Uusi viesti saapunut!' : `${notificationList.length} uutta viestiä!`}
                </h2>
                <p className="text-blue-100 mt-1">
                  {notificationList[0]?.message || 'Olet saanut uuden viestin hakemukseesi liittyen.'}
                </p>
              </div>
            </div>
            <Link
              to={notificationList[0]?.action_url || '/dashboard/applications'}
              className="bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center"
            >
              Lue viesti
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          {/* Show all unread notifications */}
          {notificationList.length > 1 && (
            <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
              {notificationList.slice(0, 5).map((notif) => (
                <Link
                  key={notif.id}
                  to={notif.action_url || '/dashboard/applications'}
                  className="block bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors"
                >
                  <p className="font-medium">{notif.title}</p>
                  <p className="text-sm text-blue-200">{notif.message}</p>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* PENDING INFO REQUEST - Financier needs documents */}
      {pendingInfoRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Rahoittaja tarvitsee lisätietoja
                </h2>
                <p className="text-amber-100 mt-1">
                  Toimita pyydetyt liitteet luottopäätöstä varten.
                </p>
              </div>
            </div>
            <Link
              to={`/dashboard/applications/${pendingInfoRequests[0]?.application_id}`}
              className="bg-white text-amber-700 px-6 py-3 rounded-xl font-semibold hover:bg-amber-50 transition-colors flex items-center"
            >
              Vastaa pyyntöön
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* SUBMITTED - Blue: waiting for admin approval */}
      {appList.filter(a => a.status === 'SUBMITTED').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-start space-x-3"
        >
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-blue-800 font-bold">Hakemuksesi on vastaanotettu!</p>
            <p className="text-blue-700 text-sm mt-1">
              {appList.filter(a => a.status === 'SUBMITTED').length} hakemusta odottaa hyväksyntää. 
              Saat ilmoituksen kun hakemus siirtyy käsittelyyn.
            </p>
          </div>
          <Link
            to="/dashboard/applications"
            className="text-blue-700 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            Näytä
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </motion.div>
      )}

      {/* IN PROCESSING - Green: admin approved, with financier */}
      {appList.filter(a => a.status === 'SUBMITTED_TO_FINANCIER').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-start space-x-3"
        >
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-green-800 font-bold">Hakemuksesi on käsittelyssä!</p>
            <p className="text-green-700 text-sm mt-1">
              {appList.filter(a => a.status === 'SUBMITTED_TO_FINANCIER').length} hakemusta on rahoittajan käsittelyssä. 
              Saat ilmoituksen kun tarjous on valmis.
            </p>
          </div>
          <Link
            to="/dashboard/applications"
            className="text-green-700 hover:text-green-800 font-medium text-sm flex items-center"
          >
            Näytä
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </motion.div>
      )}

      {/* Verification warning */}
      {user && !user.is_verified && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Vahvista sähköpostiosoitteesi</p>
            <p className="text-yellow-700 text-sm mt-1">
              Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä, jotta voit seurata hakemuksiasi.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Yhteensä', value: totalApplications, icon: FileText, color: 'bg-slate-500' },
          { label: 'Lähetetty', value: newApplications, icon: Clock, color: 'bg-blue-500' },
          { label: 'Käsittelyssä', value: pendingApplications, icon: RefreshCw, color: 'bg-yellow-500' },
          { label: 'Tarjouksia', value: offersAvailable, icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Valmis', value: completed, icon: CheckCircle, color: 'bg-purple-500' },
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
            <h2 className="font-display font-bold text-midnight-900">Viimeisimmät hakemukset</h2>
            <Link
              to="/dashboard/applications"
              className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
            >
              Näytä kaikki
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ei hakemuksia vielä</p>
              <Link to="/" className="btn-primary mt-4 inline-flex">
                Hae rahoitusta
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApplications.map((app) => {
                const isSubmitted = app.status === 'SUBMITTED';
                const isProcessing = app.status === 'SUBMITTED_TO_FINANCIER';
                const hasOffer = app.status === 'OFFER_SENT';
                return (
                  <Link
                    key={app.id}
                    to={`/dashboard/applications/${app.id}`}
                    className={`block p-4 rounded-xl transition-colors ${
                      hasOffer 
                        ? 'bg-green-50 border-2 border-green-300 hover:bg-green-100' 
                        : isProcessing 
                          ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                          : isSubmitted
                            ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          hasOffer ? 'bg-green-500' :
                          app.application_type === 'LEASING' ? 'bg-blue-100' : 'bg-emerald-100'
                        }`}>
                          {hasOffer ? (
                            <Euro className="w-5 h-5 text-white" />
                          ) : app.application_type === 'LEASING' ? (
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${hasOffer ? 'text-green-800' : 'text-midnight-900'}`}>
                            {app.reference_number || app.company_name}
                            {hasOffer && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">TARJOUS!</span>}
                          </p>
                          <p className="text-sm text-slate-500">{formatCurrency(app.equipment_price)}</p>
                        </div>
                      </div>
                      <span className={hasOffer ? 'text-green-700 font-bold' : getStatusColor(app.status)}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent notifications */}
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
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ei ilmoituksia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificationList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border ${
                    notif.is_read ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100'
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

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-gradient-to-r from-green-600 to-green-700 text-white"
      >
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-display font-bold">Tarvitsetko lisää rahoitusta?</h3>
            <p className="text-green-100 mt-1">
              Hae uutta rahoitusta - saat tarjouksen nopeasti.
            </p>
          </div>
          <Link to="/" className="btn bg-white text-green-700 hover:bg-green-50">
            Hae rahoitusta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}


