import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Briefcase,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { YTJCompanyDetails, formatAddress, hasActiveLiquidation, getCompanyDetails } from '../lib/ytj';

interface YTJCompanyCardProps {
  ytjData: YTJCompanyDetails | null;
  businessId?: string;
  onRefresh?: (data: YTJCompanyDetails) => void;
  showFullDetails?: boolean;
}

export function YTJCompanyCard({ ytjData, businessId, onRefresh, showFullDetails = false }: YTJCompanyCardProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDetails);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    if (!businessId && !ytjData?.businessId) return;
    
    setIsLoading(true);
    const data = await getCompanyDetails(businessId || ytjData?.businessId || '');
    if (data && onRefresh) {
      onRefresh(data);
    }
    setIsLoading(false);
  };

  if (!ytjData) {
    if (!businessId) return null;
    
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 className="w-5 h-5" />
            <span>YTJ-tietoja ei ladattu</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Hae YTJ:stä
          </button>
        </div>
      </div>
    );
  }

  const hasLiquidation = hasActiveLiquidation(ytjData);

  return (
    <div className={`border rounded-xl overflow-hidden ${
      hasLiquidation 
        ? 'bg-red-50 border-red-200' 
        : 'bg-emerald-50 border-emerald-200'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              hasLiquidation ? 'bg-red-100' : 'bg-emerald-100'
            }`}>
              <Building2 className={`w-5 h-5 ${
                hasLiquidation ? 'text-red-600' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{ytjData.name}</h3>
              <p className="text-sm text-slate-600">Y-tunnus: {ytjData.businessId}</p>
              {ytjData.companyForm && (
                <p className="text-xs text-slate-500">{ytjData.companyForm}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasLiquidation ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {ytjData.status}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                <CheckCircle className="w-3 h-3" />
                Aktiivinen
              </span>
            )}
            
            <a
              href={`https://www.ytj.fi/fi/yritystiedot.html?businessId=${ytjData.businessId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600"
              title="Avaa YTJ:ssä"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Basic info always visible */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {ytjData.businessLine && (
            <div className="flex items-center gap-2 text-slate-600">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="truncate">{ytjData.businessLine}</span>
            </div>
          )}
          {ytjData.registrationDate && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Rek. {new Date(ytjData.registrationDate).toLocaleDateString('fi-FI')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-white/50 hover:bg-white/80 transition-colors flex items-center justify-center gap-1 text-sm text-slate-600"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Piilota tiedot
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Näytä kaikki YTJ-tiedot
          </>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t border-slate-200 space-y-4">
              {/* Addresses */}
              {ytjData.addresses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Osoitteet
                  </h4>
                  {ytjData.addresses.map((addr, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span>{formatAddress(addr)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact details */}
              {(ytjData.contactDetails.phone || ytjData.contactDetails.website) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Yhteystiedot
                  </h4>
                  {ytjData.contactDetails.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{ytjData.contactDetails.phone}</span>
                    </div>
                  )}
                  {ytjData.contactDetails.website && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <a 
                        href={ytjData.contactDetails.website.startsWith('http') ? ytjData.contactDetails.website : `https://${ytjData.contactDetails.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        {ytjData.contactDetails.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Auxiliary names */}
              {ytjData.auxiliaryNames.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Aputoiminimet
                  </h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {ytjData.auxiliaryNames.map((name, idx) => (
                      <li key={idx}>• {name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Business line code */}
              {ytjData.businessLineCode && (
                <div className="text-xs text-slate-500">
                  TOL-koodi: {ytjData.businessLineCode}
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Päivitä YTJ-tiedot
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


