import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  ArrowRight,
  TrendingUp,
  Euro,
  FileCheck,
  Sparkles,
  FileSignature,
  Calendar,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Application } from '../../types';

// DEMO DATA - Start empty, applications created via form
const demoApplications: Application[] = [];

export default function FinancierDashboard() {
  const { user } = useAuthStore();
  const [appList, setAppList] = useState<Application[]>(demoApplications);
  const [acceptedOfferApps, setAcceptedOfferApps] = useState<any[]>([]);
  const [isLoading] = useState(false);
  const [dateRange] = useState('Joulukuu 2024');

  // Load data from localStorage
  useEffect(() => {
    const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
    const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
    const allApps = [...demoApplications, ...storedApps];
    
    const accepted = storedOffers.filter((o: any) => o.status === 'ACCEPTED');
    const acceptedWithCustomer = accepted.map((offer: any) => {
      const app = allApps.find(a => String(a.id) === String(offer.application_id)) || offer.application;
      return {
        ...offer,
        customer_name: app?.contact_person || app?.company_name || 'Asiakas'
      };
    });
    setAcceptedOfferApps(acceptedWithCustomer);
    setAppList(allApps);
  }, []);

  // Calculate stats
  const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
  const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
  
  const newApplications = appList.filter(a => a.status === 'SUBMITTED_TO_FINANCIER').length;
  const infoRequested = appList.filter(a => a.status === 'INFO_REQUESTED').length;
  const offersSent = appList.filter(a => ['OFFER_RECEIVED', 'OFFER_SENT'].includes(a.status)).length + 
    storedOffers.filter((o: any) => o.status === 'SENT').length;
  const offersAccepted = acceptedOfferApps.length || appList.filter(a => a.status === 'OFFER_ACCEPTED').length;
  const contractsSigned = storedContracts.filter((c: any) => c.status === 'SIGNED').length;
  const totalValue = appList.reduce((sum, app) => sum + (app.equipment_price || 0), 0);
  const totalApplications = appList.length;

  // Status breakdown for donut chart
  const statusBreakdown = [
    { label: 'Uudet', value: newApplications, color: '#f97316', amount: newApplications * 45000 },
    { label: 'Lisätiedot', value: infoRequested, color: '#eab308', amount: infoRequested * 38000 },
    { label: 'Tarjottu', value: offersSent, color: '#22c55e', amount: offersSent * 52000 },
    { label: 'Hyväksytty', value: offersAccepted, color: '#8b5cf6', amount: offersAccepted * 65000 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // SVG Donut Chart component
  const DonutChart = ({ data, total }: { data: typeof statusBreakdown, total: number }) => {
    const size = 180;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    let currentOffset = 0;
    const segments = data.filter(d => d.value > 0).map((item) => {
      const percentage = total > 0 ? item.value / total : 0;
      const dashLength = percentage * circumference;
      const segment = {
        ...item,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -currentOffset,
      };
      currentOffset += dashLength;
      return segment;
    });

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Data segments */}
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{formatCurrency(totalValue)}</span>
          <span className="text-sm text-slate-500">Yhteensä</span>
        </div>
      </div>
    );
  };

  // Wave/Area chart SVG
  const WaveChart = ({ color, height = 60 }: { color: string, height?: number }) => {
    const points = [10, 25, 15, 35, 28, 45, 38, 55, 48, 40, 52, 65, 58, 50, 62];
    const width = 200;
    
    const pathD = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - (p / 70) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
    
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#gradient-${color})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  };

  // Trend line chart
  const TrendChart = () => {
    const data = [
      { label: 'Leasing', values: [20, 35, 45, 60, 75, 85, 95], color: '#f97316' },
      { label: 'SLB', values: [30, 28, 35, 42, 48, 55, 60], color: '#22c55e' },
      { label: 'Muut', values: [15, 18, 22, 25, 28, 32, 35], color: '#94a3b8' },
    ];
    const width = 300;
    const height = 150;
    const padding = 20;
    
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line
              x1={padding}
              y1={height - padding - (val / 100) * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - (val / 100) * (height - 2 * padding)}
              stroke="#e5e7eb"
              strokeDasharray="4"
            />
            <text
              x={padding - 5}
              y={height - padding - (val / 100) * (height - 2 * padding) + 4}
              fontSize="10"
              fill="#94a3b8"
              textAnchor="end"
            >
              {val}
            </text>
          </g>
        ))}
        
        {/* Lines */}
        {data.map((series) => {
          const pathD = series.values.map((v, i) => {
            const x = padding + (i / (series.values.length - 1)) * (width - 2 * padding);
            const y = height - padding - (v / 100) * (height - 2 * padding);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');
          
          return (
            <g key={series.label}>
              <path d={pathD} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" />
              {/* End dot */}
              <circle
                cx={padding + (width - 2 * padding)}
                cy={height - padding - (series.values[series.values.length - 1] / 100) * (height - 2 * padding)}
                r="5"
                fill={series.color}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 bg-slate-100/50 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <button className="flex items-center text-slate-500 text-sm mt-1 hover:text-slate-700">
            <Calendar className="w-4 h-4 mr-1" />
            {dateRange}
            <ChevronDown className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        {/* Top stats */}
        <div className="flex items-center space-x-8">
          <div className="text-right">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-slate-800">{totalApplications}</span>
              <span className="text-slate-500 text-sm">{formatCurrency(totalValue)}</span>
            </div>
            <span className="text-slate-500 text-sm">Hakemuksia</span>
          </div>
          <div className="text-right">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-slate-800">{newApplications}</span>
              <span className="text-emerald-500 text-sm">+{Math.round(totalValue * 0.12 / 1000)}k</span>
            </div>
            <span className="text-slate-500 text-sm">Uudet</span>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {newApplications > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {newApplications === 1 ? 'Uusi hakemus!' : `${newApplications} uutta hakemusta!`}
                </h2>
                <p className="text-orange-100 text-sm">Käsittele hakemukset ja tee tarjous</p>
              </div>
            </div>
            <Link
              to="/financier/applications"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center"
            >
              Käsittele
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {offersAccepted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Tarjous hyväksytty!</h2>
                {acceptedOfferApps.slice(0, 2).map((offer, idx) => (
                  <p key={idx} className="text-emerald-100 text-sm">
                    • {offer.customer_name}
                  </p>
                ))}
              </div>
            </div>
            <Link
              to="/financier/applications?status=OFFER_ACCEPTED"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center"
            >
              Tee sopimus
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Donut chart card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Hakemukset statuksittain</h3>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <DonutChart data={statusBreakdown} total={totalApplications || 1} />
            
            <div className="space-y-3 ml-6">
              {statusBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between min-w-[140px]">
                  <div className="flex items-center">
                    <div 
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 ml-4">
                    {item.value} kpl
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Yhteenveto</h3>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-slate-800">{totalApplications}</div>
              <div className="text-sm text-slate-500">Hakemuksia</div>
              <div className="mt-3 h-16">
                <WaveChart color="#f97316" />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{Math.round(totalApplications * 0.3)}%</span>
                <span>{Math.round(totalApplications * 0.7)}%</span>
              </div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-slate-800">{offersSent + offersAccepted}</div>
              <div className="text-sm text-slate-500">Tarjouksia</div>
              <div className="mt-3 h-16">
                <WaveChart color="#22c55e" />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{offersSent}</span>
                <span>{offersAccepted}</span>
              </div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-slate-800">{contractsSigned}</div>
              <div className="text-sm text-slate-500">Sopimuksia</div>
              <div className="mt-3 h-16">
                <WaveChart color="#8b5cf6" />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Avoimet</span>
                <span>Valmis</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Hakemusten kehitys</h3>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className="flex items-center space-x-6 mb-4">
            {[
              { label: 'Leasing', color: '#f97316' },
              { label: 'Sale-Leaseback', color: '#22c55e' },
              { label: 'Muut', color: '#94a3b8' },
            ].map((item) => (
              <div key={item.label} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
          
          <TrendChart />
        </motion.div>

        {/* Recent applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Viimeisimmät hakemukset</h3>
            <Link 
              to="/financier/applications"
              className="text-emerald-600 text-sm font-medium hover:text-emerald-700 flex items-center"
            >
              Kaikki
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {appList.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ei hakemuksia</p>
              </div>
            ) : (
              appList.slice(0, 4).map((app, index) => (
                <Link
                  key={app.id}
                  to={`/financier/applications/${app.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      index === 0 ? 'bg-orange-100 text-orange-600' :
                      index === 1 ? 'bg-emerald-100 text-emerald-600' :
                      index === 2 ? 'bg-purple-100 text-purple-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 group-hover:text-emerald-600 transition-colors">
                        {app.company_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {app.equipment_description?.substring(0, 30) || 'Rahoitushakemus'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{formatCurrency(app.equipment_price)}</p>
                    <p className="text-xs text-slate-400">{app.requested_term_months || 36} kk</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Käsittelyssä', value: infoRequested, icon: TrendingUp, color: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-100 text-amber-600' },
            { label: 'Tarjottu', value: offersSent, icon: Euro, color: 'from-blue-500 to-indigo-500', iconBg: 'bg-blue-100 text-blue-600' },
            { label: 'Hyväksytty', value: offersAccepted, icon: FileCheck, color: 'from-emerald-500 to-green-500', iconBg: 'bg-emerald-100 text-emerald-600' },
            { label: 'Allekirjoitettu', value: contractsSigned, icon: FileSignature, color: 'from-purple-500 to-violet-500', iconBg: 'bg-purple-100 text-purple-600' },
          ].map((stat) => (
            <div 
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white`}>
                  {stat.value}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
