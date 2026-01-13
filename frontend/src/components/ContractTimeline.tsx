/**
 * KEHITYSVERSIO (DEVELOP BRANCH)
 * Sopimuksen aikajana -komponentti
 * - Näyttää sopimuksen keston graafisesti
 * - Mahdollistaa lunastuspyynnön
 * - Mahdollistaa vuosiraportin pyynnön
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Euro,
  CheckCircle,
  Send,
  FileText,
  TrendingUp,
  AlertCircle,
  X,
  CreditCard,
  Download
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';

interface ContractTimelineProps {
  contract: {
    id: string;
    application_id: string;
    status: string;
    activated_at?: string;
    term_months?: number;
    monthly_payment?: number;
    total_amount?: number;
    signed_at?: string;
    created_at: string;
  };
  offer?: {
    monthly_payment?: number;
    term_months?: number;
  };
  userRole: 'CUSTOMER' | 'FINANCIER' | 'ADMIN';
  onUpdate?: () => void;
}

export default function ContractTimeline({ contract, offer, userRole, onUpdate }: ContractTimelineProps) {
  const [showRequestModal, setShowRequestModal] = useState<'EARLY_PAYOFF' | 'ANNUAL_REPORT' | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Laske sopimuksen tiedot
  const termMonths = contract.term_months || offer?.term_months || 36;
  const monthlyPayment = contract.monthly_payment || offer?.monthly_payment || 0;
  const totalAmount = contract.total_amount || (monthlyPayment * termMonths);
  
  const startDate = contract.activated_at ? new Date(contract.activated_at) : new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + termMonths);
  
  // Laske kulunut aika
  const now = new Date();
  const elapsedMonths = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
  const progressPercent = Math.min(100, (elapsedMonths / termMonths) * 100);
  const remainingMonths = Math.max(0, termMonths - elapsedMonths);
  const paidAmount = Math.min(totalAmount, elapsedMonths * monthlyPayment);
  const remainingAmount = totalAmount - paidAmount;

  // Luo kuukausien aikajana
  const timelineMonths = Array.from({ length: termMonths }, (_, i) => {
    const monthDate = new Date(startDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    const isPast = monthDate < now;
    const isCurrent = monthDate.getMonth() === now.getMonth() && monthDate.getFullYear() === now.getFullYear();
    return {
      index: i + 1,
      date: monthDate,
      isPast,
      isCurrent,
      payment: monthlyPayment
    };
  });

  const handleSubmitRequest = async () => {
    if (!showRequestModal || !requestMessage.trim()) {
      toast.error('Kirjoita viesti');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('contract_requests').insert({
          contract_id: contract.id,
          user_id: user?.id,
          request_type: showRequestModal,
          message: requestMessage
        });

        if (error) throw error;
      }

      toast.success(
        showRequestModal === 'EARLY_PAYOFF' 
          ? 'Lunastuspyyntö lähetetty rahoittajalle!' 
          : 'Vuosiraporttipyyntö lähetetty!'
      );
      setShowRequestModal(null);
      setRequestMessage('');
      onUpdate?.();
    } catch (error: any) {
      console.error('Request error:', error);
      toast.error('Virhe pyynnön lähetyksessä');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Jos sopimus ei ole vielä aktivoitu
  if (contract.status !== 'ACTIVE') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Sopimus ei ole vielä aktiivinen tuotannossa.</p>
        <p className="text-sm text-slate-500 mt-1">Aikajana näytetään kun sopimus aktivoidaan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Yhteenveto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center text-emerald-600 mb-2">
            <Calendar className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Sopimusaika</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{termMonths} kk</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center text-blue-600 mb-2">
            <Euro className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Kuukausierä</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(monthlyPayment)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center text-purple-600 mb-2">
            <TrendingUp className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Maksettu</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">{formatCurrency(paidAmount)}</p>
          <p className="text-xs text-purple-600">{elapsedMonths} / {termMonths} kk</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center text-amber-600 mb-2">
            <Clock className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Jäljellä</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{formatCurrency(remainingAmount)}</p>
          <p className="text-xs text-amber-600">{remainingMonths} kk</p>
        </div>
      </div>

      {/* Edistymispalkki */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-midnight-900">Sopimuksen eteneminen</h3>
          <span className="text-sm text-slate-500">
            {formatDate(startDate.toISOString())} → {formatDate(endDate.toISOString())}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-md">
              {Math.round(progressPercent)}% valmis
            </span>
          </div>
        </div>

        {/* Aikajana kuukausittain */}
        <div className="relative">
          <div className="flex overflow-x-auto pb-4 gap-1">
            {timelineMonths.map((month, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => {
                  if (userRole === 'CUSTOMER' && month.isPast) {
                    setShowRequestModal('EARLY_PAYOFF');
                  }
                }}
                className={`
                  flex-shrink-0 w-10 h-14 rounded-lg flex flex-col items-center justify-center text-xs
                  transition-all cursor-pointer
                  ${month.isCurrent 
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-200 scale-110 z-10' 
                    : month.isPast 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }
                `}
                title={`${month.date.toLocaleDateString('fi-FI', { month: 'short', year: 'numeric' })} - ${formatCurrency(month.payment)}`}
              >
                <span className="font-bold">{month.index}</span>
                {month.isCurrent && <CheckCircle className="w-3 h-3 mt-0.5" />}
              </motion.div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-100 rounded" />
              <span>Maksettu</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span>Nykyinen</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-100 rounded" />
              <span>Tulossa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toimintopainikkeet (vain asiakkaalle) */}
      {userRole === 'CUSTOMER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRequestModal('EARLY_PAYOFF')}
            className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <CreditCard className="w-6 h-6" />
            <div className="text-left">
              <div>Lunasta sopimus</div>
              <div className="text-xs font-normal opacity-80">Maksa jäljellä oleva summa kerralla</div>
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRequestModal('ANNUAL_REPORT')}
            className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download className="w-6 h-6" />
            <div className="text-left">
              <div>Vuosiraportti</div>
              <div className="text-xs font-normal opacity-80">Tilaa kirjanpitoa varten</div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Pyyntö-modaali */}
      {showRequestModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRequestModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-midnight-900 flex items-center gap-2">
                {showRequestModal === 'EARLY_PAYOFF' ? (
                  <>
                    <CreditCard className="w-6 h-6 text-amber-500" />
                    Lunastuspyyntö
                  </>
                ) : (
                  <>
                    <FileText className="w-6 h-6 text-blue-500" />
                    Vuosiraporttipyyntö
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowRequestModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showRequestModal === 'EARLY_PAYOFF' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Jäljellä oleva summa</p>
                    <p className="text-2xl font-bold text-amber-900">{formatCurrency(remainingAmount)}</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Rahoittaja laskee tarkan lunastussumman ja ottaa sinuun yhteyttä.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showRequestModal === 'ANNUAL_REPORT' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Vuosiraportti kirjanpitoon</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Saat raportin maksetuista eristä ja koroista verovuodelta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Viesti rahoittajalle
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder={
                  showRequestModal === 'EARLY_PAYOFF'
                    ? 'Esim. "Haluan lunastaa sopimuksen kokonaan. Pyydän tarjousta lunastussummasta."'
                    : 'Esim. "Pyydän vuosiraportin vuodelta 2025 kirjanpitoa varten."'
                }
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(null)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50"
              >
                Peruuta
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={isSubmitting || !requestMessage.trim()}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Lähetä pyyntö
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
