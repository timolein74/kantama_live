import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { applications, notifications as notificationsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Application, Notification } from '../../types';

// DEMO DATA - Start empty, applications created via form
const demoCustomerApplications: Application[] = [];

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  // DEMO MODE: Combine static + localStorage data filtered by user email
  const [appList, setAppList] = useState<Application[]>([]);
  const [notificationList] = useState<Notification[]>([]);
  const [pendingInfoRequests, setPendingInfoRequests] = useState<any[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
    const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
    const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
    
    // Filter by user email if available
    const userEmail = user?.email?.toLowerCase();
    const userApps = storedApps.filter((app: any) => 
      app.contact_email?.toLowerCase() === userEmail
    );
    
    // For Raksa Rape Oy demo user show demo apps + their own
    let allApps: Application[];
    if (userEmail === 'rape@raksarape.fi') {
      allApps = [...demoCustomerApplications, ...userApps];
    } else {
      allApps = [...userApps]; // Other users only see their own apps
    }
    
    // Load contracts
    const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
    
    // Update application statuses based on offers and contracts
    allApps = allApps.map(app => {
      // Check for contracts first (higher priority)
      const appContracts = storedContracts.filter((c: any) => 
        String(c.application_id) === String(app.id)
      );
      if (appContracts.length > 0) {
        const latestContract = appContracts[appContracts.length - 1];
        if (latestContract.status === 'SENT') {
          return { ...app, status: 'CONTRACT_SENT' };
        } else if (latestContract.status === 'SIGNED') {
          return { ...app, status: 'SIGNED' };
        }
      }
      
      // Check offers
      const appOffers = storedOffers.filter((o: any) => 
        String(o.application_id) === String(app.id) ||
        o.application?.id === app.id
      );
      if (appOffers.length > 0) {
        const latestOffer = appOffers[appOffers.length - 1];
        // Customer only sees offer after admin has approved (status APPROVED or SENT)
        if (latestOffer.status === 'APPROVED' || latestOffer.status === 'SENT') {
          return { ...app, status: 'OFFER_SENT' };
        } else if (latestOffer.status === 'ACCEPTED') {
          return { ...app, status: 'OFFER_ACCEPTED' };
        }
        // PENDING_ADMIN status means admin hasn't approved yet - customer doesn't see it
      }
      return app;
    });
    
    setAppList(allApps);
    
    // Filter info requests for user's applications
    const userAppIds = allApps.map(a => String(a.id));
    const userInfoRequests = storedInfoRequests.filter((ir: any) => 
      userAppIds.includes(String(ir.application_id)) && 
      ir.status === 'PENDING' &&
      ir.sender === 'financier' // Only show requests from financier
    );
    setPendingInfoRequests(userInfoRequests);
  }, [user]);

  // Calculate stats
  const totalApplications = appList.length;
  const pendingApplications = appList.filter(a => 
    ['SUBMITTED', 'SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED'].includes(a.status)
  ).length;
  const offersAvailable = appList.filter(a => a.status === 'OFFER_SENT').length;
  const contractsAvailable = appList.filter(a => a.status === 'CONTRACT_SENT').length;
  const completed = appList.filter(a => ['SIGNED', 'CLOSED'].includes(a.status)).length;

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
          Tervetuloa, {user?.first_name || 'Asiakas'}!
        </h1>
        <p className="text-slate-600 mt-1">
          Seuraa rahoitushakemuksiasi ja hallitse tarjouksia.
        </p>
      </div>

      {/* CONTRACT AVAILABLE - Highest priority notification */}
      {contractsAvailable > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {contractsAvailable === 1 ? 'Sopimus allekirjoitettavana!' : `${contractsAvailable} sopimusta allekirjoitettavana!`}
                </h2>
                <p className="text-purple-100 mt-1">
                  Rahoittaja on lähettänyt sinulle sopimuksen. Tarkista ehdot ja allekirjoita.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/applications"
              className="bg-white text-purple-700 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center"
            >
              Allekirjoita sopimus
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* OFFER AVAILABLE - Important notification */}
      {offersAvailable > 0 && contractsAvailable === 0 && (
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

      {/* NEW APPLICATIONS - Green highlight for recently submitted */}
      {appList.filter(a => a.status === 'SUBMITTED' || a.status === 'SUBMITTED_TO_FINANCIER').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-start space-x-3"
        >
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-green-800 font-bold">Hakemuksesi on käsittelyssä!</p>
            <p className="text-green-700 text-sm mt-1">
              {appList.filter(a => a.status === 'SUBMITTED' || a.status === 'SUBMITTED_TO_FINANCIER').length} hakemusta odottaa rahoittajan käsittelyä. 
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hakemuksia', value: totalApplications, icon: FileText, color: 'bg-blue-500' },
          { label: 'Käsittelyssä', value: pendingApplications, icon: Clock, color: 'bg-yellow-500' },
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
              className="text-Kantama-600 hover:text-Kantama-700 text-sm font-medium flex items-center"
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
                const isNew = app.status === 'SUBMITTED' || app.status === 'SUBMITTED_TO_FINANCIER';
                const hasOffer = app.status === 'OFFER_SENT';
                return (
                  <Link
                    key={app.id}
                    to={`/dashboard/applications/${app.id}`}
                    className={`block p-4 rounded-xl transition-colors ${
                      hasOffer 
                        ? 'bg-green-50 border-2 border-green-300 hover:bg-green-100' 
                        : isNew 
                          ? 'bg-green-50 border border-green-200 hover:bg-green-100'
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
        className="card bg-gradient-to-r from-Kantama-600 to-Kantama-700 text-white"
      >
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-display font-bold">Tarvitsetko lisää rahoitusta?</h3>
            <p className="text-Kantama-100 mt-1">
              Hae uutta rahoitusta - saat tarjouksen nopeasti.
            </p>
          </div>
          <Link to="/" className="btn bg-white text-Kantama-700 hover:bg-Kantama-50">
            Hae rahoitusta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}


