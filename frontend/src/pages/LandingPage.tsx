import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Check,
  FileText,
  Shield,
  Zap,
  TrendingUp,
  RefreshCw,
  Clock,
  Calculator,
  Loader2,
  Upload,
  X,
  Image,
} from 'lucide-react';

// Form schemas - ei salasanaa, vain hakemus
const leasingSchema = z.object({
  company_name: z.string().min(2, 'Yrityksen nimi vaaditaan'),
  business_id: z.string().regex(/^\d{7}-\d$/, 'Virheellinen Y-tunnus (muoto: 1234567-8)'),
  contact_email: z.string().email('Virheellinen sähköposti'),
  contact_phone: z.string().optional(),
  equipment_price: z.number().min(1000, 'Vähimmäissumma 1 000 €'),
  requested_term_months: z.number().optional(),
  additional_info: z.string().optional(),
  link_to_item: z.string().optional(),
  has_downpayment: z.boolean().optional(),
  downpayment_amount: z.number().optional(),
  honeypot: z.string().max(0, 'Bot detected'),
});

const saleLeasebackSchema = z.object({
  company_name: z.string().min(2, 'Yrityksen nimi vaaditaan'),
  business_id: z.string().regex(/^\d{7}-\d$/, 'Virheellinen Y-tunnus (muoto: 1234567-8)'),
  contact_email: z.string().email('Virheellinen sähköposti'),
  contact_phone: z.string().optional(),
  equipment_description: z.string().min(10, 'Kuvaa kohde tarkemmin'),
  registration_number: z.string().optional(),
  year_model: z.number().min(1990, 'Vuosimalli vaaditaan').max(new Date().getFullYear() + 1, 'Virheellinen vuosimalli'),
  hours: z.number().min(0).optional(),
  kilometers: z.number().min(0).optional(),
  current_value: z.number().min(1000, 'Vähimmäissumma 1 000 €'),
  requested_term_months: z.number().optional(),
  additional_info: z.string().optional(),
  honeypot: z.string().max(0, 'Bot detected'),
});

type LeasingFormData = z.infer<typeof leasingSchema>;
type SaleLeasebackFormData = z.infer<typeof saleLeasebackSchema>;

export default function LandingPage() {
  const [activeForm, setActiveForm] = useState<'leasing' | 'slb'>('leasing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasDownpayment, setHasDownpayment] = useState(false);
  const [slbFiles, setSlbFiles] = useState<File[]>([]);

  const leasingForm = useForm<LeasingFormData>({
    resolver: zodResolver(leasingSchema),
    defaultValues: {
      requested_term_months: 36,
      honeypot: '',
    },
  });

  const slbForm = useForm<SaleLeasebackFormData>({
    resolver: zodResolver(saleLeasebackSchema),
    defaultValues: {
      requested_term_months: 36,
      year_model: new Date().getFullYear() - 2,
      honeypot: '',
    },
  });

  // DEMO: Tallenna hakemus localStorageen
  const saveDemoApplication = (formData: LeasingFormData | SaleLeasebackFormData, type: 'LEASING' | 'SALE_LEASEBACK') => {
    const existing = JSON.parse(localStorage.getItem('demo-applications') || '[]');
    const newApp = {
      id: Date.now(),
      reference_number: `KNT-2024-${String(existing.length + 4).padStart(3, '0')}`,
      company_name: formData.company_name,
      business_id: formData.business_id,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone || '',
      equipment_price: 'equipment_price' in formData ? formData.equipment_price : formData.current_value,
      equipment_description: 'equipment_description' in formData ? formData.equipment_description : 'Leasing-kohde',
      application_type: type,
      type: type,
      status: 'SUBMITTED',
      requested_term_months: formData.requested_term_months || 36,
      additional_info: formData.additional_info || '',
      link_to_item: 'link_to_item' in formData ? formData.link_to_item || '' : '',
      downpayment_amount: 'downpayment_amount' in formData ? formData.downpayment_amount || 0 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    existing.push(newApp);
    localStorage.setItem('demo-applications', JSON.stringify(existing));
    return newApp;
  };

  const handleLeasingSubmit = async (data: LeasingFormData) => {
    if (data.honeypot) {
      toast.error('Virhe hakemuksen lähetyksessä');
      return;
    }
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // DEMO: Tallenna hakemus
    const newApp = saveDemoApplication(data, 'LEASING');
    console.log('Uusi hakemus tallennettu:', newApp);
    
    setSubmitted(true);
    toast.success('Hakemus lähetetty! Otamme yhteyttä pian.');
    setIsSubmitting(false);
  };

  const handleSLBSubmit = async (data: SaleLeasebackFormData) => {
    if (data.honeypot) {
      toast.error('Virhe hakemuksen lähetyksessä');
      return;
    }
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // DEMO: Tallenna hakemus
    const newApp = saveDemoApplication(data, 'SALE_LEASEBACK');
    console.log('Uusi hakemus tallennettu:', newApp);
    
    setSubmitted(true);
    toast.success('Hakemus lähetetty! Otamme yhteyttä pian.');
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-12 text-center max-w-lg shadow-2xl"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-midnight-900 mb-4">
            Kiitos hakemuksestasi!
          </h2>
          <p className="text-slate-600 mb-4">
            Hakemuksesi on vastaanotettu ja käsittelemme sen mahdollisimman pian.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <p className="text-blue-800 font-medium mb-2">
              📧 Tarkista sähköpostisi!
            </p>
            <p className="text-blue-700 text-sm mb-2">
              Saat sähköpostiisi vahvistuslinkin, jolla pääset kirjautumaan ja seuraamaan hakemuksesi etenemistä.
            </p>
            <p className="text-blue-600 text-xs">
              Otamme yhteyttä kun hakemuksesi on käsitelty.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="btn-primary w-full py-4 text-lg"
          >
            Sulje viesti
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-hero-pattern">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-Kantama-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-6">
                Yritysrahoitusta
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-Kantama-400 to-purple-400">
                  {' '}helposti
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-lg">
                Leasing ja Sale-Leaseback ratkaisut yrityksesi tarpeisiin. 
                Hae rahoitusta nopeasti ja helposti.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href="#forms"
                  className="btn-primary text-lg px-8 py-4"
                >
                  Hae rahoitusta
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
                <a
                  href="#how-it-works"
                  className="btn bg-white/10 text-white hover:bg-white/20 text-lg px-8 py-4"
                >
                  Näin se toimii
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { value: '50M€', label: 'Rahoitettu' },
                  { value: '500+', label: 'Asiakasta' },
                  { value: '24h', label: 'Vastausaika' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl md:text-3xl font-display font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Form card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              id="forms"
              className="scroll-mt-20"
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Form tabs */}
                <div className="flex">
                  <button
                    onClick={() => setActiveForm('leasing')}
                    className={`flex-1 py-4 text-center font-semibold transition-all ${
                      activeForm === 'leasing'
                        ? 'bg-efund-600 text-white'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 inline mr-2" />
                    Leasing
                  </button>
                  <button
                    onClick={() => setActiveForm('slb')}
                    className={`flex-1 py-4 text-center font-semibold transition-all ${
                      activeForm === 'slb'
                        ? 'bg-efund-600 text-white'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-5 h-5 inline mr-2" />
                    Sale-Leaseback
                  </button>
                </div>

                {/* Form content */}
                <div className="p-6 md:p-8">
                  {activeForm === 'leasing' ? (
                    <form onSubmit={leasingForm.handleSubmit(handleLeasingSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Yrityksen nimi *</label>
                          <input
                            {...leasingForm.register('company_name')}
                            className="input"
                            placeholder="Oy Yritys Ab"
                          />
                          {leasingForm.formState.errors.company_name && (
                            <p className="text-red-500 text-sm mt-1">
                              {leasingForm.formState.errors.company_name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="label">Y-tunnus *</label>
                          <input
                            {...leasingForm.register('business_id')}
                            className="input"
                            placeholder="1234567-8"
                          />
                          {leasingForm.formState.errors.business_id && (
                            <p className="text-red-500 text-sm mt-1">
                              {leasingForm.formState.errors.business_id.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Sähköposti *</label>
                          <input
                            {...leasingForm.register('contact_email')}
                            type="email"
                            className="input"
                            placeholder="email@yritys.fi"
                          />
                          {leasingForm.formState.errors.contact_email && (
                            <p className="text-red-500 text-sm mt-1">
                              {leasingForm.formState.errors.contact_email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="label">Puhelin</label>
                          <input
                            {...leasingForm.register('contact_phone')}
                            className="input"
                            placeholder="+358 40 123 4567"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Hankintahinta (€) alv 0% *</label>
                        <input
                          {...leasingForm.register('equipment_price', { valueAsNumber: true })}
                          type="number"
                          className="input"
                          placeholder="150000"
                        />
                        {leasingForm.formState.errors.equipment_price && (
                          <p className="text-red-500 text-sm mt-1">
                            {leasingForm.formState.errors.equipment_price.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasDownpayment}
                            onChange={(e) => setHasDownpayment(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-Kantama-600 focus:ring-Kantama-500"
                          />
                          <span className="text-sm text-slate-700">Haluan maksaa käsirahan</span>
                        </label>
                        {hasDownpayment && (
                          <div className="mt-2">
                            <label className="label">Käsirahan määrä (€) alv 0%</label>
                            <input
                              {...leasingForm.register('downpayment_amount', { valueAsNumber: true })}
                              type="number"
                              className="input"
                              placeholder="10000"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="label">Toivottu sopimuskausi</label>
                        <select
                          {...leasingForm.register('requested_term_months', { valueAsNumber: true })}
                          className="input"
                        >
                          <option value={24}>24 kk</option>
                          <option value={36}>36 kk</option>
                          <option value={48}>48 kk</option>
                          <option value={60}>60 kk</option>
                          <option value={72}>72 kk</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Linkki kohteeseen</label>
                        <input
                          {...leasingForm.register('link_to_item')}
                          className="input"
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label className="label">Lisätiedot kohteesta (jos ei ole myynti-ilmoitusta)</label>
                        <textarea
                          {...leasingForm.register('additional_info')}
                          className="input min-h-[100px]"
                          placeholder="Kerro kohteesta: merkki, malli, vuosimalli, käyttötunnit/km jne."
                        />
                      </div>

                      {/* Honeypot */}
                      <input
                        {...leasingForm.register('honeypot')}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-4 text-lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Lähetetään...
                          </>
                        ) : (
                          <>
                            Lähetä hakemus
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={slbForm.handleSubmit(handleSLBSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Yrityksen nimi *</label>
                          <input
                            {...slbForm.register('company_name')}
                            className="input"
                            placeholder="Oy Yritys Ab"
                          />
                          {slbForm.formState.errors.company_name && (
                            <p className="text-red-500 text-sm mt-1">
                              {slbForm.formState.errors.company_name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="label">Y-tunnus *</label>
                          <input
                            {...slbForm.register('business_id')}
                            className="input"
                            placeholder="1234567-8"
                          />
                          {slbForm.formState.errors.business_id && (
                            <p className="text-red-500 text-sm mt-1">
                              {slbForm.formState.errors.business_id.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Sähköposti *</label>
                          <input
                            {...slbForm.register('contact_email')}
                            type="email"
                            className="input"
                            placeholder="email@yritys.fi"
                          />
                          {slbForm.formState.errors.contact_email && (
                            <p className="text-red-500 text-sm mt-1">
                              {slbForm.formState.errors.contact_email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="label">Puhelin</label>
                          <input
                            {...slbForm.register('contact_phone')}
                            className="input"
                            placeholder="+358 40 123 4567"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Kohteen kuvaus *</label>
                        <textarea
                          {...slbForm.register('equipment_description')}
                          className="input min-h-[80px]"
                          placeholder="Esim. Volvo EC220E kaivinkone"
                        />
                        {slbForm.formState.errors.equipment_description && (
                          <p className="text-red-500 text-sm mt-1">
                            {slbForm.formState.errors.equipment_description.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label">Rekisterinumero</label>
                        <input
                          {...slbForm.register('registration_number')}
                          className="input"
                          placeholder="ABC-123"
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">Vuosimalli *</label>
                          <input
                            {...slbForm.register('year_model', { valueAsNumber: true })}
                            type="number"
                            className="input"
                            placeholder="2022"
                          />
                          {slbForm.formState.errors.year_model && (
                            <p className="text-red-500 text-sm mt-1">
                              {slbForm.formState.errors.year_model.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="label">Käyttötunnit</label>
                          <input
                            {...slbForm.register('hours', { valueAsNumber: true })}
                            type="number"
                            className="input"
                            placeholder="3500"
                          />
                        </div>
                        <div>
                          <label className="label">Kilometrit</label>
                          <input
                            {...slbForm.register('kilometers', { valueAsNumber: true })}
                            type="number"
                            className="input"
                            placeholder="120000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Kohteen arvo (€) *</label>
                        <input
                          {...slbForm.register('current_value', { valueAsNumber: true })}
                          type="number"
                          className="input"
                          placeholder="85000"
                        />
                        {slbForm.formState.errors.current_value && (
                          <p className="text-red-500 text-sm mt-1">
                            {slbForm.formState.errors.current_value.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label">Toivottu sopimuskausi</label>
                        <select
                          {...slbForm.register('requested_term_months', { valueAsNumber: true })}
                          className="input"
                        >
                          <option value={24}>24 kk</option>
                          <option value={36}>36 kk</option>
                          <option value={48}>48 kk</option>
                          <option value={60}>60 kk</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Lisätiedot</label>
                        <textarea
                          {...slbForm.register('additional_info')}
                          className="input min-h-[80px]"
                          placeholder="Kerro lisää kohteesta..."
                        />
                      </div>

                      {/* File upload */}
                      <div>
                        <label className="label">Kuvat ja tiedostot</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setSlbFiles(prev => [...prev, ...files]);
                            }}
                            className="hidden"
                            id="slb-file-upload"
                          />
                          <label
                            htmlFor="slb-file-upload"
                            className="flex flex-col items-center cursor-pointer py-2"
                          >
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-sm text-slate-600">
                              Klikkaa lisätäksesi kuvia tai tiedostoja
                            </span>
                            <span className="text-xs text-slate-400 mt-1">
                              Kuvat, PDF, Word (max 10MB / tiedosto)
                            </span>
                          </label>
                        </div>
                        {slbFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {slbFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  {file.type.startsWith('image/') ? (
                                    <Image className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-500" />
                                  )}
                                  <span className="text-sm text-slate-700 truncate max-w-[200px]">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    ({(file.size / 1024).toFixed(0)} KB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSlbFiles(prev => prev.filter((_, i) => i !== index))}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Honeypot */}
                      <input
                        {...slbForm.register('honeypot')}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-4 text-lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Lähetetään...
                          </>
                        ) : (
                          <>
                            Lähetä hakemus
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-midnight-900 mb-4">
              Näin se toimii
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Rahoituksen hakeminen on helppoa ja nopeaa
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: FileText,
                title: '1. Täytä hakemus',
                description: 'Täytä lyhyt hakulomake ja kerro rahoitustarpeestasi',
                color: 'from-blue-500 to-blue-700',
              },
              {
                icon: Clock,
                title: '2. Nopea käsittely',
                description: 'Käsittelemme hakemuksesi ja valmistelemme tarjouksen',
                color: 'from-indigo-500 to-indigo-700',
              },
              {
                icon: Calculator,
                title: '3. Saat tarjouksen',
                description: 'Saat räätälöidyn rahoitustarjouksen tarkasteltavaksi',
                color: 'from-purple-500 to-purple-700',
              },
              {
                icon: Check,
                title: '4. Allekirjoita',
                description: 'Allekirjoita sopimus sähköisesti ja rahoitus on valmis',
                color: 'from-emerald-500 to-emerald-700',
              },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-midnight-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
