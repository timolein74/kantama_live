import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Building2,
  Users,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Euro,
  FileCheck,
  Send,
  Bell,
  Sparkles,
  PartyPopper,
  Inbox,
  Eye,
  MessageSquare
} from 'lucide-react';
import { applications, financiers, offers as offersApi, notifications as notificationsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Application, Financier, User, Offer, Contract } from '../../types';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [appList, setAppList] = useState<Application[]>([]);
  const [financierList, setFinancierList] = useState<Financier[]>([]);
  const [offerList, setOfferList] = useState<any[]>([]);
  const [contractList] = useState<any[]>([]);
  const [customerResponseNotifications, setCustomerResponseNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track dismissed banners (stored in state, resets on page reload for fresh view)
  const [dismissedOfferIds, setDismissedOfferIds] = useState<string[]>([]);
  const [dismissedNewAppIds, setDismissedNewAppIds] = useState<string[]>([]);
  const [dismissedPendingOfferIds, setDismissedPendingOfferIds] = useState<string[]>([]);

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch applications from Supabase (admin sees all)
        const { data: supabaseApps, error: appsError } = await applications.list();
        if (!appsError && supabaseApps) {
          setAppList(supabaseApps as Application[]);
        }
        
        // Fetch financiers
        const { data: financiersData } = await financiers.list();
        if (financiersData) {
          const formattedFinanciers = financiersData.map((f: any) => ({
            id: f.id,
            name: f.company_name || [f.first_name, f.last_name].filter(Boolean).join(' ') || f.email,
            email: f.email,
            is_active: f.is_active !== false,
          }));
          setFinancierList(formattedFinanciers);
        }
        
        // Fetch all offers (admin sees all pending offers)
        const { data: offersData } = await offersApi.listAll();
        if (offersData) {
          setOfferList(offersData);
        }
        
        // Fetch unread notifications for admin (customer responses)
        if (user?.id) {
          const { data: notifData } = await notificationsApi.list(user.id);
          if (notifData) {
            // Filter for unread customer response notifications
            const responseNotifs = notifData.filter((n: any) => 
              !n.is_read && n.title?.includes('vastasi')
            );
            setCustomerResponseNotifications(responseNotifs);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [user?.id]);

  // Calculate stats - filter out dismissed notifications
  const newAppsList = appList.filter(a => a.status === 'SUBMITTED' && !dismissedNewAppIds.includes(a.id));
  const newApplications = newAppsList.length;
  const inProgress = appList.filter(a => 
    ['SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'CONTRACT_SENT'].includes(a.status)
  ).length;
  const completed = appList.filter(a => ['SIGNED', 'CLOSED'].includes(a.status)).length;
  const totalValue = appList.reduce((sum, app) => sum + (app.equipment_price || 0), 0);

  const activeFinanciers = financierList.filter(f => f.is_active).length;

  // Calculate unique customers from applications
  const totalCustomers = new Set(appList.map(app => app.contact_email || app.user_id)).size;

  // Offer stats - filter out dismissed notifications
  const pendingOffersList = offerList.filter(o => o.status === 'PENDING_ADMIN' && !dismissedPendingOfferIds.includes(o.id));
  const pendingOffers = pendingOffersList.length;
  const sentOffers = offerList.filter(o => o.status === 'SENT').length;
  // Filter out dismissed offers from the accepted count
  const acceptedOffersList = offerList.filter(o => o.status === 'ACCEPTED' && !dismissedOfferIds.includes(o.id));
  const acceptedOffers = acceptedOffersList.length;

  // Contract stats
  const pendingContracts = contractList.filter(c => c.status === 'SENT').length;
  const signedContracts = contractList.filter(c => c.status === 'SIGNED').length;

  const recentApplications = appList
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-midnight-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Yleiskatsaus järjestelmän tilasta</p>
      </div>

      {/* NEW APPLICATION NOTIFICATION - Click to dismiss */}
      {newApplications > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Inbox className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {newApplications === 1 ? 'Uusi hakemus saapunut!' : `${newApplications} uutta hakemusta saapunut!`}
                </h2>
                <p className="text-blue-100 mt-1">
                  Uusi rahoitushakemus odottaa käsittelyäsi. Tarkista tiedot ja lähetä rahoittajalle.
                </p>
              </div>
            </div>
            <Link
              to="/admin/applications?status=SUBMITTED"
              onClick={() => {
                // Dismiss all shown new apps when clicking
                const idsToHide = newAppsList.map(a => a.id);
                setDismissedNewAppIds(prev => [...prev, ...idsToHide]);
              }}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center"
            >
              <Eye className="w-5 h-5 mr-2" />
              Käsittele hakemukset
            </Link>
          </div>
        </motion.div>
      )}

      {/* NEW OFFER NOTIFICATION - Click to dismiss */}
      {pendingOffers > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {pendingOffers === 1 ? 'Uusi tarjous odottaa hyväksyntää!' : `${pendingOffers} tarjousta odottaa hyväksyntää!`}
                </h2>
                <p className="text-orange-100 mt-1">
                  Rahoittaja on lähettänyt tarjouksen. Tarkista ja hyväksy ennen kuin asiakas näkee sen.
                </p>
              </div>
            </div>
            <Link
              to="/admin/offers"
              onClick={() => {
                // Dismiss all shown pending offers when clicking
                const idsToHide = pendingOffersList.map(o => o.id);
                setDismissedPendingOfferIds(prev => [...prev, ...idsToHide]);
              }}
              className="bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-colors flex items-center"
            >
              Hyväksy tarjoukset
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ACCEPTED OFFER NOTIFICATION - Click to dismiss */}
      {acceptedOffers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {acceptedOffers === 1 ? 'Asiakas on hyväksynyt tarjouksen!' : `${acceptedOffers} tarjousta hyväksytty!`}
                </h2>
                <p className="text-green-100 mt-1">
                  Sopimuksen tekeminen on nyt mahdollista.
                </p>
              </div>
            </div>
            <Link
              to="/admin/offers"
              onClick={() => {
                // Dismiss all shown accepted offers when clicking
                const idsToHide = acceptedOffersList.map(o => o.id);
                setDismissedOfferIds(prev => [...prev, ...idsToHide]);
              }}
              className="bg-white text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors flex items-center"
            >
              Katso tarjoukset
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* CUSTOMER RESPONSE NOTIFICATION */}
      {customerResponseNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {customerResponseNotifications.length === 1 
                    ? 'Asiakas vastasi lisätietopyyntöön!' 
                    : `${customerResponseNotifications.length} asiakasta vastasi lisätietopyyntöön!`}
                </h2>
                <p className="text-purple-100 mt-1">
                  Klikkaa ilmoitusta avataksesi ja poistaaksesi sen.
                </p>
              </div>
            </div>
          </div>
          {/* Individual notification items - click to open & dismiss */}
          <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
            {customerResponseNotifications.slice(0, 5).map((notif) => (
              <Link
                key={notif.id}
                to={notif.action_url || '/admin/applications'}
                onClick={async () => {
                  try {
                    await notificationsApi.markAsRead(String(notif.id));
                    setCustomerResponseNotifications(prev => 
                      prev.filter(n => n.id !== notif.id)
                    );
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
                      <span className="font-bold text-lg block">{notif.title}</span>
                      <span className="text-sm text-purple-200">{notif.message}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-white text-purple-700 px-4 py-2 rounded-lg font-semibold group-hover:bg-purple-50 transition-colors">
                    <span>Avaa lisätiedot</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Uusia hakemuksia', value: newApplications, icon: AlertCircle, color: 'bg-orange-500', link: '/admin/applications?status=SUBMITTED' },
          { label: 'Käsittelyssä', value: inProgress, icon: Clock, color: 'bg-blue-500', link: '/admin/applications' },
          { label: 'Valmistuneet', value: completed, icon: CheckCircle, color: 'bg-green-500', link: '/admin/applications?status=SIGNED' },
          { label: 'Kokonaisarvo', value: formatCurrency(totalValue), icon: Euro, color: 'bg-purple-500', link: '/admin/applications' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.link} className="card block hover:shadow-lg transition-shadow">
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
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Offers & Contracts stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-midnight-900 flex items-center">
              <Euro className="w-5 h-5 mr-2 text-green-600" />
              Tarjoukset
            </h3>
            <Link to="/admin/offers" className="text-green-600 hover:text-green-700 text-sm font-medium">
              Näytä kaikki →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Link to="/admin/offers?status=PENDING_ADMIN" className="text-center p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors">
              <p className="text-2xl font-bold text-orange-600">{pendingOffers}</p>
              <p className="text-xs text-orange-700">Odottaa hyväksyntää</p>
            </Link>
            <Link to="/admin/offers?status=SENT" className="text-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
              <p className="text-2xl font-bold text-blue-600">{sentOffers}</p>
              <p className="text-xs text-blue-700">Lähetetty</p>
            </Link>
            <Link to="/admin/offers?status=ACCEPTED" className="text-center p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
              <p className="text-2xl font-bold text-green-600">{acceptedOffers}</p>
              <p className="text-xs text-green-700">Hyväksytty</p>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-midnight-900 flex items-center">
              <FileCheck className="w-5 h-5 mr-2 text-green-600" />
              Sopimukset
            </h3>
            <Link to="/admin/contracts" className="text-green-600 hover:text-green-700 text-sm font-medium">
              Näytä kaikki →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-600">{contractList.length}</p>
              <p className="text-xs text-slate-600">Yhteensä</p>
            </div>
            <Link to="/admin/contracts?status=SENT" className="text-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
              <p className="text-2xl font-bold text-purple-600">{pendingContracts}</p>
              <p className="text-xs text-purple-700">Odottaa allekirj.</p>
            </Link>
            <Link to="/admin/contracts?status=SIGNED" className="text-center p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
              <p className="text-2xl font-bold text-green-600">{signedContracts}</p>
              <p className="text-xs text-green-700">Allekirjoitettu</p>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Secondary stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/admin/financiers" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Rahoittajat</p>
              <p className="text-xl font-bold text-midnight-900">{activeFinanciers} / {financierList.length}</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/users?role=CUSTOMER" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Asiakkaat</p>
              <p className="text-xl font-bold text-midnight-900">{totalCustomers}</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/applications" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Hakemuksia yhteensä</p>
              <p className="text-xl font-bold text-midnight-900">{appList.length}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent applications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-midnight-900">Viimeisimmät hakemukset</h2>
          <Link
            to="/admin/applications"
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
          >
            Näytä kaikki
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Ei hakemuksia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Viite</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Tyyppi</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Yritys</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Summa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Tila</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Päivämäärä</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link
                        to={`/admin/applications/${app.id}`}
                        className="font-medium text-green-600 hover:text-green-700"
                      >
                        {app.reference_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center ${
                        app.application_type === 'LEASING' ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                        {app.application_type === 'LEASING' ? (
                          <TrendingUp className="w-4 h-4 mr-1" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        {app.application_type === 'LEASING' ? 'Leasing' : 'SLB'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{app.company_name}</td>
                    <td className="py-3 px-4 font-medium text-midnight-900">{formatCurrency(app.equipment_price)}</td>
                    <td className="py-3 px-4">
                      <span className={getStatusColor(app.status)}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{formatDate(app.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/admin/financiers"
          className="card bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">Hallitse rahoittajia</h3>
              <p className="text-emerald-100 text-sm mt-1">
                Lisää, muokkaa ja hallitse rahoittajia
              </p>
            </div>
            <Building2 className="w-10 h-10 text-emerald-200" />
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="card bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">Käyttäjähallinta</h3>
              <p className="text-indigo-100 text-sm mt-1">
                Hallitse käyttäjiä ja oikeuksia
              </p>
            </div>
            <Users className="w-10 h-10 text-indigo-200" />
          </div>
        </Link>
      </div>
    </div>
  );
}


