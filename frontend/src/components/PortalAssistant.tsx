import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Bot, User, Sparkles, 
  FileText, HelpCircle, ArrowRight, Building2,
  Clock, CheckCircle, AlertCircle, Euro, Phone,
  Mail, ExternalLink, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { applications, offers } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCurrency, getStatusLabel } from '../lib/utils';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
}

interface QuickAction {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface UserContext {
  userName: string;
  companyName: string;
  applications: any[];
  ytjData: any;
  pendingActions: string[];
  currentPage: string;
}

// Contextual knowledge base - knows about portal features
const portalKnowledge: { keywords: string[]; answer: (ctx: UserContext) => string; actions?: (ctx: UserContext, nav: any) => QuickAction[] }[] = [
  {
    keywords: ['tarjous', 'tarjoukset', 'offer'],
    answer: (ctx) => {
      const pendingOffers = ctx.applications.filter(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
      if (pendingOffers.length > 0) {
        return `Sinulla on ${pendingOffers.length} tarjous odottamassa! 🎉\n\nTarjoukset löytyvät hakemuksesi "Tarjoukset"-välilehdeltä. Voit hyväksyä tarjouksen ja hakea virallisen luottopäätöksen.`;
      }
      return 'Tarjoukset näkyvät hakemuksesi "Tarjoukset"-välilehdellä kun rahoittaja on lähettänyt tarjouksen. Käsittelemme hakemukset yleensä 1-2 arkipäivän sisällä.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
      if (app) {
        return [{ label: 'Katso tarjous', icon: <Euro className="w-4 h-4" />, action: () => nav(`/customer/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  {
    keywords: ['sopimus', 'allekirjoitus', 'allekirjoita', 'contract'],
    answer: (ctx) => {
      const contractPending = ctx.applications.find(a => a.status === 'CONTRACT_SENT');
      if (contractPending) {
        return `Sopimus odottaa allekirjoitustasi! 📝\n\nLöydät sopimuksen hakemuksesi "Sopimukset"-välilehdeltä. Voit ladata PDF:n, tarkistaa ehdot ja hyväksyä sopimuksen allekirjoitettavaksi.`;
      }
      return 'Sopimus lähetetään sinulle kun olet hyväksynyt tarjouksen ja luottopäätös on tehty. Allekirjoitus tapahtuu sähköisesti Visma Sign -palvelun kautta.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'CONTRACT_SENT');
      if (app) {
        return [{ label: 'Avaa sopimus', icon: <FileText className="w-4 h-4" />, action: () => nav(`/customer/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  {
    keywords: ['hakemus', 'hakemukset', 'tila', 'status', 'missä', 'vaihe'],
    answer: (ctx) => {
      if (ctx.applications.length === 0) {
        return 'Sinulla ei ole vielä hakemuksia. Voit tehdä uuden hakemuksen etusivulta!';
      }
      const statuses = ctx.applications.map(a => `• ${a.company_name}: ${getStatusLabel(a.status)}`).join('\n');
      return `Hakemustesi tilanne:\n\n${statuses}\n\nKlikkaa hakemusta nähdäksesi lisätiedot.`;
    },
    actions: (ctx, nav) => [{ label: 'Näytä hakemukset', icon: <FileText className="w-4 h-4" />, action: () => nav('/customer'), variant: 'primary' }]
  },
  {
    keywords: ['lisätiedot', 'dokumentit', 'liite', 'liitteet', 'tiedosto'],
    answer: (ctx) => {
      const infoRequested = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (infoRequested) {
        return `Rahoittaja on pyytänyt lisätietoja hakemukseesi "${infoRequested.company_name}"! 📎\n\nAvaa hakemus ja lähetä pyydetyt dokumentit "Viestit"-välilehdeltä.`;
      }
      return 'Voit lähettää lisädokumentteja hakemuksesi "Viestit"-välilehdeltä. Tyypillisesti tarvittavia dokumentteja ovat tilinpäätös, henkilötodistus ja mahdolliset kauppakirjat.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (app) {
        return [{ label: 'Lähetä dokumentit', icon: <FileText className="w-4 h-4" />, action: () => nav(`/customer/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  {
    keywords: ['yritys', 'ytj', 'tiedot', 'y-tunnus'],
    answer: (ctx) => {
      if (ctx.ytjData) {
        const ytj = ctx.ytjData;
        return `Yrityksesi tiedot YTJ:stä:\n\n🏢 ${ytj.name || ctx.companyName}\n📍 ${ytj.address || 'Osoite ei saatavilla'}\n🏭 Toimiala: ${ytj.industry || 'Ei tiedossa'}\n📅 Perustettu: ${ytj.registrationDate || 'Ei tiedossa'}\n\nNämä tiedot haetaan automaattisesti Patentti- ja rekisterihallituksen YTJ-palvelusta.`;
      }
      return `Yritystietosi (${ctx.companyName}) haetaan automaattisesti YTJ:stä hakemuksen yhteydessä. Tiedot sisältävät yrityksen perustiedot, osoitteen ja toimialan.`;
    }
  },
  {
    keywords: ['luottopäätös', 'luotto', 'päätös', 'hyväksyntä'],
    answer: (ctx) => {
      const creditPending = ctx.applications.find(a => a.status === 'CREDIT_DECISION_PENDING');
      if (creditPending) {
        return `Luottopäätös on käsittelyssä! ⏳\n\nSaat tiedon päätöksestä sähköpostiisi. Käsittelyaika on yleensä 1-3 arkipäivää.`;
      }
      return 'Luottopäätös tehdään kun olet hyväksynyt tarjouksen ja toimittanut tarvittavat dokumentit. Päätös perustuu yrityksen taloustietoihin ja luottokelpoisuuteen.';
    }
  },
  {
    keywords: ['maksu', 'kuukausi', 'erä', 'hinta'],
    answer: (ctx) => {
      return 'Kuukausierä määräytyy rahoitettavan summan, sopimuskauden ja jäännösarvon mukaan. Näet tarkan kuukausierän tarjouksessa. Tyypillisesti erä sisältää:\n\n• Pääoman lyhennys\n• Korko\n• Mahdollinen laskutuslisä (n. 9€/kk)';
    }
  },
  {
    keywords: ['yhteyttä', 'apu', 'ihminen', 'puhelin', 'soita', 'asiakaspalvelu'],
    answer: (ctx) => {
      return 'Paras tapa saada apua on lähettää viesti hakemuksesi kautta - näin rahoittaja näkee kaikki tiedot ja voi vastata nopeasti.\n\nVoit myös lähettää sähköpostia osoitteeseen info@juurirahoitus.fi';
    },
    actions: (ctx, nav) => {
      if (ctx.applications.length > 0) {
        return [{ label: 'Lähetä viesti', icon: <Mail className="w-4 h-4" />, action: () => nav(`/customer/applications/${ctx.applications[0].id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  {
    keywords: ['terve', 'moi', 'hei', 'hello'],
    answer: (ctx) => `Hei ${ctx.userName}! 👋\n\nOlen Juuri-avustajasi. Tunnen yrityksesi ${ctx.companyName} ja hakemustesi tilanteen. Miten voin auttaa?`
  },
  {
    keywords: ['kiitos', 'thanks', 'ok'],
    answer: () => 'Ole hyvä! 😊 Olen täällä jos tarvitset lisäapua.'
  }
];

function findContextualAnswer(question: string, context: UserContext, navigate: any): { answer: string; actions: QuickAction[] } {
  const q = question.toLowerCase();
  
  for (const item of portalKnowledge) {
    if (item.keywords.some(kw => q.includes(kw))) {
      return {
        answer: item.answer(context),
        actions: item.actions ? item.actions(context, navigate) : []
      };
    }
  }
  
  // Default response with smart suggestions based on context
  const suggestions: string[] = [];
  const defaultActions: QuickAction[] = [];
  
  if (context.applications.some(a => a.status === 'OFFER_SENT')) {
    suggestions.push('• "Näytä tarjoukseni"');
  }
  if (context.applications.some(a => a.status === 'INFO_REQUESTED')) {
    suggestions.push('• "Mitä dokumentteja tarvitaan?"');
  }
  if (context.applications.some(a => a.status === 'CONTRACT_SENT')) {
    suggestions.push('• "Miten allekirjoitan sopimuksen?"');
  }
  
  suggestions.push('• "Missä hakemukseni on?"');
  suggestions.push('• "Miten saan apua?"');
  
  return {
    answer: `En täysin ymmärtänyt kysymystäsi, ${context.userName}. Kokeile esimerkiksi:\n\n${suggestions.join('\n')}`,
    actions: defaultActions
  };
}

// Generate smart suggestions based on user's current situation
function getSmartSuggestions(context: UserContext, navigate: any): QuickAction[] {
  const suggestions: QuickAction[] = [];
  
  // Check for pending offers
  const offerPending = context.applications.find(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
  if (offerPending) {
    suggestions.push({
      label: '🎉 Tarjous odottaa!',
      action: () => navigate(`/customer/applications/${offerPending.id}`),
      variant: 'primary'
    });
  }
  
  // Check for info requests
  const infoRequest = context.applications.find(a => a.status === 'INFO_REQUESTED');
  if (infoRequest) {
    suggestions.push({
      label: '📎 Lisätietoja pyydetty',
      action: () => navigate(`/customer/applications/${infoRequest.id}`),
      variant: 'primary'
    });
  }
  
  // Check for contracts
  const contractPending = context.applications.find(a => a.status === 'CONTRACT_SENT');
  if (contractPending) {
    suggestions.push({
      label: '📝 Sopimus odottaa',
      action: () => navigate(`/customer/applications/${contractPending.id}`),
      variant: 'primary'
    });
  }
  
  // Default suggestions if nothing pending
  if (suggestions.length === 0) {
    suggestions.push({
      label: 'Missä hakemukseni on?',
      action: () => {}, // Will trigger chat
      variant: 'secondary'
    });
    suggestions.push({
      label: 'Miten saan apua?',
      action: () => {},
      variant: 'secondary'
    });
  }
  
  return suggestions.slice(0, 3);
}

interface PortalAssistantProps {
  variant?: 'customer' | 'financier';
}

export default function PortalAssistant({ variant = 'customer' }: PortalAssistantProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext>({
    userName: '',
    companyName: '',
    applications: [],
    ytjData: null,
    pendingActions: [],
    currentPage: location.pathname
  });
  const [smartSuggestions, setSmartSuggestions] = useState<QuickAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user context
  useEffect(() => {
    const loadContext = async () => {
      if (!user || !isSupabaseConfigured()) return;
      
      try {
        // Get user's applications - pass email too since apps might be linked by email only
        const { data: apps } = await applications.list(user.id, 'CUSTOMER', user.email);
        
        // Get YTJ data from first application if available
        let ytjData = null;
        if (apps && apps.length > 0 && apps[0].ytj_data) {
          ytjData = apps[0].ytj_data;
        }
        
        // Build context
        const context: UserContext = {
          userName: user.first_name || user.email?.split('@')[0] || 'asiakas',
          companyName: apps?.[0]?.company_name || 'yrityksesi',
          applications: apps || [],
          ytjData,
          pendingActions: [],
          currentPage: location.pathname
        };
        
        // Calculate pending actions
        if (apps?.some((a: any) => a.status === 'INFO_REQUESTED')) {
          context.pendingActions.push('Lisätietoja pyydetty');
        }
        if (apps?.some((a: any) => a.status === 'OFFER_SENT')) {
          context.pendingActions.push('Tarjous odottaa');
        }
        if (apps?.some((a: any) => a.status === 'CONTRACT_SENT')) {
          context.pendingActions.push('Sopimus allekirjoitettavaksi');
        }
        
        setUserContext(context);
        setSmartSuggestions(getSmartSuggestions(context, navigate));
        
        // Set initial greeting
        setMessages([{
          id: 0,
          role: 'bot',
          content: getInitialGreeting(context),
          timestamp: new Date(),
          actions: getSmartSuggestions(context, navigate)
        }]);
        
      } catch (error) {
        console.error('Error loading assistant context:', error);
      }
    };
    
    loadContext();
  }, [user, location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getInitialGreeting = (ctx: UserContext): string => {
    const greetings = [];
    greetings.push(`Hei ${ctx.userName}! 👋`);
    
    if (ctx.pendingActions.length > 0) {
      greetings.push(`\nHuomasin että sinulla on odottavia toimenpiteitä:`);
      ctx.pendingActions.forEach(action => {
        greetings.push(`• ${action}`);
      });
      greetings.push('\nMiten voin auttaa?');
    } else if (ctx.applications.length > 0) {
      greetings.push(`\nNäen hakemuksesi yritykselle ${ctx.companyName}. Miten voin auttaa?`);
    } else {
      greetings.push('\nOlen Juuri-avustajasi. Miten voin auttaa sinua tänään?');
    }
    
    return greetings.join('\n');
  };

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Find contextual answer
    setTimeout(() => {
      const { answer, actions } = findContextualAnswer(messageText, userContext, navigate);
      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        content: answer,
        timestamp: new Date(),
        actions
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.label.includes('?')) {
      // It's a question - send as chat message
      handleSend(action.label);
    } else {
      // It's a navigation action
      action.action();
      setIsOpen(false);
    }
  };

  // Don't show on landing page
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center ${isOpen ? 'hidden' : ''}`}
      >
        <HelpCircle className="w-6 h-6" />
        {userContext.pendingActions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold animate-pulse">
            {userContext.pendingActions.length}
          </span>
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Juuri Avustaja</p>
                  <p className="text-emerald-100 text-xs flex items-center">
                    <span className="w-2 h-2 bg-green-300 rounded-full mr-1 animate-pulse"></span>
                    Tunnen tilanteesi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context banner if pending actions */}
            {userContext.pendingActions.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                <p className="text-amber-800 text-xs font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {userContext.pendingActions.length} odottavaa toimenpidettä
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 ml-2">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(action)}
                          className={`text-xs px-3 py-1.5 rounded-full flex items-center space-x-1 transition-all ${
                            action.variant === 'primary'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 shadow-sm border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && smartSuggestions.length > 0 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Pikatoiminnot:</p>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(suggestion)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        suggestion.variant === 'primary'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex space-x-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Kysy mitä vain..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
