import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  Calendar,
  Euro,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Send,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Printer,
  Edit,
  Eye,
  X,
  Rocket,
  Search,
  FileEdit,
  Gift,
  PenTool,
  PartyPopper
} from 'lucide-react';
import { contracts, infoRequests, files, messages, applications, offers } from '../../lib/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  getApplicationTypeLabel,
  getOfferStatusLabel,
  formatFileSize
} from '../../lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ContractDocument } from '../../components/contract';
import type { Application, Offer, InfoRequest } from '../../types';
import type { Contract } from '../../types/contract';

// DEMO DATA - Empty for fresh testing
const demoApplications: Record<string, Application> = {};

const demoOffers: Offer[] = [];

export default function CustomerApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  
  // DEMO MODE: Combine static + localStorage data
  const [application, setApplication] = useState<Application | null>(null);
  const [offerList, setOfferList] = useState<Offer[]>([]);
  const [contractList, setContractList] = useState<Contract[]>([]);
  const [infoRequestList, setInfoRequestList] = useState<InfoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'offers' | 'contracts' | 'messages'>('details');
  
  // Info request response
  const [responseMessage, setResponseMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, { checked: boolean; file: File | null }>>({});
  
  // Initialize document checkboxes when info request changes
  const initDocumentSelection = (docs: any[]) => {
    const initial: Record<string, { checked: boolean; file: File | null }> = {};
    docs.forEach(doc => {
      initial[doc.type] = { checked: false, file: null };
    });
    setSelectedDocs(initial);
  };
  
  // Offer question
  const [showOfferQuestionForm, setShowOfferQuestionForm] = useState<number | null>(null);
  const [offerQuestion, setOfferQuestion] = useState('');
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  
  // Contract upload
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState<Contract | null>(null);
  const [showContractModal, setShowContractModal] = useState<Contract | null>(null);
  const contractDocRef = useRef<HTMLDivElement>(null);

  // Load application from Supabase
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        // Fallback to localStorage for demo
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const storedApp = storedApps.find((a: any) => String(a.id) === id);
        setApplication(storedApp || null);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch application from Supabase
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .single();

        if (appError || !appData) {
          console.error('Application fetch error:', appError);
          setApplication(null);
          setIsLoading(false);
          return;
        }

        setApplication(appData as Application);

        // Fetch offers for this application
        const { data: offersData } = await supabase
          .from('offers')
          .select('*')
          .eq('application_id', id)
          .in('status', ['APPROVED', 'SENT', 'ACCEPTED', 'REJECTED'])
          .order('created_at', { ascending: false });

        setOfferList((offersData || []) as Offer[]);

        // Fetch contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('application_id', id)
          .order('created_at', { ascending: false });

        setContractList((contractsData || []) as Contract[]);

        // Fetch messages/info requests from app_messages table
        const { data: messagesData } = await supabase
          .from('app_messages')
          .select('*')
          .eq('application_id', id)
          .order('created_at', { ascending: true });

        // Transform requested_documents to documents format for UI
        const docLabels: Record<string, string> = {
          tilinpaatos: 'Tilinpäätös',
          tulosTase: 'Tulos ja tase ajot',
          henkilokortti: 'Kuvallinen henkilökortti',
          kuvaKohteesta: 'Kuva kohteesta',
          urakkasopimus: 'Urakkasopimus',
          liiketoimintasuunnitelma: 'Liiketoimintasuunnitelma',
        };
        
        const transformedMessages = (messagesData || []).map((msg: any) => {
          if (msg.requested_documents && Array.isArray(msg.requested_documents)) {
            return {
              ...msg,
              documents: msg.requested_documents.map((docType: string) => ({
                type: docType,
                label: docLabels[docType] || docType,
                required: true
              }))
            };
          }
          return msg;
        });

        setInfoRequestList(transformedMessages as InfoRequest[]);

        // Auto-select contracts tab if contract is sent
        if (appData?.status === 'CONTRACT_SENT' && (contractsData?.length || 0) > 0) {
          setActiveTab('contracts');
        }

        // Auto-select messages tab if there's a pending info request
        if ((messagesData || []).some((m: any) => m.is_info_request && !m.is_read)) {
          setActiveTab('messages');
        }
      } catch (error) {
        console.error('Error fetching application data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAcceptOffer = async (offerId: string | number) => {
    // DEMO MODE
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      // Update offer in localStorage - find in existing or add new entry
      const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
      const offerIndex = storedOffers.findIndex((o: any) => o.id === offerId);
      
      // Find the offer from current state
      const currentOffer = offerList.find(o => o.id === offerId);
      
      if (offerIndex >= 0) {
        storedOffers[offerIndex].status = 'ACCEPTED';
      } else if (currentOffer) {
        // If offer was from demoOffers (not in localStorage), add it with ACCEPTED status
        storedOffers.push({ ...currentOffer, status: 'ACCEPTED' });
      }
      localStorage.setItem('demo-offers', JSON.stringify(storedOffers));
      
      // Update local state
      setOfferList(prev => prev.map(o => 
        o.id === offerId ? { ...o, status: 'ACCEPTED' } : o
      ));
      
      // Update application status
      if (application) {
        const updatedApp = { ...application, status: 'OFFER_ACCEPTED' };
        setApplication(updatedApp);
        
        // Update in localStorage - add or update
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
        if (appIndex >= 0) {
          storedApps[appIndex] = updatedApp;
        } else {
          // If from demo data, add it to localStorage
          storedApps.push(updatedApp);
        }
        localStorage.setItem('demo-applications', JSON.stringify(storedApps));
      }
      
      toast.success('Luottopäätös on haettu! Rahoittaja ottaa sinuun yhteyttä.');
      return;
    }
    
    try {
      const { error } = await offers.accept(offerId);
      if (error) {
        console.error('Error accepting offer:', error);
        toast.error('Virhe tarjouksen hyväksymisessä');
        return;
      }
      toast.success('Luottopäätös on haettu! Saat ilmoituksen kun rahoittaja käsittelee hakemuksesi.');
      // Refresh data
      const [appRes, offersRes] = await Promise.all([
        applications.get(id!),
        offers.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setOfferList(offersRes.data);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Virhe tarjouksen hyväksymisessä');
    }
  };

  const handleSendOfferQuestion = async (offerId: string | number) => {
    if (!offerQuestion.trim()) {
      toast.error('Kirjoita kysymyksesi');
      return;
    }
    
    setIsSendingQuestion(true);
    
    // DEMO MODE: Simulate question sending
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store question in localStorage
      const questions = JSON.parse(localStorage.getItem('demo-offer-questions') || '[]');
      questions.push({
        id: Date.now(),
        offer_id: offerId,
        application_id: id,
        message: offerQuestion,
        created_at: new Date().toISOString(),
        status: 'PENDING',
      });
      localStorage.setItem('demo-offer-questions', JSON.stringify(questions));
      
      toast.success('Kysymys lähetetty rahoittajalle!');
      setOfferQuestion('');
      setShowOfferQuestionForm(null);
      setIsSendingQuestion(false);
      return;
    }
    
    try {
      // Find the offer to get financier_id
      const offer = offerList.find(o => String(o.id) === String(offerId));
      
      // Send message via app_messages
      const { error } = await messages.send({
        application_id: id!,
        message: offerQuestion,
        sender_role: 'CUSTOMER'
      });
      
      if (error) {
        console.error('Error sending question:', error);
        toast.error('Virhe viestin lähettämisessä');
        return;
      }
      
      toast.success('Kysymys lähetetty rahoittajalle!');
      setOfferQuestion('');
      setShowOfferQuestionForm(null);
      
      // Refresh messages
      const messagesRes = await messages.listByApplication(id!);
      setInfoRequestList((messagesRes.data || []) as InfoRequest[]);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Virhe viestin lähettämisessä');
    } finally {
      setIsSendingQuestion(false);
    }
  };

  const handleRejectOffer = async (offerId: string | number) => {
    // DEMO MODE
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      // Update offer in localStorage
      const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
      const offerIndex = storedOffers.findIndex((o: any) => o.id === offerId);
      if (offerIndex >= 0) {
        storedOffers[offerIndex].status = 'REJECTED';
        localStorage.setItem('demo-offers', JSON.stringify(storedOffers));
      }
      
      // Update local state
      setOfferList(prev => prev.map(o => 
        o.id === offerId ? { ...o, status: 'REJECTED' } : o
      ));
      
      toast.success('Tarjous hylätty');
      return;
    }
    
    try {
      const { error } = await offers.reject(offerId);
      if (error) {
        console.error('Error rejecting offer:', error);
        toast.error('Virhe tarjouksen hylkäämisessä');
        return;
      }
      toast.success('Tarjous hylätty');
      // Refresh data
      const [appRes, offersRes] = await Promise.all([
        applications.get(id!),
        offers.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setOfferList(offersRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe tarjouksen hylkäämisessä');
    }
  };

  const handleRespondToInfoRequest = async (infoRequestId: string) => {
    // Check if message or files are provided
    const hasFiles = Object.values(selectedDocs).some(v => v.file);
    if (!responseMessage.trim() && !hasFiles) {
      toast.error('Kirjoita viesti tai liitä tiedostoja');
      return;
    }
    
    setIsResponding(true);
    
    // Build message with file info
    let fullMessage = responseMessage.trim();
    const attachedFiles = Object.entries(selectedDocs)
      .filter(([_, v]) => v.file)
      .map(([key, v]) => {
        const docLabels: Record<string, string> = {
          tilinpaatos: 'Tilinpäätös',
          tulosTase: 'Tulos ja tase ajot',
          henkilokortti: 'Kuvallinen henkilökortti',
          kuvaKohteesta: 'Kuva kohteesta',
          urakkasopimus: 'Urakkasopimus',
          liiketoimintasuunnitelma: 'Liiketoimintasuunnitelma',
        };
        return { type: key, label: docLabels[key] || key, filename: v.file?.name };
      });
    
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map(f => `• ${f.label}: ${f.filename}`).join('\n');
      fullMessage = fullMessage 
        ? `${fullMessage}\n\nLiitetyt dokumentit:\n${fileList}`
        : `Liitetyt dokumentit:\n${fileList}`;
    }
    
    // DEMO MODE CHECK
    const token = localStorage.getItem('token');
    console.log('🔍 handleRespondToInfoRequest - Token:', token ? `${token.substring(0, 30)}...` : 'null');
    
    if (token?.startsWith('demo-token-')) {
      console.log('⚠️ Demo mode - using localStorage');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the info request
      const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
      const irIndex = storedInfoRequests.findIndex((ir: any) => String(ir.id) === String(infoRequestId));
      
      if (irIndex >= 0) {
        // Add response to info request
        const newResponse = {
          id: Date.now(),
          message: fullMessage,
          created_at: new Date().toISOString(),
          user: { email: 'customer@example.com', first_name: 'Asiakas' },
          attachments: attachedFiles
        };
        
        if (!storedInfoRequests[irIndex].responses) {
          storedInfoRequests[irIndex].responses = [];
        }
        storedInfoRequests[irIndex].responses.push(newResponse);
        storedInfoRequests[irIndex].status = 'RESPONDED';
        storedInfoRequests[irIndex].is_read = true;
        
        localStorage.setItem('demo-info-requests', JSON.stringify(storedInfoRequests));
        
        // Update local state
        setInfoRequestList(prev => prev.map(ir => 
          String(ir.id) === String(infoRequestId) 
            ? { ...ir, status: 'RESPONDED', is_read: true, responses: [...(ir.responses || []), newResponse as any] }
            : ir
        ));
      }
      
      toast.success('Vastaus ja liitteet lähetetty!');
      setResponseMessage('');
      setSelectedDocs({});
      setIsResponding(false);
      return;
    }
    
    console.log('✅ Proceeding with Supabase mode');
    
    try {
      // Check authentication first
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Auth check:', authData?.user?.id, 'Error:', authError);
      
      if (authError || !authData?.user) {
        toast.error('Kirjautuminen vanhentunut. Kirjaudu uudelleen.');
        setIsResponding(false);
        return;
      }
      
      // Upload files first (but don't fail if upload fails)
      const uploadedFiles: string[] = [];
      const failedFiles: string[] = [];
      
      for (const [docType, docData] of Object.entries(selectedDocs)) {
        if (docData.file) {
          console.log('📤 Uploading file:', docData.file.name);
          try {
            const { data: uploadResult, error: uploadError } = await files.upload(id!, docData.file, docType);
            
            if (uploadError) {
              console.error('File upload error:', uploadError);
              failedFiles.push(docData.file.name);
            } else if (uploadResult?.path) {
              uploadedFiles.push(uploadResult.path);
              console.log('✅ File uploaded:', uploadResult.path);
            }
          } catch (uploadErr) {
            console.error('File upload exception:', uploadErr);
            failedFiles.push(docData.file.name);
          }
        }
      }
      
      // Add uploaded file info to message
      if (uploadedFiles.length > 0) {
        fullMessage += `\n\n[Ladatut tiedostot: ${uploadedFiles.length} kpl]`;
      }
      if (failedFiles.length > 0) {
        fullMessage += `\n\n[Tiedostoja ei voitu ladata: ${failedFiles.join(', ')}]`;
        toast.error(`Joidenkin tiedostojen lataus epäonnistui: ${failedFiles.join(', ')}`);
      }
      
      console.log('📨 Sending message with attachments:', uploadedFiles);
      
      // Use messages.send for consistent behavior with admin messages
      const { data: result, error } = await messages.send({
        application_id: id!,
        message: fullMessage,
        sender_role: 'CUSTOMER',
        is_info_request: false,
        reply_to_id: infoRequestId,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined
      });
      
      console.log('📨 Message send result:', result, 'Error:', error);
      
      if (error) {
        console.error('Error sending response:', error);
        toast.error('Virhe vastauksen lähettämisessä: ' + (error.message || JSON.stringify(error)));
        return;
      }
      
      // Mark the original message as read
      await messages.markAsRead(infoRequestId);
      
      toast.success('Vastaus lähetetty!');
      setResponseMessage('');
      setSelectedDocs({});
      
      // Refresh messages
      const { data: messagesData } = await supabase
        .from('app_messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true });
      
      setInfoRequestList((messagesData || []) as InfoRequest[]);
      
      // Refresh application
      const appRes = await applications.get(id!);
      setApplication(appRes.data);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Virhe vastauksen lähettämisessä');
    } finally {
      setIsResponding(false);
    }
  };

  const handleUploadSignedContract = async (contractId: number) => {
    if (!signedFile) {
      toast.error('Valitse tiedosto');
      return;
    }
    
    setIsUploading(true);
    try {
      await contracts.uploadSigned(contractId, signedFile);
      toast.success('Allekirjoitettu sopimus lähetetty!');
      setSignedFile(null);
      // Refresh
      const [appRes, contractsRes] = await Promise.all([
        applications.get(id!),
        contracts.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setContractList(contractsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe sopimuksen lataamisessa');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignContract = async (contractId: number) => {
    setIsSigning(true);
    
    // DEMO MODE: Simulate contract signing
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get user info from localStorage
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const user = authData.state?.user;
      const signerName = user ? `${user.first_name} ${user.last_name}` : 'Asiakas';
      
      // Update contract in localStorage
      const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
      const contractIndex = storedContracts.findIndex((c: any) => c.id === contractId);
      if (contractIndex >= 0) {
        storedContracts[contractIndex].status = 'SIGNED';
        storedContracts[contractIndex].signed_at = new Date().toISOString();
        storedContracts[contractIndex].lessee_signer_name = signerName;
        localStorage.setItem('demo-contracts', JSON.stringify(storedContracts));
        
        // Update local state
        setContractList(prev => prev.map(c => 
          c.id === contractId ? { 
            ...c, 
            status: 'SIGNED', 
            signed_at: new Date().toISOString(),
            lessee_signer_name: signerName 
          } : c
        ));
      }
      
      // Update application status to SIGNED
      if (application) {
        const updatedApp = { ...application, status: 'SIGNED' };
        setApplication(updatedApp);
        
        // Update in localStorage
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
        if (appIndex >= 0) {
          storedApps[appIndex] = updatedApp;
        } else {
          storedApps.push(updatedApp);
        }
        localStorage.setItem('demo-applications', JSON.stringify(storedApps));
      }
      
      toast.success('Sopimus allekirjoitettu onnistuneesti!');
      setIsSigning(false);
      return;
    }
    
    try {
      await contracts.sign(contractId, 'Finland');
      toast.success('Sopimus allekirjoitettu!');
      // Refresh
      const [appRes, contractsRes] = await Promise.all([
        applications.get(id!),
        contracts.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setContractList(contractsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe sopimuksen allekirjoittamisessa');
    } finally {
      setIsSigning(false);
    }
  };

  const handlePrintContract = (contract: Contract) => {
    setShowContractPreview(contract);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow && contractDocRef.current) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Rahoitusleasingsopimus - ${contract.contract_number}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            </style>
          </head>
          <body>
            ${contractDocRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      setShowContractPreview(null);
    }, 100);
  };

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
        <Link to="/dashboard/applications" className="btn-primary mt-4">
          Takaisin hakemuksiin
        </Link>
      </div>
    );
  }

  const pendingInfoRequest = infoRequestList.find(ir => !(ir as any).is_read);
  const activeOffer = offerList.find(o => o.status === 'SENT');
  const pendingContract = contractList.find(c => c.status === 'SENT');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/applications"
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
            <p className="text-slate-600 mt-1">{getApplicationTypeLabel(application.application_type)}</p>
          </div>
        </div>
      </div>

      {/* Action alerts */}
      {application.status === 'INFO_REQUESTED' && pendingInfoRequest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Lisätietopyyntö</p>
            <p className="text-yellow-700 text-sm mt-1">
              Rahoittaja pyytää lisätietoja hakemukseesi. Vastaa alla.
            </p>
          </div>
        </motion.div>
      )}

      {application.status === 'OFFER_SENT' && activeOffer && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3"
        >
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">Tarjous saatavilla!</p>
            <p className="text-green-700 text-sm mt-1">
              Olet saanut rahoitustarjouksen. Tarkista tarjous ja hyväksy tai hylkää se.
            </p>
          </div>
        </motion.div>
      )}

      {application.status === 'CONTRACT_SENT' && pendingContract && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start space-x-3"
        >
          <FileCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-800 font-medium">Sopimus odottaa allekirjoitusta</p>
            <p className="text-purple-700 text-sm mt-1">
              Lataa sopimus, allekirjoita se ja palauta allekirjoitettu versio.
            </p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Tiedot', icon: FileText },
            { id: 'offers', label: 'Tarjoukset', icon: Euro, count: offerList.length },
            { id: 'contracts', label: 'Sopimukset', icon: FileCheck, count: contractList.length },
            { id: 'messages', label: 'Viestit', icon: MessageSquare, count: infoRequestList.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
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
          <div className="space-y-6">
            {/* Application Timeline */}
            <div className="card">
              <h3 className="font-semibold text-midnight-900 mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-efund-600" />
                Hakemuksen eteneminen
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                
                {/* Timeline steps */}
                <div className="space-y-6">
                  {(() => {
                    // Map application status to timeline step index (0-5)
                    const getStepForStatus = (status: string): number => {
                      switch(status) {
                        case 'SUBMITTED': return 0;
                        case 'SUBMITTED_TO_FINANCIER': return 1;
                        case 'INFO_REQUESTED': return 1;
                        case 'OFFER_RECEIVED': return 2;
                        case 'OFFER_SENT': return 3;
                        case 'OFFER_ACCEPTED': return 4;
                        case 'CONTRACT_SENT': return 4;
                        case 'SIGNED': return 5;
                        case 'CLOSED': return 5;
                        default: return 0;
                      }
                    };
                    
                    const currentStepIndex = getStepForStatus(application.status);
                    
                    return [
                      { 
                        id: 'submitted', 
                        label: 'Hakemus lähetetty', 
                        description: 'Hakemuksesi on vastaanotettu',
                        icon: Rocket,
                      },
                      { 
                        id: 'processing', 
                        label: 'Käsittelyssä', 
                        description: 'Rahoittaja käsittelee hakemustasi',
                        icon: Search,
                      },
                      { 
                        id: 'offer_preparing', 
                        label: 'Tarjousta valmistellaan', 
                        description: 'Rahoittaja valmistelee tarjousta',
                        icon: FileEdit,
                      },
                      { 
                        id: 'offer_ready', 
                        label: 'Tarjous saatavilla', 
                        description: 'Tarkista ja hyväksy tarjous',
                        icon: Gift,
                      },
                      { 
                        id: 'contract', 
                        label: 'Sopimus', 
                        description: 'Allekirjoita sopimus',
                        icon: PenTool,
                      },
                      { 
                        id: 'complete', 
                        label: 'Valmis', 
                        description: 'Rahoitus on valmis!',
                        icon: PartyPopper,
                      },
                    ].map((step, index) => {
                      const isCompleted = index < currentStepIndex;
                      const isCurrentStep = index === currentStepIndex;
                      const isActive = index <= currentStepIndex;
                    
                    return (
                      <div key={step.id} className="relative flex items-start pl-14">
                        {/* Step icon */}
                        <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                          isCurrentStep 
                            ? 'bg-efund-600 border-efund-200 text-white animate-pulse'
                            : isCompleted
                              ? 'bg-green-500 border-green-200 text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>
                        
                        {/* Step content */}
                        <div className={`pb-6 ${isActive ? '' : 'opacity-50'}`}>
                          <h4 className={`font-semibold ${isActive ? 'text-midnight-900' : 'text-slate-500'}`}>
                            {step.label}
                            {isCurrentStep && (
                              <span className="ml-2 text-xs bg-efund-100 text-efund-700 px-2 py-0.5 rounded-full">
                                Nyt
                              </span>
                            )}
                          </h4>
                          <p className={`text-sm ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                            {step.description}
                          </p>
                          {isCurrentStep && application.updated_at && (
                            <p className="text-xs text-slate-400 mt-1">
                              Päivitetty: {formatDateTime(application.updated_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  });
                  })()}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
            {/* Application info */}
            <div className="card">
              <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-efund-600" />
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
                  <dd className="font-medium text-midnight-900">{application.equipment_description}</dd>
                </div>
                {application.equipment_supplier && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Toimittaja</dt>
                    <dd className="font-medium text-midnight-900">{application.equipment_supplier}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Summa</dt>
                  <dd className="font-medium text-midnight-900">{formatCurrency(application.equipment_price)}</dd>
                </div>
                {application.requested_term_months && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Toivottu sopimuskausi</dt>
                    <dd className="font-medium text-midnight-900">{application.requested_term_months} kk</dd>
                  </div>
                )}
                {(application as any).link_to_item && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Linkki kohteeseen</dt>
                    <dd className="font-medium">
                      <a href={(application as any).link_to_item} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 underline">
                        Avaa linkki →
                      </a>
                    </dd>
                  </div>
                )}
                {(application as any).additional_info && (
                  <div className="pt-3 border-t">
                    <dt className="text-slate-500 mb-1">Lisätiedot kohteesta</dt>
                    <dd className="text-midnight-900">{(application as any).additional_info}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Luotu</dt>
                  <dd className="font-medium text-midnight-900">{formatDateTime(application.created_at)}</dd>
                </div>
              </dl>
            </div>

            {/* Company info */}
            <div className="card">
              <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-green-600" />
                Yrityksen tiedot
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Yritys</dt>
                  <dd className="font-medium text-midnight-900">{application.company_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Y-tunnus</dt>
                  <dd className="font-medium text-midnight-900">{application.business_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Yhteyshenkilö</dt>
                  <dd className="font-medium text-midnight-900">{application.contact_person || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sähköposti</dt>
                  <dd className="font-medium text-midnight-900">{application.contact_email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Puhelin</dt>
                  <dd className="font-medium text-midnight-900">{application.contact_phone || '-'}</dd>
                </div>
              </dl>
            </div>

            {/* Pending offer section on details tab */}
            {offerList.filter(o => o.status === 'SENT').length > 0 && (
              <div className="lg:col-span-2">
                <div className="card border-2 border-green-200 bg-green-50">
                  <h3 className="font-semibold text-midnight-900 mb-4 flex items-center">
                    <Euro className="w-5 h-5 mr-2 text-green-600" />
                    Sinulla on hyväksymätön tarjous!
                  </h3>
                  {offerList.filter(o => o.status === 'SENT').map((offer) => (
                    <div key={offer.id} className="bg-white rounded-xl p-4 mb-4">
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-slate-500 text-sm">Kuukausimaksu</span>
                          <p className="font-bold text-green-700 text-xl">{formatCurrency(offer.monthly_payment)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-sm">Sopimuskausi</span>
                          <p className="font-semibold text-midnight-900">{offer.term_months} kk</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-sm">Rahoitettava summa</span>
                          <p className="font-semibold text-midnight-900">{formatCurrency(application.equipment_price - (offer.upfront_payment || 0))}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveTab('offers')}
                          className="btn-secondary flex-1"
                        >
                          Katso tarjouksen tiedot
                        </button>
                        <button
                          onClick={() => handleAcceptOffer(offer.id)}
                          className="btn-primary bg-green-600 hover:bg-green-700 flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Hae virallinen luottopäätös
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-4">
            {offerList.length === 0 ? (
              <div className="card text-center py-12">
                <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei tarjouksia vielä</h3>
                <p className="text-slate-500">Rahoittaja valmistelee tarjousta hakemukseesi.</p>
              </div>
            ) : (
              offerList.map((offer) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-lg flex items-center">
                        <Euro className="w-5 h-5 mr-2" />
                        Alustava rahoitustarjous
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        offer.status === 'SENT' ? 'bg-white/20 text-white' :
                        offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        offer.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {getOfferStatusLabel(offer.status)}
                      </span>
                    </div>
                    {/* Equipment name */}
                    <p className="text-green-100 mt-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Kohde: <span className="font-semibold text-white ml-1">{application.equipment_description}</span>
                    </p>
                  </div>
                  
                  {/* Preliminary offer notice */}
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                    <p className="text-amber-800 text-sm">
                      <strong>Huom!</strong> Tämä on alustava tarjous. Hyväksymällä tarjouksen haet virallisen luottopäätöksen, 
                      jonka jälkeen saat sopimuksen luettavaksi ja allekirjoitettavaksi.
                    </p>
                  </div>

                  {/* Excel-like Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-48 border-r border-slate-200">Kauppasumma</td>
                          <td className="px-4 py-3 font-semibold text-midnight-900">{formatCurrency(application.equipment_price)} <span className="text-slate-500">alv 0%</span></td>
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-48 border-r border-l border-slate-200">Sopimusaika</td>
                          <td className="px-4 py-3 font-semibold text-midnight-900">{offer.term_months} kk</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Käsiraha</td>
                          <td className="px-4 py-3 font-semibold text-midnight-900">{formatCurrency(offer.upfront_payment || 0)} <span className="text-slate-500">alv 0%</span></td>
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-l border-slate-200">Rahoitettava osuus</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(application.equipment_price - (offer.upfront_payment || 0))} <span className="text-slate-500">alv 0%</span></td>
                        </tr>
                        <tr className="border-b border-slate-100 bg-green-50">
                          <td className="px-4 py-4 bg-green-100 font-bold text-green-800 border-r border-green-200">Kuukausierä</td>
                          <td className="px-4 py-4 font-bold text-green-700 text-xl" colSpan={3}>
                            {formatCurrency(offer.monthly_payment)} <span className="text-green-600 text-base">alv 0%</span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Avausmaksu</td>
                          <td className="px-4 py-3 font-semibold text-midnight-900">{formatCurrency(offer.opening_fee || 300)} <span className="text-slate-500">alv 0%</span></td>
                          <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-l border-slate-200">Laskutuslisä</td>
                          <td className="px-4 py-3 font-semibold text-midnight-900">{offer.invoice_fee || 9} €/kk</td>
                        </tr>
                        {offer.residual_value && application.equipment_price && (
                          <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Jäännösarvo</td>
                            <td className="px-4 py-3 font-semibold text-midnight-900" colSpan={3}>
                              {((offer.residual_value / application.equipment_price) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-500 italic">Hintoihin lisätään voimassa oleva arvonlisävero</p>
                  </div>

                  {offer.notes_to_customer && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-1">Rahoittajan viesti:</p>
                      <p className="text-slate-700">{offer.notes_to_customer}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const residualPercent = offer.residual_value && application.equipment_price
                            ? ((offer.residual_value / application.equipment_price) * 100).toFixed(1)
                            : null;
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
                                    <div style="font-size: 24px; font-weight: bold; color: #1e293b;">Juuri Rahoitus</div>
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
                                <p style="margin-top: 8px;">Juuri Rahoitus • info@juurirahoitus.fi</p>
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

                    {offer.status === 'SENT' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowOfferQuestionForm(showOfferQuestionForm === offer.id ? null : offer.id)}
                          className="btn-ghost text-blue-600"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Kysy lisätietoja
                        </button>
                        <button
                          onClick={() => handleRejectOffer(offer.id)}
                          className="btn-ghost text-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Hylkää
                        </button>
                        <button
                          onClick={() => handleAcceptOffer(offer.id)}
                          className="btn-primary bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Hae virallinen luottopäätös
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Question form */}
                  {showOfferQuestionForm === offer.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="font-medium text-midnight-900 mb-2">Kysy lisätietoja tarjouksesta</h4>
                      <textarea
                        value={offerQuestion}
                        onChange={(e) => setOfferQuestion(e.target.value)}
                        placeholder="Kirjoita kysymyksesi rahoittajalle..."
                        className="input min-h-[100px] mb-3"
                      />
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setShowOfferQuestionForm(null);
                            setOfferQuestion('');
                          }}
                          className="btn-ghost"
                        >
                          Peruuta
                        </button>
                        <button
                          onClick={() => handleSendOfferQuestion(offer.id)}
                          disabled={isSendingQuestion}
                          className="btn-primary"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {isSendingQuestion ? 'Lähetetään...' : 'Lähetä kysymys'}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            {contractList.length === 0 ? (
              <div className="card text-center py-12">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei sopimuksia vielä</h3>
                <p className="text-slate-500">
                  Sopimus lähetetään tarjouksen hyväksymisen jälkeen.
                </p>
              </div>
            ) : (
              contractList.map((contract) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-midnight-900">
                        Rahoitusleasingsopimus {contract.contract_number}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {contract.lessor_company_name} • {contract.lease_period_months} kk
                      </p>
                    </div>
                    <span className={`badge ${
                      contract.status === 'SENT' ? 'badge-purple' :
                      contract.status === 'SIGNED' ? 'badge-green' : 'badge-gray'
                    }`}>
                      {contract.status === 'SENT' ? 'Odottaa allekirjoitusta' :
                       contract.status === 'SIGNED' ? 'Allekirjoitettu' : contract.status}
                    </span>
                  </div>

                  {/* Contract summary */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-4">
                    <h4 className="font-medium text-emerald-800 mb-3">Sopimuksen yhteenveto</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block">Vuokraerä</span>
                        <span className="font-bold text-lg text-emerald-700">
                          {formatCurrency(contract.monthly_rent || 0)}
                        </span>
                        <span className="text-xs text-slate-500 block">alv 0 %</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sopimuskausi</span>
                        <span className="font-semibold text-midnight-900">
                          {contract.lease_period_months} kk
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Jäännösarvo</span>
                        <span className="font-semibold text-midnight-900">
                          {formatCurrency(contract.residual_value || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ennakkovuokra</span>
                        <span className="font-semibold text-midnight-900">
                          {formatCurrency(contract.advance_payment || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-200 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Käsittelymaksu/erä: </span>
                        <span className="font-medium">{formatCurrency(contract.processing_fee || 500)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Järjestelypalkkio: </span>
                        <span className="font-medium">{formatCurrency(contract.arrangement_fee || 10)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 italic">
                      Hintoihin lisätään voimassa oleva arvonlisävero
                    </p>
                  </div>

                  {contract.message_to_customer && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-1">Rahoittajan viesti:</p>
                      <p className="text-slate-700">{contract.message_to_customer}</p>
                    </div>
                  )}

                  {/* Contract PDF download if available */}
                  {(contract as any).contract_pdf_url && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">Sopimus-PDF</p>
                            <p className="text-blue-700 text-sm">Lataa sopimus PDF-muodossa</p>
                          </div>
                        </div>
                        <a 
                          href={(contract as any).contract_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Lataa PDF
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-slate-500 mb-4">
                    {contract.sent_at && <span>Lähetetty: {formatDateTime(contract.sent_at)}</span>}
                    {contract.signed_at && <span> • Allekirjoitettu: {formatDateTime(contract.signed_at)}</span>}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Only show these buttons if there's NO PDF attachment */}
                    {!(contract as any).contract_pdf_url && (
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
                    )}
                    
                    {contract.status === 'SENT' && (
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {/* Upload signed PDF */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id={`signed-${contract.id}`}
                          />
                          <label
                            htmlFor={`signed-${contract.id}`}
                            className="btn-primary cursor-pointer"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {signedFile ? signedFile.name : 'Lataa allekirjoitettu sopimus'}
                          </label>
                          {signedFile && (
                            <button
                              onClick={() => handleUploadSignedContract(contract.id)}
                              disabled={isUploading}
                              className="btn-ghost text-emerald-600"
                            >
                              {isUploading ? 'Lähetetään...' : 'Lähetä'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {contract.status === 'SIGNED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center text-green-700">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <div>
                          <span className="font-medium">Sopimus allekirjoitettu</span>
                          {contract.lessee_signer_name && (
                            <span className="text-sm ml-2">({contract.lessee_signer_name})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}

            {/* Hidden contract document for printing */}
            {showContractPreview && application && (
              <div className="hidden">
                <ContractDocument
                  ref={contractDocRef}
                  contract={showContractPreview}
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
                  {showContractModal.status === 'SENT' && (
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 rounded-b-xl">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            handleSignContract(showContractModal.id);
                            setShowContractModal(null);
                          }}
                          disabled={isSigning}
                          className="btn-primary"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {isSigning ? 'Allekirjoitetaan...' : 'Allekirjoita sähköisesti'}
                        </button>
                      </div>
                    </div>
                  )}
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
              infoRequestList.map((ir) => (
                <motion.div
                  key={ir.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-midnight-900">Lisätietopyyntö</h3>
                    <span className={`badge ${
                      !(ir as any).is_read ? 'badge-yellow' : 'badge-green'
                    }`}>
                      {!(ir as any).is_read ? 'Odottaa vastausta' : 'Vastattu'}
                    </span>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                    <p className="text-sm text-amber-600 mb-1 font-medium">Rahoittajan pyyntö:</p>
                    <p className="text-amber-800 mb-3">{ir.message}</p>
                    {/* Show document list with interactive checkboxes */}
                    {(ir as any).documents && (ir as any).documents.length > 0 && !(ir as any).is_read && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm font-medium text-amber-700 mb-2">Liitä pyydetyt dokumentit:</p>
                        {(ir as any).documents.map((doc: any, i: number) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-amber-200">
                            <label className="flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="mr-3 h-5 w-5 text-amber-600 rounded"
                                checked={selectedDocs[doc.type]?.checked || false}
                                onChange={(e) => {
                                  setSelectedDocs(prev => ({
                                    ...prev,
                                    [doc.type]: { ...prev[doc.type], checked: e.target.checked, file: e.target.checked ? prev[doc.type]?.file : null }
                                  }));
                                }}
                              />
                              <span className="font-medium text-amber-900">{doc.label}</span>
                              {doc.required && (
                                <span className="ml-2 text-xs text-red-600 font-medium">(pakollinen)</span>
                              )}
                            </label>
                            {/* Show file input when checked */}
                            {selectedDocs[doc.type]?.checked && (
                              <div className="mt-3 ml-8">
                                <label className="block">
                                  <span className="text-sm text-amber-700 mb-1 block">Liitä {doc.label.toLowerCase()}:</span>
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setSelectedDocs(prev => ({
                                        ...prev,
                                        [doc.type]: { ...prev[doc.type], file }
                                      }));
                                    }}
                                    className="block w-full text-sm text-slate-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-lg file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-amber-100 file:text-amber-700
                                      hover:file:bg-amber-200 cursor-pointer"
                                  />
                                </label>
                                {selectedDocs[doc.type]?.file && (
                                  <p className="text-xs text-green-600 mt-1 flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {selectedDocs[doc.type]?.file?.name}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Show static document list for already responded requests */}
                    {(ir as any).documents && (ir as any).documents.length > 0 && (ir as any).is_read && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-amber-700 mb-2">Pyydetyt liitteet:</p>
                        <ul className="space-y-2">
                          {(ir as any).documents.map((doc: any, i: number) => (
                            <li key={i} className="flex items-center text-amber-800">
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span>{doc.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Fallback for old format */}
                    {ir.requested_items && ir.requested_items.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-amber-700">
                        {ir.requested_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Responses */}
                  {ir.responses && ir.responses.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {ir.responses.map((resp) => (
                        <div key={resp.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-600">
                              {resp.user.first_name || resp.user.email}
                            </span>
                            <span className="text-xs text-blue-500">{formatDateTime(resp.created_at)}</span>
                          </div>
                          <p className="text-blue-800">{resp.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response form */}
                  {!(ir as any).is_read && (
                    <div className="border-t pt-4">
                      {/* Show requested documents with upload buttons */}
                      {(ir as any).requested_documents && (ir as any).requested_documents.length > 0 && (
                        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-sm font-bold text-amber-800 mb-3">📎 Pyydetyt liitteet - lataa ja lähetä:</p>
                          <div className="space-y-3">
                            {(ir as any).requested_documents.map((docType: string) => {
                              const docLabels: Record<string, string> = {
                                tilinpaatos: 'Tilinpäätös',
                                tulosTase: 'Tulos ja tase ajot',
                                henkilokortti: 'Kuvallinen henkilökortti',
                                kuvaKohteesta: 'Kuva kohteesta',
                                urakkasopimus: 'Urakkasopimus',
                                liiketoimintasuunnitelma: 'Liiketoimintasuunnitelma',
                              };
                              const uploadedFile = selectedDocs[docType]?.file;
                              return (
                                <div key={docType} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                                  <div className="flex items-center">
                                    {uploadedFile ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                    ) : (
                                      <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                                    )}
                                    <span className="font-medium text-slate-800">{docLabels[docType] || docType}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {uploadedFile && (
                                      <span className="text-xs text-green-600 max-w-32 truncate">{uploadedFile.name}</span>
                                    )}
                                    <label className={`btn text-sm cursor-pointer flex items-center ${uploadedFile ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                      <Upload className="w-4 h-4 mr-1" />
                                      {uploadedFile ? 'Vaihda' : 'Valitse'}
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setSelectedDocs(prev => ({
                                              ...prev,
                                              [docType]: { checked: true, file }
                                            }));
                                            toast.success(`${file.name} valittu`);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Always show general file upload */}
                      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm font-bold text-slate-700 mb-3">📎 Liitä tiedostoja:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedDocs).map(([key, doc]) => (
                            doc.file && (
                              <div key={key} className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {doc.file.name}
                                <button 
                                  onClick={() => setSelectedDocs(prev => {
                                    const newDocs = {...prev};
                                    delete newDocs[key];
                                    return newDocs;
                                  })}
                                  className="ml-2 text-green-800 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          ))}
                        </div>
                        <label className="mt-3 btn bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer inline-flex items-center">
                          <Upload className="w-4 h-4 mr-2" />
                          Lisää liite
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const fileKey = `file_${Date.now()}`;
                                setSelectedDocs(prev => ({
                                  ...prev,
                                  [fileKey]: { checked: true, file }
                                }));
                                toast.success(`${file.name} lisätty`);
                              }
                            }}
                          />
                        </label>
                      </div>
                      
                      <textarea
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Kirjoita vastauksesi..."
                        className="input min-h-[100px] mb-3"
                      />
                      <div className="flex justify-end gap-2">
                        <span className="text-sm text-slate-500 self-center">
                          {Object.values(selectedDocs).filter(d => d.file).length} liitettä valittu
                        </span>
                        <button
                          onClick={() => handleRespondToInfoRequest(ir.id)}
                          disabled={isResponding}
                          className="btn-primary"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {isResponding ? 'Lähetetään...' : 'Lähetä vastaus'}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


