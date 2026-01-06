import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  Send,
  TrendingUp,
  RefreshCw,
  Euro,
  MessageSquare,
  FileCheck,
  Clock,
  CheckCircle,
  Download,
  Printer,
  Eye,
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import { applications, financiers, assignments, offers, contracts, infoRequests, messages, notifications as notificationsApi, files as filesApi, emailNotifications } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  getApplicationTypeLabel,
  getOfferStatusLabel,
  getContractStatusLabel
} from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ContractDocument } from '../../components/contract';
import YTJInfoCard from '../../components/YTJInfoCard';
import type { Application, Financier, Offer, InfoRequest } from '../../types';
import type { Contract } from '../../types/contract';
import type { CompanyInfo } from '../../lib/api';

interface Assignment {
  id: number;
  application_id: number;
  financier_id: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [application, setApplication] = useState<Application | null>(null);
  const [financierList, setFinancierList] = useState<Financier[]>([]);
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([]);
  const [offerList, setOfferList] = useState<Offer[]>([]);
  const [contractList, setContractList] = useState<Contract[]>([]);
  const [infoRequestList, setInfoRequestList] = useState<InfoRequest[]>([]);
  const [applicationFiles, setApplicationFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment form
  const [selectedFinancierId, setSelectedFinancierId] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Read initial tab from URL parameter
  const urlTab = searchParams.get('tab') as 'details' | 'financiers' | 'offers' | 'contracts' | 'messages' | null;
  const [activeTab, setActiveTab] = useState<'details' | 'financiers' | 'offers' | 'contracts' | 'messages'>(urlTab || 'details');
  
  // Contract modal
  const [showContractModal, setShowContractModal] = useState<Contract | null>(null);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const contractDocRef = useRef<HTMLDivElement>(null);
  
  // Admin info request
  const [showAdminInfoRequest, setShowAdminInfoRequest] = useState(false);
  const [adminInfoMessage, setAdminInfoMessage] = useState('');
  const [adminInfoFiles, setAdminInfoFiles] = useState<File[]>([]);
  const [isSendingAdminInfo, setIsSendingAdminInfo] = useState(false);
  
  // Reply to customer message
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [adminReplyMessage, setAdminReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Helper function to get customer user_id (from application or by email lookup)
  const getCustomerUserId = async (): Promise<string | null> => {
    // First try application.user_id
    if (application?.user_id) {
      console.log('Using application user_id:', application.user_id);
      return application.user_id;
    }
    
    // Fall back to looking up by email
    if (application?.contact_email) {
      console.log('Looking up user by email:', application.contact_email);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', application.contact_email)
        .single();
      
      if (profile?.id) {
        console.log('Found user by email:', profile.id);
        // Update the application with the user_id for future use
        await applications.update(id!, { user_id: profile.id } as any);
        return profile.id;
      }
    }
    
    console.warn('Could not find customer user_id');
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch application and financiers from Supabase in parallel
        const [appRes, financiersRes] = await Promise.all([
          applications.get(id),
          financiers.list()
        ]);
        
        if (appRes.error || !appRes.data) {
          toast.error('Hakemusta ei löytynyt');
          setIsLoading(false);
          return;
        }
        
        setApplication(appRes.data as Application);
        
        // Transform financier profiles to Financier type
        const financierProfiles = (financiersRes.data || []).map((f: any) => ({
          id: f.id,
          name: f.company_name || [f.first_name, f.last_name].filter(Boolean).join(' ') || f.email,
          email: f.email,
          phone: f.phone,
          business_id: f.business_id,
          is_active: f.is_active !== false,
          created_at: f.created_at,
          updated_at: f.updated_at,
        }));
        setFinancierList(financierProfiles);
        
        setAssignmentList([]);
        setOfferList([]);
        setContractList([]);
        
        // Fetch messages for this application
        const { data: messagesData } = await messages.listByApplication(id);
        if (messagesData) {
          // Sort all messages by date (oldest first for conversation flow)
          const sortedMessages = [...messagesData].sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Store all messages in infoRequestList for display
          setInfoRequestList(sortedMessages as InfoRequest[]);
        }
        
        // Fetch application files
        const filesRes = await filesApi.list(id);
        setApplicationFiles(filesRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Virhe hakemuksen latauksessa');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleAssignToFinancier = async () => {
    if (!selectedFinancierId || !id) {
      toast.error('Valitse rahoittaja');
      return;
    }
    
    setIsAssigning(true);
    
    try {
      // Update application status to SUBMITTED_TO_FINANCIER
      const { error: updateError } = await applications.update(id, {
        status: 'SUBMITTED_TO_FINANCIER'
      } as any);
      
      if (updateError) {
        throw new Error(updateError.message || 'Virhe hakemuksen päivityksessä');
      }
      
      // Update local state
      if (application) {
        setApplication({ ...application, status: 'SUBMITTED_TO_FINANCIER' });
      }
      
      // Add to assignment list (local tracking)
      const newAssignment = {
        id: Date.now(),
        application_id: id,
        financier_id: selectedFinancierId,
        status: 'PENDING',
        notes: assignmentNotes || null,
        created_at: new Date().toISOString(),
      };
      setAssignmentList([...assignmentList, newAssignment as any]);
      
      // Mark any admin notifications related to this application as read
      if (user?.id) {
        try {
          const { data: adminNotifs } = await notificationsApi.list(user.id);
          const appNotifs = (adminNotifs || []).filter((n: any) => 
            n.action_url?.includes(`/admin/applications/${id}`) && !n.is_read
          );
          for (const notif of appNotifs) {
            await notificationsApi.markAsRead(notif.id);
          }
        } catch (err) {
          console.warn('Could not mark notifications as read:', err);
        }
      }
      
      toast.success('Hakemus lähetetty rahoittajalle');
      setSelectedFinancierId(null);
      setAssignmentNotes('');
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast.error(error.message || 'Virhe hakemuksen lähetyksessä');
    } finally {
      setIsAssigning(false);
    }
  };

  const getFinancierName = (financierId: number | string) => {
    const financier = financierList.find(f => String(f.id) === String(financierId));
    return financier?.name || 'Tuntematon';
  };

  const handleAdminSendInfoRequest = async () => {
    if (!adminInfoMessage.trim() || !id) {
      toast.error('Kirjoita viesti');
      return;
    }
    
    setIsSendingAdminInfo(true);
    
    try {
      // Upload files if any
      const fileNames: string[] = [];
      for (const file of adminInfoFiles) {
        try {
          const result = await filesApi.upload(file, id);
          if (result.data) {
            fileNames.push(file.name);
          }
        } catch (err) {
          console.warn('File upload failed:', err);
        }
      }
      
      // Create full message with file names
      let fullMessage = adminInfoMessage;
      if (fileNames.length > 0) {
        fullMessage += '\n\nLiitetiedostot:\n' + fileNames.map(f => `- ${f}`).join('\n');
      }
      
      // Send message with sender_id so customer can notify admin when responding
      await messages.send({
        application_id: id,
        message: fullMessage,
        sender_role: 'ADMIN',
        sender_id: user?.id,
        is_info_request: true,
      });
      
      // Update application status to indicate waiting for customer info
      await applications.update(id, { status: 'INFO_REQUESTED' } as any);
      
      // Create notification for customer - use helper to find user_id
      const customerUserId = await getCustomerUserId();
      if (customerUserId) {
        try {
          console.log('Creating notification for customer:', customerUserId);
          const notifResult = await notificationsApi.create({
            user_id: customerUserId,
            title: 'Lisätietoja pyydetty',
            message: 'Juuri Rahoitus pyytää lisätietoja hakemukseesi liittyen.',
            type: 'INFO',
            action_url: `/dashboard/applications/${id}?tab=messages`,
          });
          console.log('Notification result:', notifResult);
        } catch (notifErr) {
          console.error('Notification creation failed:', notifErr);
        }
      } else {
        console.warn('No customer user_id found for notification');
      }
      
      // Send email notification to customer
      if (application?.contact_email) {
        try {
          await emailNotifications.send(application.contact_email, 'INFO_REQUEST', {
            customerName: application.company_name,
          });
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr);
        }
      }
      
      // Update local state
      if (application) {
        setApplication({ ...application, status: 'INFO_REQUESTED' });
      }
      
      toast.success('Lisätietopyyntö lähetetty asiakkaalle!');
      setShowAdminInfoRequest(false);
      setAdminInfoMessage('');
      setAdminInfoFiles([]);
    } catch (error: any) {
      console.error('Admin info request error:', error);
      toast.error(error.message || 'Virhe lisätietopyynnön lähetyksessä');
    } finally {
      setIsSendingAdminInfo(false);
    }
  };

  // Handle reply to customer message
  const handleAdminReply = async () => {
    if (!adminReplyMessage.trim() || !id || !replyToMessageId) {
      toast.error('Kirjoita vastaus');
      return;
    }
    
    setIsSendingReply(true);
    
    try {
      // Send reply message
      await messages.send({
        application_id: id,
        message: adminReplyMessage,
        sender_role: 'ADMIN',
        sender_id: user?.id,
        is_info_request: false,
        is_read: false,
      });
      
      // Create notification for customer - use helper to find user_id
      const customerUserId = await getCustomerUserId();
      if (customerUserId) {
        try {
          console.log('Creating reply notification for customer:', customerUserId);
          const notifResult = await notificationsApi.create({
            user_id: customerUserId,
            title: 'Juuri Rahoitus vastasi viestiisi',
            message: 'Olet saanut vastauksen kysymykseesi.',
            type: 'INFO',
            action_url: `/dashboard/applications/${id}?tab=messages`,
          });
          console.log('Reply notification result:', notifResult);
        } catch (notifErr) {
          console.error('Reply notification failed:', notifErr);
        }
      } else {
        console.warn('No customer user_id found for reply notification');
      }
      
      // Send email notification to customer
      if (application?.contact_email) {
        try {
          await emailNotifications.send(application.contact_email, 'INFO_REQUEST', {
            customerName: application.company_name,
            message: 'Juuri Rahoitus on vastannut viestiisi.',
          });
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr);
        }
      }
      
      toast.success('Vastaus lähetetty!');
      setAdminReplyMessage('');
      setReplyToMessageId(null);
      
      // Refresh messages
      const { data: messagesData } = await messages.listByApplication(id);
      if (messagesData) {
        const infoReqs = messagesData.filter((m: any) => m.is_info_request);
        const customerResponses = messagesData.filter((m: any) => 
          !m.is_info_request && m.sender_role === 'CUSTOMER'
        );
        const adminReplies = messagesData.filter((m: any) => 
          !m.is_info_request && m.sender_role === 'ADMIN' && !m.is_info_request
        );
        
        const infoReqsWithResponses = infoReqs.map((ir: any) => ({
          ...ir,
          status: customerResponses.some((r: any) => 
            new Date(r.created_at) > new Date(ir.created_at)
          ) ? 'RESPONDED' : 'PENDING',
          responses: customerResponses
            .filter((r: any) => new Date(r.created_at) > new Date(ir.created_at))
            .map((r: any) => ({
              id: r.id,
              message: r.message,
              created_at: r.created_at,
            })),
          adminReplies: adminReplies
            .filter((r: any) => new Date(r.created_at) > new Date(ir.created_at))
            .map((r: any) => ({
              id: r.id,
              message: r.message,
              created_at: r.created_at,
            }))
        }));
        
        setInfoRequestList(infoReqsWithResponses as InfoRequest[]);
      }
    } catch (error: any) {
      console.error('Reply error:', error);
      toast.error(error.message || 'Virhe vastauksen lähetyksessä');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handlePrintContract = (contract: Contract) => {
    setPreviewContract(contract);
    setTimeout(() => {
      if (contractDocRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Sopimus ${contract.contract_number || contract.id}</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                body { font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              ${contractDocRef.current.innerHTML}
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    }, 100);
  };

  // Filter out already assigned financiers and only show active ones
  const availableFinanciers = financierList.filter(
    f => f.is_active && !assignmentList.some(a => String(a.financier_id) === String(f.id))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-midnight-900 mb-2">Hakemusta ei löytynyt</h2>
        <Link to="/admin/applications" className="btn-primary mt-4">
          Takaisin hakemuksiin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/applications"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-display font-bold text-midnight-900">
                {application.reference_number}
              </h1>
              <span className={getStatusColor(application.status)}>
                {getStatusLabel(application.status)}
              </span>
            </div>
            <p className="text-slate-600 mt-1">
              {getApplicationTypeLabel(application.application_type)} • {application.company_name}
            </p>
          </div>
        </div>
      </div>

      {/* Action card - Assign to financier */}
      {application.status === 'SUBMITTED' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-2 border-orange-200 bg-orange-50"
        >
          <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Lähetä rahoittajalle käsittelyyn
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="label">Valitse rahoittaja</label>
                <select
                  value={selectedFinancierId || ''}
                  onChange={(e) => setSelectedFinancierId(e.target.value || null)}
                  className="input"
                >
                  <option value="">-- Valitse --</option>
                  {availableFinanciers.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
            </div>
            <div className="md:col-span-1">
              <label className="label">Muistiinpanot (valinnainen)</label>
              <input
                type="text"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Viesti rahoittajalle..."
                className="input"
              />
            </div>
            <div className="md:col-span-1 flex items-end gap-2">
              <button
                onClick={() => setShowAdminInfoRequest(true)}
                className="btn-secondary flex-1"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Pyydä lisätietoja
              </button>
              <button
                onClick={handleAssignToFinancier}
                disabled={!selectedFinancierId || isAssigning}
                className="btn-primary flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {isAssigning ? 'Lähetetään...' : 'Lähetä'}
              </button>
            </div>
          </div>
          
          {/* Admin info request form */}
          {showAdminInfoRequest && (
            <div className="mt-6 pt-6 border-t border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Pyydä lisätietoja asiakkaalta
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Viesti asiakkaalle</label>
                  <textarea
                    value={adminInfoMessage}
                    onChange={(e) => setAdminInfoMessage(e.target.value)}
                    placeholder="Kirjoita mitä lisätietoja tarvitset asiakkaalta..."
                    className="input min-h-[120px]"
                  />
                </div>
                
                <div>
                  <label className="label">Liitä tiedostoja (valinnainen)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAdminInfoFiles(prev => [...prev, ...files]);
                      }}
                      className="hidden"
                      id="admin-info-files"
                    />
                    <label htmlFor="admin-info-files" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-slate-600 text-sm">Klikkaa lisätäksesi tiedostoja</span>
                    </label>
                  </div>
                  {adminInfoFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {adminInfoFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1">
                          <span className="text-sm text-slate-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setAdminInfoFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAdminInfoRequest(false);
                      setAdminInfoMessage('');
                      setAdminInfoFiles([]);
                    }}
                    className="btn-ghost"
                  >
                    Peruuta
                  </button>
                  <button
                    onClick={handleAdminSendInfoRequest}
                    disabled={!adminInfoMessage.trim() || isSendingAdminInfo}
                    className="btn-primary"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSendingAdminInfo ? 'Lähetetään...' : 'Lähetä pyyntö'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Tiedot', icon: FileText },
            { id: 'financiers', label: 'Rahoittajat', icon: Building2, count: assignmentList.length },
            { id: 'offers', label: 'Tarjoukset', icon: Euro, count: offerList.length },
            { id: 'contracts', label: 'Sopimukset', icon: FileCheck, count: contractList.length },
            { id: 'messages', label: 'Viestit', icon: MessageSquare, count: infoRequestList.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-Kantama-600 text-Kantama-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'details' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Application info */}
            <div className="card">
              <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-Kantama-600" />
                Hakemuksen tiedot
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tyyppi</dt>
                  <dd className="font-medium text-midnight-900">
                    <span className={`inline-flex items-center ${
                      application.application_type === 'LEASING' ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                      {application.application_type === 'LEASING' ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      {getApplicationTypeLabel(application.application_type)}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Kohde</dt>
                  <dd className="font-medium text-midnight-900 text-right max-w-xs">{application.equipment_description}</dd>
                </div>
                {application.equipment_supplier && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Toimittaja</dt>
                    <dd className="font-medium text-midnight-900">{application.equipment_supplier}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Summa</dt>
                  <dd className="font-bold text-lg text-midnight-900">{formatCurrency(application.equipment_price)}</dd>
                </div>
                {application.requested_term_months && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Toivottu sopimuskausi</dt>
                    <dd className="font-medium text-midnight-900">{application.requested_term_months} kk</dd>
                  </div>
                )}
                {application.link_to_item && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Linkki kohteeseen</dt>
                    <dd className="font-medium">
                      <a href={application.link_to_item} target="_blank" rel="noopener noreferrer" className="text-Kantama-600 hover:text-Kantama-700 underline">
                        Avaa linkki →
                      </a>
                    </dd>
                  </div>
                )}
                {(application as any).downpayment_amount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Asiakkaan käsiraha</dt>
                    <dd className="font-medium text-midnight-900">{formatCurrency((application as any).downpayment_amount)}</dd>
                  </div>
                )}
                {application.additional_info && (
                  <div className="pt-3 border-t">
                    <dt className="text-slate-500 mb-1">Lisätiedot kohteesta</dt>
                    <dd className="text-midnight-900">{application.additional_info}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Company info */}
            <div className="card">
              <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-Kantama-600" />
                Yrityksen tiedot
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Yritys</dt>
                  <dd className="font-medium text-midnight-900">{application.company_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Y-tunnus</dt>
                  <dd className="font-mono text-midnight-900">{application.business_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Yhteyshenkilö</dt>
                  <dd className="font-medium text-midnight-900">{application.contact_person || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sähköposti</dt>
                  <dd className="font-medium text-midnight-900">
                    <a href={`mailto:${application.contact_email}`} className="text-Kantama-600 hover:text-Kantama-700">
                      {application.contact_email}
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Puhelin</dt>
                  <dd className="font-medium text-midnight-900">{application.contact_phone || '-'}</dd>
                </div>
              </dl>
            </div>

            {/* YTJ/PRH Company Data */}
            {application.extra_data?.ytj_data && (
              <div className="lg:col-span-2">
                <YTJInfoCard ytjData={application.extra_data.ytj_data as CompanyInfo} />
              </div>
            )}

            {/* Attached Files */}
            {applicationFiles.length > 0 && (
              <div className="card lg:col-span-2">
                <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                  Liitetiedostot ({applicationFiles.length})
                </h3>
                <div className="space-y-2">
                  {applicationFiles.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-slate-400 mr-3" />
                        <div>
                          <p className="font-medium text-slate-900">{file.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {file.document_type === 'tarjousliite' ? 'Tarjousliite' : file.document_type} • 
                            {file.file_size ? ` ${Math.round(file.file_size / 1024)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn bg-emerald-500 text-white hover:bg-emerald-600 text-sm px-4 py-2"
                      >
                        Avaa
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="card lg:col-span-2">
              <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-Kantama-600" />
                Aikajana
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <div>
                  <span className="text-slate-500">Luotu:</span>{' '}
                  <span className="font-medium">{formatDateTime(application.created_at)}</span>
                </div>
                {application.submitted_at && (
                  <div>
                    <span className="text-slate-500">Lähetetty:</span>{' '}
                    <span className="font-medium">{formatDateTime(application.submitted_at)}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Päivitetty:</span>{' '}
                  <span className="font-medium">{formatDateTime(application.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financiers' && (
          <div className="space-y-4">
            {/* Assignment form for non-submitted applications */}
            {application.status !== 'SUBMITTED' && availableFinanciers.length > 0 && (
              <div className="card border border-slate-200">
                <h3 className="font-semibold text-midnight-900 mb-4">Lähetä toiselle rahoittajalle</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <select
                      value={selectedFinancierId || ''}
                      onChange={(e) => setSelectedFinancierId(e.target.value || null)}
                      className="input"
                    >
                      <option value="">-- Valitse rahoittaja --</option>
                      {availableFinanciers.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      placeholder="Muistiinpanot..."
                      className="input"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAssignToFinancier}
                      disabled={!selectedFinancierId || isAssigning}
                      className="btn-primary w-full"
                    >
                      {isAssigning ? 'Lähetetään...' : 'Lähetä'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {assignmentList.length === 0 ? (
              <div className="card text-center py-12">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei toimeksiantoja</h3>
                <p className="text-slate-500">Hakemus ei ole vielä lähetetty rahoittajalle.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {assignmentList.map((assignment) => (
                  <div key={assignment.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-midnight-900">{getFinancierName(assignment.financier_id)}</h4>
                      <span className={`badge ${
                        assignment.status === 'PENDING' ? 'badge-yellow' :
                        assignment.status === 'IN_PROGRESS' ? 'badge-blue' :
                        assignment.status === 'COMPLETED' ? 'badge-green' : 'badge-gray'
                      }`}>
                        {assignment.status === 'PENDING' ? 'Odottaa' :
                         assignment.status === 'IN_PROGRESS' ? 'Käsittelyssä' :
                         assignment.status === 'COMPLETED' ? 'Valmis' : assignment.status}
                      </span>
                    </div>
                    {assignment.notes && (
                      <p className="text-sm text-slate-600 mb-2">{assignment.notes}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Lähetetty: {formatDateTime(assignment.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-4">
            {offerList.length === 0 ? (
              <div className="card text-center py-12">
                <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei tarjouksia</h3>
                <p className="text-slate-500">Rahoittaja ei ole vielä tehnyt tarjousta.</p>
              </div>
            ) : (
              offerList.map((offer) => (
                <div key={offer.id} className={`card ${offer.status === 'PENDING_ADMIN' ? 'border-2 border-orange-300 bg-orange-50' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-midnight-900">Tarjous #{offer.id}</h4>
                      <p className="text-sm text-slate-500">
                        Rahoittaja: {getFinancierName(offer.financier_id)}
                      </p>
                      {(offer as any).application?.equipment_description && (
                        <p className="text-sm text-midnight-700 mt-1 font-medium">
                          Kohde: {(offer as any).application?.equipment_description}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${
                      offer.status === 'DRAFT' ? 'badge-gray' :
                      offer.status === 'PENDING_ADMIN' ? 'badge-orange' :
                      offer.status === 'SENT' ? 'badge-blue' :
                      offer.status === 'ACCEPTED' ? 'badge-green' :
                      offer.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {getOfferStatusLabel(offer.status)}
                    </span>
                  </div>
                  
                  {/* Excel-like table view for offer details */}
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
                      <tbody className="bg-white divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 w-1/4">Kohde</td>
                          <td className="px-4 py-2 text-sm text-midnight-900">{application.equipment_description || '-'}</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 w-1/4">Yritys</td>
                          <td className="px-4 py-2 text-sm text-midnight-900">{application.company_name}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Kauppasumma</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{formatCurrency(application.equipment_price)} alv 0 %</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Käsiraha</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{formatCurrency(offer.upfront_payment || 0)} alv 0 %</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Rahoitettava osuus</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{formatCurrency(application.equipment_price - (offer.upfront_payment || 0))} alv 0 %</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Kk-maksu</td>
                          <td className="px-4 py-2 text-lg font-bold text-emerald-700">{formatCurrency(offer.monthly_payment)} alv 0 %</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Sopimusaika</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{offer.term_months} kk</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Avausmaksu</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{formatCurrency(offer.opening_fee || 0)} alv 0 %</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Laskutuslisä</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">{formatCurrency(offer.invoice_fee || 0)}/kk</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Jäännösarvo</td>
                          <td className="px-4 py-2 text-sm font-semibold text-midnight-900">
                            {offer.residual_value && application.equipment_price 
                              ? `${((offer.residual_value / application.equipment_price) * 100).toFixed(1)} %`
                              : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Luotu</td>
                          <td className="px-4 py-2 text-sm text-midnight-900">{formatDateTime(offer.created_at)}</td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50">Status</td>
                          <td className="px-4 py-2 text-sm">{getOfferStatusLabel(offer.status)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-500 mt-2 italic">Hintoihin lisätään voimassa oleva arvonlisävero</p>
                  </div>

                  {/* Viestit */}
                  {(offer.notes_to_customer || offer.notes_internal || (offer as any).included_services) && (
                    <div className="space-y-2 mb-4">
                      {(offer as any).included_services && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-emerald-700 mb-1">Lisäpalvelut:</p>
                          <p className="text-emerald-900 text-sm">{(offer as any).included_services}</p>
                        </div>
                      )}
                      {offer.notes_to_customer && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-blue-700 mb-1">Viesti asiakkaalle:</p>
                          <p className="text-blue-900 text-sm">{offer.notes_to_customer}</p>
                        </div>
                      )}
                      {offer.notes_internal && (
                        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-700 mb-1">Sisäiset muistiinpanot (ei näy asiakkaalle):</p>
                          <p className="text-slate-900 text-sm">{offer.notes_internal}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Print button */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const residualPercent = offer.residual_value && application.equipment_price
                            ? ((offer.residual_value / application.equipment_price) * 100).toFixed(1)
                            : null;
                          const financierName = getFinancierName(offer.financier_id);
                          printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>Rahoitustarjous - ${application.reference_number}</title>
                              <style>
                                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
                                .logo { display: flex; align-items: center; gap: 12px; }
                                .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
                                .section { margin-bottom: 30px; }
                                .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e293b; }
                                .info-box { background: #f8fafc; padding: 16px; border-radius: 8px; }
                                table { width: 100%; border-collapse: collapse; }
                                td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
                                .label { color: #64748b; }
                                .value { text-align: right; font-weight: 600; color: #1e293b; }
                                .highlight { background: #ecfdf5; }
                                .highlight .label { color: #059669; font-weight: 500; }
                                .highlight .value { color: #059669; font-size: 20px; font-weight: 700; }
                                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #64748b; font-size: 14px; }
                                .note { font-size: 14px; color: #64748b; font-style: italic; margin-top: 12px; }
                                @media print { body { padding: 20px; } }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="logo">
                                  <div class="logo-icon">e</div>
                                  <div>
                                    <div style="font-size: 24px; font-weight: bold; color: #1e293b;">Kantama</div>
                                    <div style="font-size: 14px; color: #64748b;">Rahoitustarjous</div>
                                  </div>
                                </div>
                                <div style="text-align: right; font-size: 14px; color: #64748b;">
                                  <div><strong>Päivämäärä:</strong> ${new Date().toLocaleDateString('fi-FI')}</div>
                                  <div><strong>Viite:</strong> ${application.reference_number}</div>
                                </div>
                              </div>
                              
                              <div class="section">
                                <div class="section-title">Asiakas</div>
                                <div class="info-box">
                                  <div style="font-weight: 600; color: #1e293b;">${application.company_name}</div>
                                  <div style="color: #64748b;">Y-tunnus: ${application.business_id}</div>
                                </div>
                              </div>

                              <div class="section">
                                <div class="section-title">Rahoittaja</div>
                                <div class="info-box">
                                  <div style="font-weight: 600; color: #1e293b;">${financierName}</div>
                                </div>
                              </div>
                              
                              <div class="section">
                                <div class="section-title">Rahoitustarjous</div>
                                <table>
                                  <tr><td class="label">Kauppasumma:</td><td class="value">${formatCurrency(application.equipment_price)} alv 0 %</td></tr>
                                  <tr><td class="label">Käsiraha:</td><td class="value">${formatCurrency(offer.upfront_payment || 0)} alv 0 %</td></tr>
                                  <tr style="background: #f8fafc;"><td class="label">Rahoitettava osuus:</td><td class="value">${formatCurrency(application.equipment_price - (offer.upfront_payment || 0))} alv 0 %</td></tr>
                                  <tr class="highlight"><td class="label">Kuukausierä:</td><td class="value">${formatCurrency(offer.monthly_payment)} alv 0 %</td></tr>
                                  <tr><td class="label">Sopimusaika:</td><td class="value">${offer.term_months} kk</td></tr>
                                  <tr><td class="label">Avausmaksu:</td><td class="value">300 € alv 0 %</td></tr>
                                  <tr><td class="label">Laskutuslisä:</td><td class="value">9 €/kk</td></tr>
                                  ${residualPercent ? `<tr><td class="label">Jäännösarvo:</td><td class="value">${residualPercent} %</td></tr>` : ''}
                                </table>
                                <p class="note">Hintoihin lisätään voimassa oleva arvonlisävero</p>
                              </div>
                              
                              ${offer.notes_to_customer ? `
                              <div class="section">
                                <div class="section-title">Lisätiedot</div>
                                <div class="info-box">${offer.notes_to_customer}</div>
                              </div>
                              ` : ''}
                              
                              <div class="footer">
                                <p>Tämä on alustava rahoitustarjous. Lopullinen sopimus syntyy vasta erillisellä allekirjoituksella.</p>
                                <p style="margin-top: 8px;">Kantama • myynti@Kantama.fi</p>
                              </div>
                            </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="btn-secondary"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Tulosta tarjous
                    </button>
                  </div>
                  
                  {/* Approve button for PENDING_ADMIN offers */}
                  {offer.status === 'PENDING_ADMIN' && (
                    <div className="border-t border-orange-200 pt-4 mt-4 bg-orange-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-800 font-semibold">
                            ⚠️ Odottaa hyväksyntääsi
                          </p>
                          <p className="text-orange-600 text-sm">
                            Asiakas näkee tarjouksen vasta kun hyväksyt sen.
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            // DEMO MODE
                            const token = localStorage.getItem('token');
                            if (token?.startsWith('demo-token-')) {
                              // Update offer status in localStorage
                              const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
                              const offerIndex = storedOffers.findIndex((o: any) => o.id === offer.id);
                              if (offerIndex >= 0) {
                                storedOffers[offerIndex].status = 'SENT';
                                storedOffers[offerIndex].approved_at = new Date().toISOString();
                                localStorage.setItem('demo-offers', JSON.stringify(storedOffers));
                              }
                              
                              // Update application status
                              const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
                              const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
                              if (appIndex >= 0) {
                                storedApps[appIndex].status = 'OFFER_SENT';
                                localStorage.setItem('demo-applications', JSON.stringify(storedApps));
                              }
                              
                              // Update local state
                              setOfferList(prev => prev.map(o => 
                                o.id === offer.id ? { ...o, status: 'SENT' } : o
                              ));
                              if (application) {
                                setApplication({ ...application, status: 'OFFER_SENT' });
                              }
                              
                              toast.success('Tarjous hyväksytty ja lähetetty asiakkaalle!');
                              return;
                            }
                            
                            try {
                              await offers.approve(offer.id);
                              toast.success('Tarjous hyväksytty ja lähetetty asiakkaalle!');
                              const [offersRes, appRes] = await Promise.all([
                                offers.getForApplication(parseInt(id!)),
                                applications.get(parseInt(id!))
                              ]);
                              setOfferList(offersRes.data);
                              setApplication(appRes.data);
                            } catch (error: any) {
                              toast.error(error.response?.data?.detail || 'Virhe tarjouksen hyväksymisessä');
                            }
                          }}
                          className="btn-primary bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Lähetä tarjous asiakkaalle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            {contractList.length === 0 ? (
              <div className="card text-center py-12">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei sopimuksia</h3>
                <p className="text-slate-500">Sopimuksia ei ole vielä lähetetty.</p>
              </div>
            ) : (
              contractList.map((contract) => (
                <div key={contract.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-midnight-900">
                        Sopimus {contract.contract_number || `#${contract.id}`}
                      </h4>
                      <p className="text-sm text-slate-500">
                        Rahoittaja: {getFinancierName(contract.financier_id)}
                      </p>
                    </div>
                    <span className={`badge ${
                      contract.status === 'DRAFT' ? 'badge-gray' :
                      contract.status === 'SENT' ? 'badge-purple' :
                      contract.status === 'SIGNED' ? 'badge-green' : 'badge-red'
                    }`}>
                      {getContractStatusLabel(contract.status)}
                    </span>
                  </div>

                  {/* Contract summary */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block">Vuokralleottaja</span>
                        <span className="font-semibold text-midnight-900">
                          {contract.lessee_company_name || application?.company_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Vuokraerä</span>
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(contract.monthly_rent || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sopimuskausi</span>
                        <span className="font-semibold">{contract.lease_period_months || 0} kk</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Jäännösarvo</span>
                        <span className="font-semibold">{formatCurrency(contract.residual_value || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-500 mb-4">
                    Luotu: {formatDateTime(contract.created_at)}
                    {contract.sent_at && ` • Lähetetty: ${formatDateTime(contract.sent_at)}`}
                    {contract.signed_at && ` • Allekirjoitettu: ${formatDateTime(contract.signed_at)}`}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowContractModal(contract)}
                        className="btn-secondary"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Näytä sopimus
                      </button>
                      <button
                        onClick={() => handlePrintContract(contract)}
                        className="btn-ghost"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Tulosta
                      </button>
                    </div>
                    {contract.contract_file_id && (
                      <button className="btn-ghost">
                        <Download className="w-4 h-4 mr-1" />
                        Lataa liite
                      </button>
                    )}
                  </div>

                  {contract.status === 'SIGNED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center text-green-700">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">
                          Sopimus allekirjoitettu {contract.lessee_signer_name && `(${contract.lessee_signer_name})`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Hidden contract document for printing */}
            {previewContract && application && (
              <div className="hidden">
                <ContractDocument
                  ref={contractDocRef}
                  contract={previewContract}
                  application={application}
                />
              </div>
            )}

            {/* Contract Modal - Full screen preview */}
            {showContractModal && application && (
              <div className="fixed inset-0 bg-black/70 z-50 overflow-auto p-4 flex items-start justify-center">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 relative">
                  <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl z-10">
                    <h3 className="font-bold text-lg text-midnight-900">
                      Rahoitusleasingsopimus {showContractModal.contract_number}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handlePrintContract(showContractModal)}
                        className="btn-secondary text-sm"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Tulosta PDF
                      </button>
                      <button
                        onClick={() => setShowContractModal(null)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="w-6 h-6 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 overflow-auto max-h-[80vh]">
                    <ContractDocument
                      contract={showContractModal}
                      application={application}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            {infoRequestList.length === 0 ? (
              <div className="card text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei viestejä</h3>
                <p className="text-slate-500">Lisätietopyynnöt näkyvät tässä.</p>
              </div>
            ) : (
              <div className="card">
                <h4 className="font-semibold text-midnight-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-emerald-600" />
                  Keskustelu ({infoRequestList.length} viestiä)
                </h4>
                
                {/* Show all messages in chronological order */}
                <div className="space-y-3">
                  {infoRequestList.map((msg: any) => {
                    const isAdmin = msg.sender_role === 'ADMIN';
                    const isFinancier = msg.sender_role === 'FINANCIER';
                    const isCustomer = msg.sender_role === 'CUSTOMER';
                    const isInfoRequest = msg.is_info_request;
                    
                    // Determine styling based on sender
                    let bgClass = 'bg-blue-50 border-blue-400';
                    let textClass = 'text-blue-800';
                    let labelClass = 'text-blue-600';
                    let label = 'Asiakas';
                    
                    if (isAdmin) {
                      bgClass = isInfoRequest ? 'bg-yellow-50 border-yellow-400' : 'bg-purple-50 border-purple-400';
                      textClass = isInfoRequest ? 'text-yellow-800' : 'text-purple-800';
                      labelClass = isInfoRequest ? 'text-yellow-600' : 'text-purple-600';
                      label = isInfoRequest ? 'Admin (lisätietopyyntö)' : 'Admin';
                    } else if (isFinancier) {
                      bgClass = isInfoRequest ? 'bg-orange-50 border-orange-400' : 'bg-emerald-50 border-emerald-400';
                      textClass = isInfoRequest ? 'text-orange-800' : 'text-emerald-800';
                      labelClass = isInfoRequest ? 'text-orange-600' : 'text-emerald-600';
                      label = isInfoRequest ? 'Rahoittaja (lisätietopyyntö)' : 'Rahoittaja';
                    }
                    
                    return (
                      <div key={msg.id} className={`${bgClass} border-l-4 p-3 rounded-r-lg`}>
                        <p className={`text-xs ${labelClass} mb-1`}>
                          {label} • {formatDateTime(msg.created_at)}
                        </p>
                        <p className={`${textClass} whitespace-pre-wrap`}>{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
                
                {/* Show attached files */}
                {applicationFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">📎 Liitetiedostot:</p>
                    <div className="space-y-1">
                      {applicationFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between bg-white rounded p-2">
                          <span className="text-sm text-slate-700">{file.file_name}</span>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600"
                          >
                            Avaa
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General message form - always available */}
            <div className="card mt-6 border-2 border-dashed border-blue-300">
              <h4 className="font-semibold text-midnight-900 mb-3 flex items-center">
                <Send className="w-5 h-5 mr-2 text-blue-600" />
                Lähetä uusi viesti asiakkaalle
              </h4>
              <textarea
                value={adminReplyMessage}
                onChange={(e) => setAdminReplyMessage(e.target.value)}
                placeholder="Kirjoita viestisi tähän..."
                className="input min-h-[100px] mb-3"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!adminReplyMessage.trim() || !id) {
                      toast.error('Kirjoita viesti');
                      return;
                    }
                    setIsSendingReply(true);
                    try {
                      await messages.send({
                        application_id: id,
                        message: adminReplyMessage,
                        sender_role: 'ADMIN',
                        sender_id: user?.id,
                        is_info_request: false,
                        is_read: false,
                      });
                      
                      // Create notification - try user_id first, then find by email
                      let targetUserId = application?.user_id;
                      
                      if (!targetUserId && application?.contact_email) {
                        // Try to find user by email
                        try {
                          const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('email', application.contact_email)
                            .single();
                          if (profiles?.id) {
                            targetUserId = profiles.id;
                          }
                        } catch (e) {
                          console.warn('Could not find user by email');
                        }
                      }
                      
                      if (targetUserId) {
                        try {
                          await notificationsApi.create({
                            user_id: targetUserId,
                            title: 'Uusi viesti Juuri Rahoitukselta',
                            message: 'Olet saanut uuden viestin hakemukseesi liittyen.',
                            type: 'INFO',
                            action_url: `/dashboard/applications/${id}?tab=messages`,
                          });
                        } catch (notifErr) {
                          console.error('Failed to create notification:', notifErr);
                        }
                      }
                      
                      if (application?.contact_email) {
                        await emailNotifications.send(application.contact_email, 'INFO_REQUEST', {
                          customerName: application.company_name,
                          message: 'Olet saanut uuden viestin hakemukseesi liittyen.',
                        });
                      }
                      
                      toast.success('Viesti lähetetty!');
                      setAdminReplyMessage('');
                      
                      // Refresh messages
                      const { data: messagesData } = await messages.listByApplication(id);
                      if (messagesData) {
                        const infoReqs = messagesData.filter((m: any) => m.is_info_request);
                        const customerResponses = messagesData.filter((m: any) => 
                          !m.is_info_request && m.sender_role === 'CUSTOMER'
                        );
                        const adminReplies = messagesData.filter((m: any) => 
                          !m.is_info_request && m.sender_role === 'ADMIN'
                        );
                        
                        const infoReqsWithResponses = infoReqs.map((ir: any) => ({
                          ...ir,
                          status: customerResponses.some((r: any) => 
                            new Date(r.created_at) > new Date(ir.created_at)
                          ) ? 'RESPONDED' : 'PENDING',
                          responses: customerResponses
                            .filter((r: any) => new Date(r.created_at) > new Date(ir.created_at))
                            .map((r: any) => ({ id: r.id, message: r.message, created_at: r.created_at })),
                          adminReplies: adminReplies
                            .filter((r: any) => new Date(r.created_at) > new Date(ir.created_at))
                            .map((r: any) => ({ id: r.id, message: r.message, created_at: r.created_at }))
                        }));
                        
                        setInfoRequestList(infoReqsWithResponses as InfoRequest[]);
                      }
                    } catch (error: any) {
                      console.error('Send message error:', error);
                      toast.error(error.message || 'Virhe viestin lähetyksessä');
                    } finally {
                      setIsSendingReply(false);
                    }
                  }}
                  disabled={isSendingReply || !adminReplyMessage.trim()}
                  className="btn-primary"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSendingReply ? 'Lähetetään...' : 'Lähetä viesti'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


