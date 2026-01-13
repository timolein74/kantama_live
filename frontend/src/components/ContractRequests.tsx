/**
 * KEHITYSVERSIO (DEVELOP BRANCH)
 * Sopimuspyyntöjen hallinta rahoittajalle
 * - Lunastuspyynnöt
 * - Vuosiraporttipyynnöt
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';

interface ContractRequest {
  id: string;
  contract_id: string;
  user_id: string;
  request_type: 'EARLY_PAYOFF' | 'ANNUAL_REPORT' | 'OTHER';
  message: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  response?: string;
  responded_at?: string;
  created_at: string;
  // Joined data
  contract?: any;
  profile?: any;
}

interface ContractRequestsProps {
  contractId?: string;
  showAll?: boolean;
}

export default function ContractRequests({ contractId, showAll = false }: ContractRequestsProps) {
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [contractId]);

  const fetchRequests = async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('contract_requests')
        .select(`
          *,
          contract:contracts(id, application_id, status),
          profile:profiles(id, email, first_name, last_name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (contractId) {
        query = query.eq('contract_id', contractId);
      }

      if (!showAll) {
        query = query.eq('status', 'PENDING');
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (requestId: string, newStatus: 'COMPLETED' | 'REJECTED') => {
    if (!responseText.trim() && newStatus === 'COMPLETED') {
      toast.error('Kirjoita vastaus');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contract_requests')
        .update({
          status: newStatus,
          response: responseText,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(newStatus === 'COMPLETED' ? 'Pyyntö käsitelty!' : 'Pyyntö hylätty');
      setRespondingTo(null);
      setResponseText('');
      fetchRequests();
    } catch (error) {
      console.error('Error responding:', error);
      toast.error('Virhe vastauksen lähetyksessä');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'EARLY_PAYOFF':
        return <CreditCard className="w-5 h-5 text-amber-500" />;
      case 'ANNUAL_REPORT':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-slate-500" />;
    }
  };

  const getRequestLabel = (type: string) => {
    switch (type) {
      case 'EARLY_PAYOFF':
        return 'Lunastuspyyntö';
      case 'ANNUAL_REPORT':
        return 'Vuosiraporttipyyntö';
      default:
        return 'Muu pyyntö';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-yellow">Odottaa käsittelyä</span>;
      case 'PROCESSING':
        return <span className="badge badge-blue">Käsittelyssä</span>;
      case 'COMPLETED':
        return <span className="badge badge-green">Käsitelty</span>;
      case 'REJECTED':
        return <span className="badge badge-red">Hylätty</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 rounded-xl">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Ei avoimia pyyntöjä</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-midnight-900 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        Sopimuspyynnöt ({requests.filter(r => r.status === 'PENDING').length} avointa)
      </h3>

      {requests.map((request) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getRequestIcon(request.request_type)}
              <div>
                <span className="font-medium text-midnight-900">
                  {getRequestLabel(request.request_type)}
                </span>
                <p className="text-sm text-slate-500">
                  {request.profile?.company_name || request.profile?.email || 'Tuntematon'}
                </p>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-slate-700">{request.message}</p>
            <p className="text-xs text-slate-400 mt-2">{formatDateTime(request.created_at)}</p>
          </div>

          {request.response && (
            <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-3 mb-3">
              <p className="text-sm font-medium text-green-800">Vastaus:</p>
              <p className="text-sm text-green-700">{request.response}</p>
              {request.responded_at && (
                <p className="text-xs text-green-500 mt-1">{formatDateTime(request.responded_at)}</p>
              )}
            </div>
          )}

          {request.status === 'PENDING' && (
            <>
              {respondingTo === request.id ? (
                <div className="space-y-3">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={
                      request.request_type === 'EARLY_PAYOFF'
                        ? 'Esim. "Lunastussumma on 12 500 €. Voimassa 30 päivää. Ota yhteyttä maksujärjestelyistä."'
                        : 'Esim. "Vuosiraportti on liitteenä. Raportti sisältää kaikki vuoden 2025 maksut."'
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(request.id, 'COMPLETED')}
                      disabled={isSubmitting}
                      className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Lähetä vastaus
                    </button>
                    <button
                      onClick={() => handleRespond(request.id, 'REJECTED')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setRespondingTo(null);
                        setResponseText('');
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
                    >
                      Peruuta
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRespondingTo(request.id)}
                  className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Vastaa pyyntöön
                </button>
              )}
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}
