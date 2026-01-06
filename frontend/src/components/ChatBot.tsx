import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// Simple Finnish Q&A knowledge base
const knowledgeBase: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['leasing', 'lea', 'vuokraus', 'mitä', 'mikä'],
    answer: 'Leasing on rahoitusmuoto, jossa vuokraat laitteen tai koneen sovituksi ajaksi kiinteällä kuukausierällä. Sopimuskauden päätyttyä voit lunastaa kohteen, palauttaa sen tai jatkaa sopimusta. Leasing sopii erityisesti yrityksille, jotka haluavat pitää käyttöpääoman vapaana.'
  },
  {
    keywords: ['takaisinvuokraus', 'slb', 'sale-leaseback', 'sale'],
    answer: 'Takaisinvuokraus (Sale-Leaseback) tarkoittaa, että myyt omistamasi koneen tai laitteen rahoitusyhtiölle ja vuokraat sen takaisin. Näin vapautat pääomaa kassaan ja jatkat kohteen käyttöä normaalisti. Sopii erinomaisesti käyttöpääoman vahvistamiseen.'
  },
  {
    keywords: ['hinta', 'maksu', 'kuukausi', 'kk', 'hinnasto', 'paljonko'],
    answer: 'Kuukausierä määräytyy kohteen arvon, sopimuskauden ja jäännösarvon mukaan. Tyypillisesti sopimuskausi on 24-72 kuukautta. Tee hakemus sivustollamme ja saat räätälöidyn tarjouksen nopeasti!'
  },
  {
    keywords: ['hakemu', 'hake', 'miten', 'kuinka', 'aloita', 'tee'],
    answer: 'Hakemuksen tekeminen on helppoa! 1) Täytä lomake etusivulla 2) Saat vahvistuslinkin sähköpostiin 3) Kirjaudu sisään ja seuraa hakemuksen etenemistä. Käsittelemme hakemukset nopeasti, usein jo saman päivän aikana.'
  },
  {
    keywords: ['kone', 'laite', 'kohde', 'rahoite', 'rahoitettav'],
    answer: 'Rahoitamme laajasti erilaisia koneita ja laitteita: maatalouskoneet, metsäkoneet, rakennuskoneet, kuorma-autot, työkoneet, tuotantolaitteet ja paljon muuta. Jos et ole varma, lähetä hakemus niin arvioimme tilanteen!'
  },
  {
    keywords: ['yritys', 'yrittäjä', 'toiminimi', 'oy', 'yhtiö'],
    answer: 'Palvelemme kaikkia yritysmuotoja: osakeyhtiöt, toiminimet, kommandiittiyhtiöt ja osuuskunnat. Yrityksen tulee olla rekisteröity Suomeen ja sillä tulee olla Y-tunnus.'
  },
  {
    keywords: ['aika', 'kesto', 'kausi', 'pituus', 'kuinka kauan'],
    answer: 'Sopimuskausi vaihtelee yleensä 24-72 kuukauden välillä. Lyhyempi kausi tarkoittaa suurempaa kuukausierää mutta nopeampaa lunastusta. Pidempi kausi pienentää kuukausierää. Voit valita yrityksellesi sopivimman vaihtoehdon.'
  },
  {
    keywords: ['jäännösarvo', 'lunastus', 'osta', 'omaksi'],
    answer: 'Jäännösarvo on summa, jolla voit lunastaa kohteen itsellesi sopimuskauden päätyttyä. Jäännösarvo sovitaan etukäteen ja se pienentää kuukausierää. Tyypillisesti jäännösarvo on 0-20% kohteen arvosta.'
  },
  {
    keywords: ['käsiraha', 'ensimmäinen', 'alkumaksu', 'omarahoitus'],
    answer: 'Käsiraha on vapaaehtoinen alkumaksu, joka pienentää rahoitettavaa summaa ja siten myös kuukausierää. Käsiraha ei ole pakollinen, mutta se voi parantaa rahoituksen ehtoja.'
  },
  {
    keywords: ['kirjaudu', 'login', 'sisään', 'salasana', 'tunnus'],
    answer: 'Kirjautuminen tapahtuu "Kirjaudu"-painikkeesta sivun yläkulmassa. Jos olet uusi asiakas, saat vahvistuslinkin sähköpostiisi hakemuksen lähettämisen jälkeen. Linkistä pääset asettamaan salasanan ja kirjautumaan.'
  },
  {
    keywords: ['yhteystied', 'puhelin', 'soita', 'sähköposti', 'email'],
    answer: 'Palvelemme ensisijaisesti verkkopalvelumme kautta! Kirjaudu sisään ja lähetä viesti suoraan hakemuksesi kautta. Näin saat nopeimman vastauksen ja kaikki viestit tallentuvat hakemukseesi.'
  },
  {
    keywords: ['turvalli', 'luotettav', 'tietoturv'],
    answer: 'Juuri Rahoitus on luotettava suomalainen rahoituskumppani. Käytämme turvallista salattua yhteyttä (HTTPS) ja noudatamme EU:n tietosuoja-asetusta (GDPR). Tietosi ovat turvassa.'
  },
  {
    keywords: ['terve', 'moi', 'hei', 'heippa', 'hello'],
    answer: 'Hei! 👋 Olen Juuri Rahoituksen virtuaaliassistentti. Voin auttaa sinua leasingiin ja takaisinvuokraukseen liittyvissä kysymyksissä. Kysy rohkeasti!'
  },
  {
    keywords: ['kiitos', 'thanks', 'ok', 'selvä'],
    answer: 'Ole hyvä! 😊 Jos sinulla tulee lisäkysymyksiä, autan mielelläni. Onnea rahoitushakemukseen!'
  }
];

function findAnswer(question: string): string {
  const q = question.toLowerCase();
  
  for (const item of knowledgeBase) {
    if (item.keywords.some(kw => q.includes(kw))) {
      return item.answer;
    }
  }
  
  return 'En täysin ymmärtänyt kysymystäsi. Voit kysyä minulta esimerkiksi:\n• Mitä on leasing?\n• Miten teen hakemuksen?\n• Mikä on takaisinvuokraus?\n• Miten kirjaudun sisään?\n\nTai lähetä hakemus, niin asiantuntijamme ovat yhteydessä!';
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'bot',
      content: 'Hei! 👋 Olen Juuri Rahoituksen virtuaaliassistentti. Miten voin auttaa sinua tänään?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const answer = findAnswer(input);
      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        content: answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  return (
    <>
      {/* Chat button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center ${isOpen ? 'hidden' : ''}`}
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Juuri Assistentti</p>
                  <p className="text-emerald-100 text-xs">Vastaa kysymyksiisi 24/7</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 shadow-sm border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

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
                  placeholder="Kirjoita kysymyksesi..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


