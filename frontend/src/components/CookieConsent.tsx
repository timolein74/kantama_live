import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      // Small delay before showing the banner
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Cookie className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Tämä sivusto käyttää evästeitä
                  </h3>
                </div>
                <button
                  onClick={handleDecline}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label="Sulje"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Käytämme evästeitä tarjoamamme sisällön ja mainosten räätälöimiseen, 
                  sosiaalisen median ominaisuuksien tukemiseen ja kävijämäärämme analysoimiseen. 
                  Lisäksi jaamme sosiaalisen median, mainosalan ja analytiikka-alan kumppaneillemme 
                  tietoja siitä, miten käytät sivustoamme. Kumppanimme voivat yhdistää näitä tietoja 
                  muihin tietoihin, joita olet antanut heille tai joita on kerätty, kun olet 
                  käyttänyt heidän palvelujaan.
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                  <Shield className="w-4 h-4" />
                  <span>
                    Lue lisää{' '}
                    <Link to="/tietosuoja" className="text-emerald-600 hover:underline">
                      tietosuojaselosteestamme
                    </Link>
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAccept}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-200"
                  >
                    Hyväksy kaikki evästeet
                  </button>
                  <button
                    onClick={handleDecline}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors"
                  >
                    Vain välttämättömät
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;
