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
  // TARJOUKSET
  {
    keywords: ['tarjous', 'tarjoukset', 'offer', 'tarjouksen'],
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
        return [{ label: 'Katso tarjous', icon: <Euro className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // SOPIMUS
  {
    keywords: ['sopimus', 'allekirjoitus', 'allekirjoita', 'contract', 'sopimuksen'],
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
        return [{ label: 'Avaa sopimus', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // HAKEMUS JA TILA
  {
    keywords: ['hakemus', 'hakemukset', 'tila', 'status', 'missä', 'vaihe', 'hakemuksen', 'eteneminen', 'tilanne'],
    answer: (ctx) => {
      if (ctx.applications.length === 0) {
        return 'Sinulla ei ole vielä hakemuksia. Voit tehdä uuden hakemuksen etusivulta!';
      }
      const statuses = ctx.applications.map(a => `• ${a.company_name}: ${getStatusLabel(a.status)}`).join('\n');
      return `Hakemustesi tilanne:\n\n${statuses}\n\nKlikkaa hakemusta nähdäksesi lisätiedot.`;
    },
    actions: (ctx, nav) => [{ label: 'Näytä hakemukset', icon: <FileText className="w-4 h-4" />, action: () => nav('/dashboard'), variant: 'primary' }]
  },
  // DOKUMENTIT JA LIITTEET
  {
    keywords: ['lisätiedot', 'dokumentit', 'liite', 'liitteet', 'tiedosto', 'tilinpäätös', 'paperit', 'asiakirjat'],
    answer: (ctx) => {
      const infoRequested = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (infoRequested) {
        return `Rahoittaja on pyytänyt lisätietoja hakemukseesi "${infoRequested.company_name}"! 📎\n\nAvaa hakemus ja lähetä pyydetyt dokumentit "Viestit"-välilehdeltä.`;
      }
      return 'Voit lähettää lisädokumentteja hakemuksesi "Viestit"-välilehdeltä. Tyypillisesti tarvittavia dokumentteja ovat:\n\n• Tilinpäätös\n• Henkilötodistus\n• Kuva kohteesta\n• Urakkasopimus (tarvittaessa)';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (app) {
        return [{ label: 'Lähetä dokumentit', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // YRITYSTIEDOT JA YTJ
  {
    keywords: ['yritys', 'ytj', 'tiedot', 'y-tunnus', 'yrityksen'],
    answer: (ctx) => {
      if (ctx.ytjData) {
        const ytj = ctx.ytjData;
        return `Yrityksesi tiedot YTJ:stä:\n\n🏢 ${ytj.name || ctx.companyName}\n📍 ${ytj.address || 'Osoite ei saatavilla'}\n🏭 Toimiala: ${ytj.industry || 'Ei tiedossa'}\n📅 Perustettu: ${ytj.registrationDate || 'Ei tiedossa'}\n\nNämä tiedot haetaan automaattisesti Patentti- ja rekisterihallituksen YTJ-palvelusta.`;
      }
      return `Yritystietosi (${ctx.companyName}) haetaan automaattisesti YTJ:stä hakemuksen yhteydessä. Tiedot sisältävät yrityksen perustiedot, osoitteen ja toimialan.`;
    }
  },
  // LUOTTOPÄÄTÖS
  {
    keywords: ['luottopäätös', 'luotto', 'päätös', 'hyväksyntä', 'luoton'],
    answer: (ctx) => {
      const creditPending = ctx.applications.find(a => a.status === 'CREDIT_DECISION_PENDING');
      if (creditPending) {
        return `Luottopäätös on käsittelyssä! ⏳\n\nSaat tiedon päätöksestä sähköpostiisi. Käsittelyaika on yleensä 1-3 arkipäivää.`;
      }
      return 'Luottopäätös tehdään kun olet hyväksynyt tarjouksen ja toimittanut tarvittavat dokumentit. Päätös perustuu yrityksen taloustietoihin ja luottokelpoisuuteen.';
    }
  },
  // MAKSUT JA HINNOITTELU
  {
    keywords: ['maksu', 'kuukausi', 'erä', 'hinta', 'kuukausierä', 'maksaa', 'paljonko', 'kustannus'],
    answer: (ctx) => {
      return 'Kuukausierä määräytyy rahoitettavan summan, sopimuskauden ja jäännösarvon mukaan. Näet tarkan kuukausierän tarjouksessa. Tyypillisesti erä sisältää:\n\n• Pääoman lyhennys\n• Korko\n• Mahdollinen laskutuslisä (n. 9€/kk)\n\nALV 25,5% lisätään kuukausierään.';
    }
  },
  // LEASING
  {
    keywords: ['leasing', 'lea', 'vuokraus', 'mitä', 'mikä', 'rahoitus'],
    answer: (ctx) => {
      return 'Leasing on rahoitusmuoto, jossa vuokraat laitteen tai koneen sovituksi ajaksi kiinteällä kuukausierällä.\n\n✅ Ei sido pääomaa\n✅ Kiinteä kuukausierä\n✅ Sopimuskauden päätyttyä voit lunastaa, palauttaa tai jatkaa\n\nSopii erityisesti yrityksille, jotka haluavat pitää käyttöpääoman vapaana.';
    }
  },
  // TAKAISINVUOKRAUS / SALE-LEASEBACK
  {
    keywords: ['takaisinvuokraus', 'slb', 'sale-leaseback', 'sale', 'myy', 'omistan'],
    answer: (ctx) => {
      return 'Takaisinvuokraus (Sale-Leaseback) tarkoittaa, että myyt omistamasi koneen tai laitteen rahoitusyhtiölle ja vuokraat sen takaisin.\n\n💰 Vapautat pääomaa kassaan\n✅ Jatkat kohteen käyttöä normaalisti\n✅ Kiinteä kuukausierä\n\nSopii erinomaisesti käyttöpääoman vahvistamiseen!';
    }
  },
  // KÄSIRAHA JA ENNAKKO
  {
    keywords: ['käsiraha', 'ennakko', 'alkumaksu', 'omarahoitus', 'ennakkovuokra'],
    answer: (ctx) => {
      return 'Käsiraha (ennakkovuokra) on vapaaehtoinen alkumaksu, joka:\n\n• Pienentää rahoitettavaa summaa\n• Laskee kuukausierää\n• Voi parantaa rahoituksen ehtoja\n\nKäsiraha ei ole pakollinen - voit rahoittaa myös 100% kohteen arvosta.';
    }
  },
  // JÄÄNNÖSARVO
  {
    keywords: ['jäännösarvo', 'lunastus', 'osta', 'omaksi', 'loppu'],
    answer: (ctx) => {
      return 'Jäännösarvo on summa, jolla voit lunastaa kohteen itsellesi sopimuskauden päätyttyä.\n\n• Sovitaan etukäteen sopimusta tehdessä\n• Tyypillisesti 0-20% kohteen arvosta\n• Suurempi jäännösarvo = pienempi kuukausierä\n\nSopimuskauden päätyttyä voit myös palauttaa kohteen tai jatkaa sopimusta.';
    }
  },
  // SOPIMUSKAUSI
  {
    keywords: ['sopimuskausi', 'aika', 'kesto', 'kausi', 'pituus', 'kuinka kauan', 'kauanko'],
    answer: (ctx) => {
      return 'Sopimuskausi vaihtelee yleensä 24-72 kuukauden välillä.\n\n📅 Lyhyempi kausi (24-36 kk):\n• Suurempi kuukausierä\n• Nopeampi lunastus\n\n📅 Pidempi kausi (48-72 kk):\n• Pienempi kuukausierä\n• Sopii suuremmille investoinneille\n\nVoit valita yrityksellesi sopivimman vaihtoehdon!';
    }
  },
  // PROSESSI JA AIKATAULU
  {
    keywords: ['prosessi', 'miten', 'kuinka', 'toimii', 'kauanko', 'kestää', 'aikataulu', 'nopea'],
    answer: (ctx) => {
      return 'Rahoitusprosessi on nopea:\n\n1️⃣ Hakemus (5 min)\n2️⃣ Tarjous (1-2 arkipäivää)\n3️⃣ Hyväksyntä + dokumentit\n4️⃣ Luottopäätös (1-3 arkipäivää)\n5️⃣ Sopimus allekirjoitettavaksi\n6️⃣ Rahoitus aktivoituu!\n\nKokonaisuudessaan prosessi kestää tyypillisesti 3-7 arkipäivää.';
    }
  },
  // MITÄ RAHOITETAAN
  {
    keywords: ['kohde', 'laite', 'kone', 'rahoite', 'rahoitettav', 'auto', 'kuorma', 'traktori'],
    answer: (ctx) => {
      return 'Rahoitamme laajasti erilaisia koneita ja laitteita:\n\n🚛 Kuorma-autot ja ajoneuvot\n🚜 Maatalous- ja metsäkoneet\n🏗️ Rakennuskoneet\n🏭 Tuotantolaitteet\n💻 IT-laitteet\n\nJos et ole varma, kysy - arvioimme jokaisen hakemuksen tapauskohtaisesti!';
    }
  },
  // ASIAKASPALVELU JA YHTEYDENOTTO
  {
    keywords: ['yhteyttä', 'apu', 'ihminen', 'puhelin', 'soita', 'asiakaspalvelu', 'kontakti', 'sähköposti'],
    answer: (ctx) => {
      return 'Saat apua seuraavasti:\n\n💬 Viesti hakemuksen kautta (suositus!)\n📧 info@juurirahoitus.fi\n\nHakemuksen kautta lähetetty viesti on nopein tapa saada vastaus, koska rahoittaja näkee kaikki tietosi suoraan.';
    },
    actions: (ctx, nav) => {
      if (ctx.applications.length > 0) {
        return [{ label: 'Lähetä viesti', icon: <Mail className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${ctx.applications[0].id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // SEURAAVA VAIHE
  {
    keywords: ['seuraava', 'mitä nyt', 'teen', 'pitää', 'tehdä'],
    answer: (ctx) => {
      const app = ctx.applications[0];
      if (!app) return 'Sinulla ei ole vielä hakemusta. Tee uusi hakemus etusivulta!';
      
      switch (app.status) {
        case 'SUBMITTED':
          return 'Hakemuksesi on vastaanotettu! ✅\n\nSeuraavaksi rahoittaja käsittelee hakemuksesi ja lähettää tarjouksen. Tämä kestää yleensä 1-2 arkipäivää.';
        case 'OFFER_SENT':
          return 'Sinulla on tarjous odottamassa! 🎉\n\nSeuraavaksi:\n1. Tarkista tarjous\n2. Hyväksy ja hae luottopäätös\n3. Toimita pyydetyt dokumentit';
        case 'OFFER_ACCEPTED':
        case 'CREDIT_DECISION_PENDING':
          return 'Luottopäätös on käsittelyssä! ⏳\n\nSeuraavaksi:\n• Toimita pyydetyt dokumentit jos et ole vielä\n• Odota luottopäätöstä (1-3 arkipäivää)';
        case 'CONTRACT_SENT':
          return 'Sopimus odottaa allekirjoitustasi! 📝\n\nSeuraavaksi:\n1. Lataa ja tarkista sopimus\n2. Allekirjoita sähköisesti\n3. Rahoitus aktivoituu!';
        default:
          return `Hakemuksesi tila: ${getStatusLabel(app.status)}\n\nAvaa hakemus nähdäksesi lisätiedot ja seuraavat vaiheet.`;
      }
    },
    actions: (ctx, nav) => {
      if (ctx.applications.length > 0) {
        return [{ label: 'Avaa hakemus', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${ctx.applications[0].id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // TERVEHDYKSET
  {
    keywords: ['terve', 'moi', 'hei', 'hello', 'hyvää', 'päivää'],
    answer: (ctx) => `Hei ${ctx.userName}! 👋\n\nOlen Juuri-avustajasi. Tunnen yrityksesi ${ctx.companyName} ja hakemustesi tilanteen.\n\nMiten voin auttaa sinua tänään?`
  },
  // KIITOKSET
  {
    keywords: ['kiitos', 'thanks', 'ok', 'selvä', 'jees', 'hyvä'],
    answer: () => 'Ole hyvä! 😊 Olen täällä jos tarvitset lisäapua. Onnea rahoitushakemukseen!'
  },
  // ONGELMAT
  {
    keywords: ['ongelma', 'virhe', 'ei toimi', 'vika', 'bugi', 'jumissa'],
    answer: (ctx) => {
      return 'Jos kohtaat ongelmia, kokeile:\n\n1. Päivitä sivu (F5)\n2. Tyhjennä selaimen välimuisti\n3. Kokeile toisella selaimella\n\nJos ongelma jatkuu, lähetä viesti hakemuksesi kautta tai ota yhteyttä: info@juurirahoitus.fi';
    }
  },
  // TURVALLISUUS
  {
    keywords: ['turvalli', 'luotettav', 'tietoturv', 'yksityisyys', 'gdpr'],
    answer: () => {
      return 'Juuri Rahoitus on luotettava suomalainen rahoituskumppani.\n\n🔒 Turvallinen salattu yhteys (HTTPS)\n📋 Noudatamme EU:n tietosuoja-asetusta (GDPR)\n🇫🇮 Tiedot säilytetään Suomessa\n\nTietosi ovat turvassa meillä!';
    }
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
  
  // Contextual suggestions
  if (context.applications.some(a => a.status === 'OFFER_SENT')) {
    suggestions.push('• "Näytä tarjoukseni"');
  }
  if (context.applications.some(a => a.status === 'INFO_REQUESTED')) {
    suggestions.push('• "Mitä dokumentteja tarvitaan?"');
  }
  if (context.applications.some(a => a.status === 'CONTRACT_SENT')) {
    suggestions.push('• "Miten allekirjoitan sopimuksen?"');
  }
  
  // General suggestions
  suggestions.push('• "Missä hakemukseni on?"');
  suggestions.push('• "Mitä seuraavaksi?"');
  suggestions.push('• "Mitä on leasing?"');
  suggestions.push('• "Miten prosessi toimii?"');
  suggestions.push('• "Miten saan apua?"');
  
  // Add action button
  if (context.applications.length > 0) {
    defaultActions.push({ 
      label: 'Avaa hakemukseni', 
      icon: <FileText className="w-4 h-4" />, 
      action: () => navigate(`/dashboard/applications/${context.applications[0].id}`), 
      variant: 'primary' 
    });
  }
  
  return {
    answer: `Hyvä kysymys, ${context.userName}! 🤔\n\nVoit kysyä minulta esimerkiksi:\n\n${suggestions.slice(0, 5).join('\n')}\n\nTai kirjoita oma kysymyksesi alla olevaan kenttään.`,
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
      action: () => navigate(`/dashboard/applications/${offerPending.id}`),
      variant: 'primary'
    });
  }
  
  // Check for info requests
  const infoRequest = context.applications.find(a => a.status === 'INFO_REQUESTED');
  if (infoRequest) {
    suggestions.push({
      label: '📎 Lisätietoja pyydetty',
      action: () => navigate(`/dashboard/applications/${infoRequest.id}`),
      variant: 'primary'
    });
  }
  
  // Check for contracts
  const contractPending = context.applications.find(a => a.status === 'CONTRACT_SENT');
  if (contractPending) {
    suggestions.push({
      label: '📝 Sopimus odottaa',
      action: () => navigate(`/dashboard/applications/${contractPending.id}`),
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
