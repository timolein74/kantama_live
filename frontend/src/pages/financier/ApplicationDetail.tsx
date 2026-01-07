import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  TrendingUp,
  RefreshCw,
  Euro,
  MessageSquare,
  FileCheck,
  Send,
  Upload,
  Download,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Printer,
  Eye
} from 'lucide-react';
import { applications, offers, contracts, infoRequests, files } from '../../lib/api';
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
import { ContractForm, ContractDocument } from '../../components/contract';
import YTJInfoCard from '../../components/YTJInfoCard';
import type { Application, Offer, InfoRequest } from '../../types';
import type { Contract, ContractCreateData } from '../../types/contract';
import type { CompanyInfo } from '../../lib/api';

export default function FinancierApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [offerList, setOfferList] = useState<Offer[]>([]);
  const [contractList, setContractList] = useState<Contract[]>([]);
  const [infoRequestList, setInfoRequestList] = useState<InfoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'offer' | 'contract' | 'messages'>('details');
  
  // Info request form
  const [showInfoRequestForm, setShowInfoRequestForm] = useState(false);
  const [infoRequestMessage, setInfoRequestMessage] = useState('');
  const [infoRequestItems, setInfoRequestItems] = useState('');
  const [isSendingInfoRequest, setIsSendingInfoRequest] = useState(false);
  
  // Offer form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [insuranceByLessee, setInsuranceByLessee] = useState(true);
  const [customerOwnInsurance, setCustomerOwnInsurance] = useState('');
  const [offerData, setOfferData] = useState({
    monthly_payment: '2500',
    term_months: '36',
    upfront_payment: '0',
    residual_value: '0',
    opening_fee: '300',
    invoice_fee: '9',
    included_services: '',
    notes_to_customer: '',
    internal_notes: ''
  });
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  
  // Contract form
  const [showContractForm, setShowContractForm] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [showContractModal, setShowContractModal] = useState<Contract | null>(null);
  const contractDocRef = useRef<HTMLDivElement>(null);
  
  // Document request form (for accepted offers)
  const [showDocumentRequest, setShowDocumentRequest] = useState(false);
  const [isSendingDocumentRequest, setIsSendingDocumentRequest] = useState(false);
  const [documentTypes, setDocumentTypes] = useState({
    tilinpaatos: { selected: false, required: false },
    tulosTase: { selected: false, required: false },
    kuvaKohteesta: { selected: false, required: false },
    urakkasopimus: { selected: false, required: false },
    liiketoimintasuunnitelma: { selected: false, required: false },
  });
  const [documentRequestMessage, setDocumentRequestMessage] = useState('');

  // DEMO DATA - Empty for fresh testing
  const demoApplications: Application[] = [];

  const demoOffers: Offer[] = [];

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      // DEMO MODE: Check if using demo token
      const token = localStorage.getItem('token');
      if (token?.startsWith('demo-token-')) {
        // Combine demo data + localStorage applications
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const allApps = [...demoApplications, ...storedApps];
        // Find app - prefer localStorage version (more recent)
        const storedApp = storedApps.find((a: any) => String(a.id) === id);
        const demoApp = demoApplications.find(a => String(a.id) === id);
        const app = storedApp || demoApp || null;
        setApplication(app);
        
        // Combine demo offers + localStorage offers for this application
        const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
        const appOffers = [
          ...demoOffers.filter(o => String(o.application_id) === id),
          ...storedOffers.filter((o: any) => String(o.application_id) === id)
        ];
        // Remove duplicates by id (prefer localStorage version)
        const uniqueOffers = appOffers.reduce((acc: any[], offer: any) => {
          const exists = acc.find(o => o.id === offer.id);
          if (exists) {
            // Replace with newer version (from localStorage)
            return acc.map(o => o.id === offer.id ? offer : o);
          }
          return [...acc, offer];
        }, []);
        setOfferList(uniqueOffers);
        
        // Load contracts from localStorage
        const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
        setContractList(storedContracts.filter((c: any) => String(c.application_id) === id));
        
        // Load info requests from localStorage
        const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
        setInfoRequestList(storedInfoRequests.filter((ir: any) => String(ir.application_id) === id));
        
        setIsLoading(false);
        
        if (app) {
          if (['SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED', 'SUBMITTED'].includes(app.status)) {
            setActiveTab('details');
          } else if (['OFFER_SENT', 'OFFER_ACCEPTED'].includes(app.status)) {
            setActiveTab('offer');
          } else if (app.status === 'CONTRACT_SENT') {
            setActiveTab('contract');
          }
        }
        return;
      }
      
      try {
        const [appRes, offersRes, contractsRes, infoRes] = await Promise.all([
          applications.get(id),
          offers.getForApplication(id),
          contracts.getForApplication(id),
          infoRequests.getForApplication(id)
        ]);
        
        setApplication(appRes.data);
        setOfferList(offersRes.data);
        setContractList(contractsRes.data);
        setInfoRequestList(infoRes.data);
        
        // Auto-select tab based on status
        if (['SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED'].includes(appRes.data.status)) {
          setActiveTab('details');
        } else if (['OFFER_SENT', 'OFFER_ACCEPTED'].includes(appRes.data.status)) {
          setActiveTab('offer');
        } else if (appRes.data.status === 'CONTRACT_SENT') {
          setActiveTab('contract');
        }
      } catch (error) {
        toast.error('Virhe hakemuksen latauksessa');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleSendInfoRequest = async () => {
    if (!infoRequestMessage.trim() || !id) {
      toast.error('Kirjoita viesti');
      return;
    }
    
    setIsSendingInfoRequest(true);
    
    // DEMO MODE: Simulate info request
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const requestedItems = infoRequestItems.trim()
        ? infoRequestItems.split('\n').filter(item => item.trim())
        : [];
      
      const newRequest = {
        id: Date.now(),
        application_id: id,
        financier_id: 1,
        message: infoRequestMessage,
        requested_items: requestedItems,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        sender: 'financier',
        responses: [],
      };
      
      // Save to localStorage so customer can see it
      const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
      storedInfoRequests.push(newRequest);
      localStorage.setItem('demo-info-requests', JSON.stringify(storedInfoRequests));
      
      setInfoRequestList([...infoRequestList, newRequest as any]);
      
      // Update application status
      if (application) {
        setApplication({ ...application, status: 'INFO_REQUESTED' });
        
        // Also update in localStorage
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
        if (appIndex >= 0) {
          storedApps[appIndex].status = 'INFO_REQUESTED';
          localStorage.setItem('demo-applications', JSON.stringify(storedApps));
        }
      }
      
      toast.success('Lisätietopyyntö lähetetty asiakkaalle!');
      setShowInfoRequestForm(false);
      setInfoRequestMessage('');
      setInfoRequestItems('');
      setIsSendingInfoRequest(false);
      return;
    }
    
    try {
      const requestedItems = infoRequestItems.trim()
        ? infoRequestItems.split('\n').filter(item => item.trim())
        : undefined;
      
      await infoRequests.create({
        application_id: id,
        message: infoRequestMessage,
        requested_items: requestedItems
      });
      
      toast.success('Lisätietopyyntö lähetetty');
      setShowInfoRequestForm(false);
      setInfoRequestMessage('');
      setInfoRequestItems('');
      
      // Refresh data
      const [appRes, infoRes] = await Promise.all([
        applications.get(id),
        infoRequests.getForApplication(id)
      ]);
      setApplication(appRes.data);
      setInfoRequestList(infoRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe pyynnön lähetyksessä');
    } finally {
      setIsSendingInfoRequest(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!offerData.monthly_payment || !id) {
      toast.error('Täytä kuukausierä');
      return;
    }
    
    setIsSavingOffer(true);
    
    // DEMO MODE: Simulate offer creation
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newOffer = {
        id: Date.now(),
        application_id: id,
        financier_id: 1,
        financier_name: 'Rahoittaja Oy',
        monthly_payment: parseFloat(offerData.monthly_payment),
        term_months: parseInt(offerData.term_months),
        upfront_payment: offerData.upfront_payment ? parseFloat(offerData.upfront_payment) : 0,
        residual_value: offerData.residual_value ? parseFloat(offerData.residual_value) : 0,
        opening_fee: offerData.opening_fee ? parseFloat(offerData.opening_fee) : 0,
        invoice_fee: offerData.invoice_fee ? parseFloat(offerData.invoice_fee) : 0,
        status: 'PENDING_ADMIN',
        notes_to_customer: offerData.notes_to_customer || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Include application info for admin display
        application: application,
      };
      
      // Save to localStorage so admin can see it
      const storedOffers = JSON.parse(localStorage.getItem('demo-offers') || '[]');
      storedOffers.push(newOffer);
      localStorage.setItem('demo-offers', JSON.stringify(storedOffers));
      
      setOfferList([...offerList, newOffer as any]);
      
      // Update application status
      if (application) {
        const updatedApp = { ...application, status: 'OFFER_RECEIVED' };
        setApplication(updatedApp);
        
        // Update in localStorage
        const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
        const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
        if (appIndex >= 0) {
          storedApps[appIndex] = updatedApp;
          localStorage.setItem('demo-applications', JSON.stringify(storedApps));
        }
      }
      
      toast.success('Tarjous luotu ja lähetetty adminille hyväksyttäväksi');
      setShowOfferForm(false);
      setActiveTab('offer');
      setIsSavingOffer(false);
      return;
    }
    
    try {
      const { data: result, error } = await offers.create({
        application_id: id,
        monthly_payment: parseFloat(offerData.monthly_payment),
        term_months: parseInt(offerData.term_months),
        upfront_payment: offerData.upfront_payment ? parseFloat(offerData.upfront_payment) : undefined,
        residual_value: offerData.residual_value ? parseFloat(offerData.residual_value) : undefined,
        included_services: offerData.included_services || undefined,
        notes_to_customer: offerData.notes_to_customer || undefined,
        internal_notes: offerData.internal_notes || undefined
      });
      
      if (error) {
        console.error('Error creating offer:', error);
        toast.error('Virhe tarjouksen luomisessa');
        return;
      }
      
      toast.success('Tarjous luotu');
      setShowOfferForm(false);
      
      // Refresh
      const offersRes = await offers.getForApplication(id);
      setOfferList(offersRes.data);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Virhe tarjouksen luomisessa');
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleSendDocumentRequest = async () => {
    if (!id || !application) return;
    
    // Check at least one document type is selected
    const selectedDocs = Object.entries(documentTypes).filter(([_, v]) => v.selected);
    if (selectedDocs.length === 0) {
      toast.error('Valitse vähintään yksi liitetyyppi');
      return;
    }
    
    setIsSendingDocumentRequest(true);
    
    // DEMO MODE
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const documentLabels: Record<string, string> = {
        tilinpaatos: 'Tilinpäätös',
        tulosTase: 'Tulos ja tase ajot',
        kuvaKohteesta: 'Kuva kohteesta',
        urakkasopimus: 'Urakkasopimus',
        liiketoimintasuunnitelma: 'Liiketoimintasuunnitelma',
      };
      
      const requestedDocs = selectedDocs.map(([key, val]) => ({
        type: key,
        label: documentLabels[key],
        required: val.required,
      }));
      
      const newInfoRequest = {
        id: Date.now(),
        application_id: id,
        type: 'DOCUMENT_REQUEST',
        message: documentRequestMessage || 'Pyydämme seuraavia liitteitä luottopäätöstä varten:',
        documents: requestedDocs,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        sender: 'financier',
      };
      
      const storedInfoRequests = JSON.parse(localStorage.getItem('demo-info-requests') || '[]');
      storedInfoRequests.push(newInfoRequest);
      localStorage.setItem('demo-info-requests', JSON.stringify(storedInfoRequests));
      
      setInfoRequestList([...infoRequestList, newInfoRequest as any]);
      
      // Update application status to indicate documents requested
      const storedApps = JSON.parse(localStorage.getItem('demo-applications') || '[]');
      const appIndex = storedApps.findIndex((a: any) => String(a.id) === id);
      if (appIndex >= 0) {
        storedApps[appIndex].status = 'INFO_REQUESTED';
        localStorage.setItem('demo-applications', JSON.stringify(storedApps));
        setApplication({ ...application, status: 'INFO_REQUESTED' });
      }
      
      toast.success('Liitepyyntö lähetetty asiakkaalle!');
      setShowDocumentRequest(false);
      setIsSendingDocumentRequest(false);
      
      // Reset form
      setDocumentTypes({
        tilinpaatos: { selected: false, required: false },
        tulosTase: { selected: false, required: false },
        kuvaKohteesta: { selected: false, required: false },
        urakkasopimus: { selected: false, required: false },
        liiketoimintasuunnitelma: { selected: false, required: false },
      });
      setDocumentRequestMessage('');
      return;
    }
    
    // API call for production
    try {
      await infoRequests.create(id, {
        message: documentRequestMessage,
        items: Object.entries(documentTypes)
          .filter(([_, v]) => v.selected)
          .map(([key, val]) => `${key}:${val.required ? 'required' : 'optional'}`)
          .join(',')
      });
      toast.success('Liitepyyntö lähetetty');
      setShowDocumentRequest(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe pyynnön lähetyksessä');
    } finally {
      setIsSendingDocumentRequest(false);
    }
  };

  const handleSendOffer = async (offerId: number) => {
    try {
      await offers.send(offerId);
      toast.success('Tarjous lähetetty asiakkaalle');
      
      // Refresh
      const [appRes, offersRes] = await Promise.all([
        applications.get(id!),
        offers.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setOfferList(offersRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe tarjouksen lähetyksessä');
    }
  };

  const handleCreateContract = async (data: ContractCreateData, logoFile?: File) => {
    if (!id) return;
    
    setIsCreatingContract(true);
    
    // DEMO MODE: Simulate contract creation
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const acceptedOffer = offerList.find(o => o.status === 'ACCEPTED');
      
      const newContract: Contract = {
        id: Date.now(),
        application_id: id,
        contract_number: `KNT-SOP-${Date.now().toString().slice(-6)}`,
        status: 'DRAFT',
        lessor_company_name: 'Rahoittaja Oy',
        lessor_business_id: '1234567-8',
        lessor_address: 'Rahoittajankatu 1',
        lessor_city: 'Helsinki',
        lessor_postal_code: '00100',
        lessee_company_name: application?.company_name || '',
        lessee_business_id: application?.business_id || '',
        lessee_address: data.lessee_address || '',
        lessee_city: data.lessee_city || '',
        lessee_postal_code: data.lessee_postal_code || '',
        equipment_description: application?.equipment_description || '',
        equipment_value: application?.equipment_price || 0,
        lease_period_months: acceptedOffer?.term_months || 36,
        monthly_rent: acceptedOffer?.monthly_payment || 0,
        advance_payment: acceptedOffer?.upfront_payment || 0,
        residual_value: acceptedOffer?.residual_value || 0,
        processing_fee: 300,
        arrangement_fee: 9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Save to localStorage
      const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
      storedContracts.push(newContract);
      localStorage.setItem('demo-contracts', JSON.stringify(storedContracts));
      
      setContractList([...contractList, newContract]);
      toast.success('Sopimus luotu! Lähetä se asiakkaalle allekirjoitettavaksi.');
      setShowContractForm(false);
      setIsCreatingContract(false);
      return;
    }
    
    try {
      const response = await contracts.create(data);
      
      // Upload logo if provided
      if (logoFile) {
        await contracts.uploadLogo(response.data.id, logoFile);
      }
      
      toast.success('Sopimus luotu');
      setShowContractForm(false);
      
      // Refresh
      const contractsRes = await contracts.getForApplication(id);
      setContractList(contractsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe sopimuksen luomisessa');
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handlePrintContract = (contract: Contract) => {
    setPreviewContract(contract);
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
                .pagebreak { page-break-before: always; }
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
      setPreviewContract(null);
    }, 100);
  };

  const handleSendContract = async (contractId: number) => {
    // DEMO MODE: Simulate contract sending
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-token-')) {
      // Update contract status in localStorage
      const storedContracts = JSON.parse(localStorage.getItem('demo-contracts') || '[]');
      const contractIndex = storedContracts.findIndex((c: any) => c.id === contractId);
      if (contractIndex >= 0) {
        storedContracts[contractIndex].status = 'SENT';
        storedContracts[contractIndex].sent_at = new Date().toISOString();
        localStorage.setItem('demo-contracts', JSON.stringify(storedContracts));
        
        // Update local state
        setContractList(prev => prev.map(c => 
          c.id === contractId ? { ...c, status: 'SENT', sent_at: new Date().toISOString() } : c
        ));
      }
      
      // Update application status
      if (application) {
        const updatedApp = { ...application, status: 'CONTRACT_SENT' };
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
      
      toast.success('Sopimus lähetetty asiakkaalle allekirjoitettavaksi!');
      return;
    }
    
    try {
      await contracts.send(contractId);
      toast.success('Sopimus lähetetty asiakkaalle');
      
      // Refresh
      const [appRes, contractsRes] = await Promise.all([
        applications.get(id!),
        contracts.getForApplication(id!)
      ]);
      setApplication(appRes.data);
      setContractList(contractsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Virhe sopimuksen lähetyksessä');
    }
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
        <Link to="/financier/applications" className="btn-primary mt-4">
          Takaisin hakemuksiin
        </Link>
      </div>
    );
  }

  const draftOffer = offerList.find(o => o.status === 'DRAFT');
  const sentOffer = offerList.find(o => o.status === 'SENT');
  const acceptedOffer = offerList.find(o => o.status === 'ACCEPTED');
  const draftContract = contractList.find(c => c.status === 'DRAFT');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/financier/applications"
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
              {application.company_name} • {getApplicationTypeLabel(application.application_type)}
            </p>
          </div>
        </div>
      </div>

      {/* Action banners based on status */}
      {application.status === 'SUBMITTED_TO_FINANCIER' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Uusi hakemus käsiteltävänä</p>
                <p className="text-orange-700 text-sm mt-1">
                  Tarkista hakemuksen tiedot ja tee tarjous tai pyydä lisätietoja.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setActiveTab('messages');
                  setShowInfoRequestForm(true);
                }}
                className="btn bg-white border border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Pyydä lisätietoja
              </button>
              <button
                onClick={() => {
                  setShowOfferForm(true);
                  setActiveTab('offer');
                }}
                className="btn-primary bg-orange-600 hover:bg-orange-700"
              >
                <Euro className="w-4 h-4 mr-2" />
                Tee tarjous
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {application.status === 'OFFER_ACCEPTED' && !contractList.some(c => c.status !== 'DRAFT') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900">Tarjous hyväksytty!</p>
                <p className="text-purple-700 text-sm mt-1">
                  Asiakas <strong>{application.contact_person || application.company_name}</strong> on hyväksynyt tarjouksen.
                </p>
                <p className="text-purple-600 text-xs mt-1">
                  Pyydä asiakkaalta tarvittavat liitteet luottopäätöstä varten.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDocumentRequest(!showDocumentRequest)}
              className="btn-primary bg-purple-600 hover:bg-purple-700"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              {showDocumentRequest ? 'Sulje' : 'Tee luottopäätös'}
            </button>
          </div>
          
          {/* Document request form */}
          {showDocumentRequest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-purple-200 pt-4 mt-4"
            >
              <h4 className="font-semibold text-purple-900 mb-3">Pyydä liitteitä luottopäätöstä varten</h4>
              <p className="text-sm text-purple-700 mb-4">Valitse pyydettävät liitteet ja merkitse pakolliset:</p>
              
              <div className="space-y-3 mb-4">
                {[
                  { key: 'tilinpaatos', label: 'Tilinpäätös' },
                  { key: 'tulosTase', label: 'Tulos ja tase ajot' },
                  { key: 'kuvaKohteesta', label: 'Kuva kohteesta' },
                  { key: 'urakkasopimus', label: 'Urakkasopimus' },
                  { key: 'liiketoimintasuunnitelma', label: 'Liiketoimintasuunnitelma' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-100">
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={documentTypes[key as keyof typeof documentTypes].selected}
                        onChange={(e) => setDocumentTypes(prev => ({
                          ...prev,
                          [key]: { ...prev[key as keyof typeof prev], selected: e.target.checked }
                        }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-3"
                      />
                      <span className="text-slate-800">{label}</span>
                    </label>
                    {documentTypes[key as keyof typeof documentTypes].selected && (
                      <label className="flex items-center text-sm text-purple-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={documentTypes[key as keyof typeof documentTypes].required}
                          onChange={(e) => setDocumentTypes(prev => ({
                            ...prev,
                            [key]: { ...prev[key as keyof typeof prev], required: e.target.checked }
                          }))}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                        />
                        Pakollinen
                      </label>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-900 mb-1">Viesti asiakkaalle (valinnainen)</label>
                <textarea
                  value={documentRequestMessage}
                  onChange={(e) => setDocumentRequestMessage(e.target.value)}
                  placeholder="Esim. lisätietoja pyynnöstä..."
                  className="input min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDocumentRequest(false)}
                  className="btn-ghost"
                >
                  Peruuta
                </button>
                <button
                  onClick={handleSendDocumentRequest}
                  disabled={isSendingDocumentRequest}
                  className="btn-primary bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSendingDocumentRequest ? 'Lähetetään...' : 'Lähetä lisätietopyyntö'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Hakemuksen tiedot', icon: FileText },
            { id: 'offer', label: 'Tarjous', icon: Euro },
            { id: 'contract', label: 'Sopimus', icon: FileCheck },
            { id: 'messages', label: 'Viestit', icon: MessageSquare, count: infoRequestList.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
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
            {/* Excel-like Application Data Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-semibold text-white">Hakemuksen tiedot</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-40 border-r border-slate-200">Tyyppi</td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={`inline-flex items-center ${application.application_type === 'LEASING' ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {application.application_type === 'LEASING' ? <TrendingUp className="w-4 h-4 mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          {getApplicationTypeLabel(application.application_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-40 border-r border-l border-slate-200">Status</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Kohde</td>
                      <td className="px-4 py-3 font-semibold text-midnight-900" colSpan={3}>{application.equipment_description}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Hankintahinta</td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold text-emerald-700">{formatCurrency(application.equipment_price)}</span>
                        <span className="text-slate-500 ml-1">alv 0%</span>
                      </td>
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-l border-slate-200">Toivottu kausi</td>
                      <td className="px-4 py-3 font-semibold">{application.requested_term_months ? `${application.requested_term_months} kk` : '-'}</td>
                    </tr>
                    {(application as any).downpayment_amount > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Käsiraha</td>
                        <td className="px-4 py-3 font-semibold text-midnight-900">{formatCurrency((application as any).downpayment_amount)} alv 0%</td>
                        <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-l border-slate-200">Rahoitettava</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(application.equipment_price - ((application as any).downpayment_amount || 0))} alv 0%</td>
                      </tr>
                    )}
                    {application.equipment_supplier && (
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Toimittaja</td>
                        <td className="px-4 py-3 font-semibold" colSpan={3}>{application.equipment_supplier}</td>
                      </tr>
                    )}
                    {(application as any).link_to_item && (
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Linkki kohteeseen</td>
                        <td className="px-4 py-3" colSpan={3}>
                          <a href={(application as any).link_to_item} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline font-medium">
                            {(application as any).link_to_item}
                          </a>
                        </td>
                      </tr>
                    )}
                    {application.additional_info && (
                      <tr>
                        <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 align-top">Lisätiedot</td>
                        <td className="px-4 py-3 text-midnight-900" colSpan={3}>{application.additional_info}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Excel-like Company Data Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-semibold text-white">Yrityksen tiedot</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-40 border-r border-slate-200">Yritys</td>
                      <td className="px-4 py-3 font-bold text-midnight-900">{application.company_name}</td>
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 w-40 border-r border-l border-slate-200">Y-tunnus</td>
                      <td className="px-4 py-3 font-mono font-semibold text-midnight-900">{application.business_id}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Yhteyshenkilö</td>
                      <td className="px-4 py-3 font-semibold text-midnight-900">{application.contact_person || '-'}</td>
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-l border-slate-200">Puhelin</td>
                      <td className="px-4 py-3 font-semibold text-midnight-900">{application.contact_phone || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200">Sähköposti</td>
                      <td className="px-4 py-3" colSpan={3}>
                        <a href={`mailto:${application.contact_email}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                          {application.contact_email}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* YTJ/PRH Company Data */}
            {application.extra_data?.ytj_data && (
              <YTJInfoCard ytjData={application.extra_data.ytj_data as CompanyInfo} />
            )}

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-midnight-900 mb-4">Toiminnot</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setActiveTab('messages');
                    setShowInfoRequestForm(true);
                  }}
                  className="btn-secondary"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Pyydä lisätietoja
                </button>
                {!offerList.length && (
                  <button
                    onClick={() => {
                      setShowOfferForm(true);
                      setActiveTab('offer');
                    }}
                    className="btn-primary"
                  >
                    <Euro className="w-4 h-4 mr-2" />
                    Tee tarjous
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offer' && (
          <div className="space-y-4">
            {/* Create offer button */}
            {!offerList.length && !showOfferForm && (
              <button
                onClick={() => setShowOfferForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Luo uusi tarjous
              </button>
            )}

            {/* Offer form */}
            {showOfferForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-2 border-emerald-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-midnight-900">Uusi tarjous</h3>
                    <p className="text-sm text-slate-600">{application.company_name}</p>
                  </div>
                  <button onClick={() => setShowOfferForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Kohteen tiedot */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-slate-700 mb-2">Kohteen tiedot:</p>
                  <div className="text-sm text-slate-600">
                    <p><strong>Kauppasumma:</strong> {formatCurrency(application.equipment_price)} alv 0 %</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="label">Käsiraha (€) alv 0 %</label>
                    <input
                      type="number"
                      value={offerData.upfront_payment}
                      onChange={(e) => setOfferData({ ...offerData, upfront_payment: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                    {offerData.upfront_payment && application.equipment_price && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Rahoitettava osuus: {formatCurrency(application.equipment_price - parseFloat(offerData.upfront_payment || '0'))} alv 0 %
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Kk-maksu (€) alv 0 % *</label>
                    <input
                      type="number"
                      value={offerData.monthly_payment}
                      onChange={(e) => setOfferData({ ...offerData, monthly_payment: e.target.value })}
                      className="input"
                      placeholder="2500"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Sopimusaika (kk) *</label>
                    <select
                      value={offerData.term_months}
                      onChange={(e) => setOfferData({ ...offerData, term_months: e.target.value })}
                      className="input"
                    >
                      <option value="12">12 kk</option>
                      <option value="24">24 kk</option>
                      <option value="36">36 kk</option>
                      <option value="48">48 kk</option>
                      <option value="60">60 kk</option>
                      <option value="72">72 kk</option>
                      <option value="84">84 kk</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Jäännösarvo (€) - näytetään %:na</label>
                    <input
                      type="number"
                      value={offerData.residual_value}
                      onChange={(e) => setOfferData({ ...offerData, residual_value: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                    {offerData.residual_value && application.equipment_price && (
                      <p className="text-xs text-emerald-600 mt-1">
                        = {((parseFloat(offerData.residual_value) / application.equipment_price) * 100).toFixed(1)} % kauppasummasta
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Avausmaksu (€) alv 0 %</label>
                    <input
                      type="number"
                      value={offerData.opening_fee}
                      onChange={(e) => setOfferData({ ...offerData, opening_fee: e.target.value })}
                      className="input"
                      placeholder="300"
                    />
                  </div>
                  <div>
                    <label className="label">Laskutuslisä (€/kk)</label>
                    <input
                      type="number"
                      value={offerData.invoice_fee}
                      onChange={(e) => setOfferData({ ...offerData, invoice_fee: e.target.value })}
                      className="input"
                      placeholder="9"
                    />
                  </div>
                </div>

                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="label mb-3">Lisäpalvelut / Huomiot</label>
                  
                  {/* Insurance checkbox */}
                  <div className="flex items-start space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="insuranceByLessee"
                      checked={insuranceByLessee}
                      onChange={(e) => setInsuranceByLessee(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5"
                    />
                    <label htmlFor="insuranceByLessee" className="text-sm text-slate-700 leading-relaxed">
                      Vuokrakohde tullaan vakuuttamaan vuokralleottajan kustannuksella. 
                      Vakuutuksen hinta lisätään edellämainittuihin veloituksiin.
                    </label>
                  </div>
                  
                  {/* Customer's own insurance field - shown when checkbox is unchecked */}
                  {!insuranceByLessee && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-yellow-800 font-medium">⚠️ Asiakas hoitaa vakuutuksen itse</p>
                      </div>
                      <label className="label">Asiakkaan oma vakuutus</label>
                      <input
                        type="text"
                        value={customerOwnInsurance}
                        onChange={(e) => setCustomerOwnInsurance(e.target.value)}
                        className="input"
                        placeholder="Esim. vakuutusyhtiö ja vakuutusnumero"
                      />
                    </motion.div>
                  )}
                  
                  {/* Additional services text */}
                  <div className="mt-4">
                    <label className="label">Muut lisäpalvelut</label>
                    <textarea
                      value={offerData.included_services}
                      onChange={(e) => setOfferData({ ...offerData, included_services: e.target.value })}
                      className="input min-h-[60px]"
                      placeholder="Esim. huolto, ylläpito..."
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label">Viesti asiakkaalle</label>
                  <textarea
                    value={offerData.notes_to_customer}
                    onChange={(e) => setOfferData({ ...offerData, notes_to_customer: e.target.value })}
                    className="input min-h-[80px]"
                    placeholder="Tervehdys ja lisätiedot asiakkaalle..."
                  />
                </div>

                <div className="mb-6">
                  <label className="label">Sisäiset muistiinpanot (vain rahoittajalle)</label>
                  <textarea
                    value={offerData.internal_notes}
                    onChange={(e) => setOfferData({ ...offerData, internal_notes: e.target.value })}
                    className="input min-h-[60px]"
                    placeholder="Sisäiset huomiot..."
                  />
                </div>

                {/* Tarjouksen esikatselu */}
                <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800 mb-3">Tarjouksen yhteenveto:</p>
                  <div className="text-sm text-emerald-900 space-y-1">
                    <p>Kauppasumma: <strong>{formatCurrency(application.equipment_price)}</strong> alv 0 %</p>
                    <p>Käsiraha: <strong>{formatCurrency(parseFloat(offerData.upfront_payment || '0'))}</strong> alv 0 %</p>
                    <p>Rahoitettava osuus: <strong>{formatCurrency(application.equipment_price - parseFloat(offerData.upfront_payment || '0'))}</strong> alv 0 %</p>
                    <p>Kk-maksu: <strong>{formatCurrency(parseFloat(offerData.monthly_payment || '0'))}</strong> alv 0 %</p>
                    <p>Sopimusaika: <strong>{offerData.term_months} kk</strong></p>
                    <p>Avausmaksu: <strong>{formatCurrency(parseFloat(offerData.opening_fee || '300'))}</strong> alv 0 %</p>
                    <p>Laskutuslisä: <strong>{offerData.invoice_fee || '9'} €/kk</strong></p>
                    {offerData.residual_value && application.equipment_price && (
                      <p>Jäännösarvo: <strong>{((parseFloat(offerData.residual_value) / application.equipment_price) * 100).toFixed(1)} %</strong></p>
                    )}
                  </div>
                  <p className="text-xs text-emerald-700 mt-3 italic">Hintoihin lisätään voimassa oleva arvonlisävero</p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowOfferForm(false)} className="btn-ghost">
                    Peruuta
                  </button>
                  <button onClick={handleCreateOffer} disabled={isSavingOffer} className="btn-primary">
                    <Send className="w-4 h-4 mr-2" />
                    {isSavingOffer ? 'Lähetetään...' : 'Luo ja lähetä tarjous'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Existing offers */}
            {offerList.length === 0 && !showOfferForm ? (
              <div className="card text-center py-12">
                <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei tarjouksia</h3>
                <p className="text-slate-500">Luo tarjous hakemukselle.</p>
              </div>
            ) : (
              offerList.map((offer) => (
                <div key={offer.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-midnight-900">
                        {offer.status === 'DRAFT' ? 'Tarjouksen luonnos' : 'Tarjous'}
                      </h4>
                      <p className="text-sm text-slate-600">{application.company_name}</p>
                    </div>
                    <span className={`badge ${
                      offer.status === 'DRAFT' ? 'badge-gray' :
                      offer.status === 'PENDING_ADMIN' ? 'badge-orange' :
                      offer.status === 'SENT' ? 'badge-blue' :
                      offer.status === 'ACCEPTED' ? 'badge-green' : 'badge-red'
                    }`}>
                      {getOfferStatusLabel(offer.status)}
                    </span>
                  </div>

                  {/* Tarjouksen tiedot */}
                  <div className="bg-slate-50 rounded-xl p-5 mb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Kauppasumma:</span>
                        <span className="font-semibold text-midnight-900">{formatCurrency(application.equipment_price)} alv 0 %</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Käsiraha:</span>
                        <span className="font-semibold text-midnight-900">{formatCurrency(offer.upfront_payment || 0)} alv 0 %</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Rahoitettava osuus:</span>
                        <span className="font-semibold text-midnight-900">{formatCurrency(application.equipment_price - (offer.upfront_payment || 0))} alv 0 %</span>
                      </div>
                      <hr className="my-2 border-slate-200" />
                      <div className="flex justify-between">
                        <span className="text-slate-600">Kk-maksu:</span>
                        <span className="font-bold text-emerald-700 text-lg">{formatCurrency(offer.monthly_payment)} alv 0 %</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Sopimusaika:</span>
                        <span className="font-semibold text-midnight-900">{offer.term_months} kk</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Avausmaksu:</span>
                        <span className="font-semibold text-midnight-900">300 € alv 0 %</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Laskutuslisä:</span>
                        <span className="font-semibold text-midnight-900">9 €/kk</span>
                      </div>
                      {offer.residual_value && application.equipment_price && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Jäännösarvo:</span>
                          <span className="font-semibold text-midnight-900">
                            {((offer.residual_value / application.equipment_price) * 100).toFixed(1)} %
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-3 italic">Hintoihin lisätään voimassa oleva arvonlisävero</p>
                  </div>

                  {offer.included_services && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-1">Lisäpalvelut:</p>
                      <p className="text-sm text-slate-600">{offer.included_services}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    {/* Print button */}
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
                              
                              ${offer.included_services ? `
                              <div class="section">
                                <div class="section-title">Lisäpalvelut</div>
                                <div class="info-box">${offer.included_services}</div>
                              </div>
                              ` : ''}

                              ${offer.notes_to_customer ? `
                              <div class="section">
                                <div class="section-title">Lisätiedot asiakkaalle</div>
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

                    {offer.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendOffer(offer.id)}
                        className="btn-primary"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Lähetä tarjous Kantama adminiin
                      </button>
                    )}
                  </div>
                  
                  {offer.status === 'PENDING_ADMIN' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                      <p className="text-orange-700">
                        Tarjous on lähetetty adminille. Saat ilmoituksen kun tarjous on lähetetty asiakkaalle.
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="space-y-4">
            {/* Create contract button */}
            {application.status === 'OFFER_ACCEPTED' && !contractList.length && !showContractForm && (
              <button
                onClick={() => setShowContractForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tee sopimus
              </button>
            )}

            {/* Contract form */}
            {showContractForm && application && (
              <ContractForm
                application={application}
                acceptedOffer={acceptedOffer || null}
                onSubmit={handleCreateContract}
                onCancel={() => setShowContractForm(false)}
                isSubmitting={isCreatingContract}
              />
            )}

            {/* Existing contracts */}
            {contractList.length === 0 && !showContractForm ? (
              <div className="card text-center py-12">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei sopimuksia</h3>
                <p className="text-slate-500">
                  {application.status === 'OFFER_ACCEPTED'
                    ? 'Luo sopimus hyväksytylle tarjoukselle.'
                    : 'Sopimus voidaan luoda kun tarjous on hyväksytty.'}
                </p>
              </div>
            ) : (
              contractList.map((contract) => (
                <div key={contract.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-midnight-900">
                        Sopimus {contract.contract_number}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {contract.lessee_company_name} • {contract.lease_period_months} kk
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
                        <span className="text-slate-500 block">Vuokraerä</span>
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(contract.monthly_rent || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sopimuskausi</span>
                        <span className="font-semibold">{contract.lease_period_months} kk</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Jäännösarvo</span>
                        <span className="font-semibold">{formatCurrency(contract.residual_value || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ennakkovuokra</span>
                        <span className="font-semibold">{formatCurrency(contract.advance_payment || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-500 mb-4">
                    Luotu: {formatDateTime(contract.created_at)}
                    {contract.sent_at && ` • Lähetetty: ${formatDateTime(contract.sent_at)}`}
                    {contract.signed_at && ` • Allekirjoitettu: ${formatDateTime(contract.signed_at)}`}
                  </div>

                  <div className="flex justify-between items-center">
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

                    {contract.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendContract(contract.id)}
                        className="btn-primary"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Lähetä sopimus asiakkaalle: {application.contact_person || application.company_name}
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
                  {showContractModal.status === 'DRAFT' && (
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 rounded-b-xl">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            handleSendContract(showContractModal.id);
                            setShowContractModal(null);
                          }}
                          className="btn-primary"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Lähetä sopimus asiakkaalle: {application.contact_person || application.company_name}
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
            {/* New info request button */}
            <button
              onClick={() => setShowInfoRequestForm(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Uusi lisätietopyyntö
            </button>

            {/* Info request form */}
            {showInfoRequestForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-2 border-yellow-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-midnight-900">Pyydä lisätietoja</h3>
                  <button onClick={() => setShowInfoRequestForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="label">Viesti asiakkaalle *</label>
                  <textarea
                    value={infoRequestMessage}
                    onChange={(e) => setInfoRequestMessage(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="Kuvaile mitä tietoja tarvitaan..."
                  />
                </div>

                <div className="mb-4">
                  <label className="label">Pyydetyt dokumentit (yksi per rivi)</label>
                  <textarea
                    value={infoRequestItems}
                    onChange={(e) => setInfoRequestItems(e.target.value)}
                    className="input min-h-[80px]"
                    placeholder="Tilinpäätös 2024&#10;Tarjous toimittajalta&#10;..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowInfoRequestForm(false)} className="btn-ghost">
                    Peruuta
                  </button>
                  <button onClick={handleSendInfoRequest} disabled={isSendingInfoRequest} className="btn-primary">
                    <Send className="w-4 h-4 mr-2" />
                    {isSendingInfoRequest ? 'Lähetetään...' : 'Lähetä pyyntö'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Existing info requests */}
            {infoRequestList.length === 0 ? (
              <div className="card text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-midnight-900 mb-2">Ei viestejä</h3>
                <p className="text-slate-500">Lisätietopyynnöt näkyvät tässä.</p>
              </div>
            ) : (
              infoRequestList.map((ir) => (
                <div key={ir.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-midnight-900">Lisätietopyyntö</h4>
                    <span className={`badge ${
                      ir.status === 'PENDING' ? 'badge-yellow' :
                      ir.status === 'RESPONDED' ? 'badge-green' : 'badge-gray'
                    }`}>
                      {ir.status === 'PENDING' ? 'Odottaa' :
                       ir.status === 'RESPONDED' ? 'Vastattu' : 'Suljettu'}
                    </span>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-4">
                    <p className="text-yellow-800">{ir.message}</p>
                    {ir.requested_items && ir.requested_items.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-yellow-700">
                        {ir.requested_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-yellow-600 mt-2">{formatDateTime(ir.created_at)}</p>
                  </div>

                  {ir.responses && ir.responses.length > 0 && (
                    <div className="space-y-2">
                      {ir.responses.map((resp: any) => (
                        <div key={resp.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-600">
                              Asiakas: {resp.user?.first_name || resp.user?.email || 'Asiakas'}
                            </span>
                            <span className="text-xs text-blue-500">{formatDateTime(resp.created_at)}</span>
                          </div>
                          <p className="text-blue-800">{resp.message}</p>
                          {/* Show attachments if any */}
                          {resp.attachments && resp.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <p className="text-sm font-medium text-blue-700 mb-2">📎 Liitetyt tiedostot:</p>
                              <ul className="space-y-2">
                                {resp.attachments.map((att: any, i: number) => (
                                  <li key={i} className="flex items-center justify-between bg-white rounded-lg p-2 border border-blue-100">
                                    <div className="flex items-center text-sm text-blue-600">
                                      <FileText className="w-4 h-4 mr-2" />
                                      <span className="font-medium">{att.filename}</span>
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      {att.type === 'tilinpaatos' ? 'Tilinpäätös' :
                                       att.type === 'tulosTase' ? 'Tulos ja tase' :
                                       att.type === 'kuvaKohteesta' ? 'Kuva kohteesta' :
                                       att.type === 'urakkasopimus' ? 'Urakkasopimus' :
                                       att.type === 'liiketoimintasuunnitelma' ? 'Liiketoimintasuunnitelma' :
                                       att.type}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-blue-500 mt-2 italic">
                                ℹ️ Demo-tilassa tiedostoja ei voi ladata. Tuotantoversiossa tiedostot ovat ladattavissa.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


