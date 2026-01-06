import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Salasanan tulee olla vähintään 8 merkkiä')
    .regex(/[A-Z]/, 'Salasanassa tulee olla vähintään yksi iso kirjain')
    .regex(/[0-9]/, 'Salasanassa tulee olla vähintään yksi numero'),
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Salasanat eivät täsmää',
  path: ['password_confirm'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userRole, setUserRole] = useState<string>('CUSTOMER');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();

  // Get redirect URL from query params (default based on role)
  const getRedirectUrl = (role: string) => {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) return redirectParam;
    
    switch (role) {
      case 'ADMIN': return '/admin';
      case 'FINANCIER': return '/financier';
      default: return '/dashboard';
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    // Tarkista onko käyttäjä kirjautunut magic linkillä
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Kirjautumislinkki on vanhentunut. Pyydä uusi kutsu.');
        navigate('/');
        return;
      }

      // Get role from user metadata
      const role = session.user.user_metadata?.role || 'CUSTOMER';
      setUserRole(role);

      // Tarkista onko salasana jo asetettu (profiili on verified)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified, role')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_verified) {
        // Jo rekisteröitynyt - ohjaa oikeaan dashboardiin
        await checkAuth();
        navigate(getRedirectUrl(profile.role || role));
        return;
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [navigate, checkAuth, searchParams]);

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    
    try {
      // Aseta salasana
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });

      if (updateError) {
        throw updateError;
      }

      // Hae käyttäjätiedot
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const metadata = user.user_metadata || {};
        const role = metadata.role || userRole || 'CUSTOMER';
        
        // Tarkista onko profiili olemassa
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Luo profiili jos ei ole
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: role,
              first_name: metadata.first_name || metadata.contact_person || '',
              last_name: metadata.last_name || '',
              company_name: metadata.company_name || '',
              business_id: metadata.business_id || '',
              phone: metadata.phone || '',
              is_active: true,
              is_verified: true,
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        } else {
          // Päivitä olemassa oleva profiili
          await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);
        }

        // Päivitä auth state
        await checkAuth();

        toast.success('Salasana asetettu! Tervetuloa!');
        navigate(getRedirectUrl(existingProfile?.role || role));
      } else {
        throw new Error('Käyttäjätietoja ei löytynyt');
      }
    } catch (error: any) {
      console.error('Password set error:', error);
      toast.error(error.message || 'Virhe salasanan asettamisessa');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Tarkistetaan kirjautumista...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={40} />
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Luo salasana
          </h1>
          <p className="text-slate-600">
            Aseta salasana, jolla kirjaudut jatkossa sisään
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Salasana
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-12 ${
                  errors.password ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="Vähintään 8 merkkiä"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Vähintään 8 merkkiä
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Yksi iso kirjain
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Yksi numero
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vahvista salasana
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                {...register('password_confirm')}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-12 ${
                  errors.password_confirm ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="Kirjoita salasana uudelleen"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password_confirm && (
              <p className="mt-1 text-sm text-red-600">{errors.password_confirm.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Asetetaan...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Aseta salasana ja jatka
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}


