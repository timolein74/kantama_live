import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://juurirahoitus.fi/set-password',
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Virhe salasanan palautuksessa');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-midnight-900 mb-4">
            Tarkista sähköpostisi
          </h1>
          <p className="text-slate-600 mb-6">
            Lähetimme salasanan palautuslinkin osoitteeseen <strong>{email}</strong>. 
            Linkki on voimassa 1 tunnin.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Etkö saanut viestiä? Tarkista roskaposti-kansio.
          </p>
          <Link
            to="/login"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Takaisin kirjautumiseen
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <h1 className="text-2xl font-bold text-midnight-900 text-center mb-2">
          Unohditko salasanan?
        </h1>
        <p className="text-slate-600 text-center mb-8">
          Syötä sähköpostiosoitteesi niin lähetämme sinulle palautuslinkin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sähköposti
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@yritys.fi"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Lähetetään...' : 'Lähetä palautuslinkki'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Takaisin kirjautumiseen
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
