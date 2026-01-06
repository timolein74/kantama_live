// Supabase Edge Function: Lähetä sähköposti kun hakemuksen status muuttuu
// Deploy: supabase functions deploy notify-status-change

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface StatusChangePayload {
  type: 'UPDATE'
  table: 'applications'
  record: {
    id: string
    status: string
    contact_email: string
    company_name: string
    reference_number: string
  }
  old_record: {
    status: string
  }
}

const STATUS_MESSAGES: Record<string, { subject: string; message: string }> = {
  'PROCESSING': {
    subject: 'Hakemuksesi on käsittelyssä',
    message: 'Hakemuksesi on otettu käsittelyyn. Saat ilmoituksen kun päätös on tehty.',
  },
  'OFFER_SENT': {
    subject: 'Uusi tarjous saatavilla!',
    message: 'Olet saanut rahoitustarjouksen. Kirjaudu sisään nähdäksesi tarjouksen yksityiskohdat.',
  },
  'OFFER_ACCEPTED': {
    subject: 'Tarjous hyväksytty',
    message: 'Tarjouksesi on hyväksytty. Sopimusprosessi käynnistyy pian.',
  },
  'CONTRACT_SENT': {
    subject: 'Sopimus allekirjoitettavana',
    message: 'Sopimus on valmis allekirjoitettavaksi. Kirjaudu sisään allekirjoittaaksesi.',
  },
  'CONTRACT_SIGNED': {
    subject: 'Sopimus allekirjoitettu',
    message: 'Onnittelut! Sopimus on allekirjoitettu ja rahoitus on valmis.',
  },
  'REJECTED': {
    subject: 'Hakemuksen tila päivitetty',
    message: 'Hakemuksesi tila on päivittynyt. Kirjaudu sisään nähdäksesi lisätiedot.',
  },
}

serve(async (req) => {
  try {
    const payload: StatusChangePayload = await req.json()

    // Tarkista onko status muuttunut
    if (payload.old_record.status === payload.record.status) {
      return new Response(JSON.stringify({ message: 'Status not changed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const statusInfo = STATUS_MESSAGES[payload.record.status]
    if (!statusInfo) {
      return new Response(JSON.stringify({ message: 'No notification for this status' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Lähetä sähköposti Resend API:lla
    if (RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Juuri Rahoitus <noreply@juurirahoitus.fi>',
          to: payload.record.contact_email,
          subject: `${statusInfo.subject} - ${payload.record.reference_number}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Juuri Rahoitus</h1>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-top: 0;">${statusInfo.subject}</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                  Hei ${payload.record.company_name},
                </p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                  ${statusInfo.message}
                </p>
                <p style="color: #64748b; font-size: 14px;">
                  Hakemusnumero: <strong>${payload.record.reference_number}</strong>
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://juurirahoitus.fi/login" 
                     style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Kirjaudu sisään
                  </a>
                </div>
              </div>
              <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Juuri Rahoitus Oy | myynti@juurirahoitus.fi</p>
              </div>
            </div>
          `,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text())
      }
    }

    // Tallenna ilmoitus tietokantaan
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      // Hae käyttäjä sähköpostin perusteella
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', payload.record.contact_email)
        .single()

      if (profile) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: statusInfo.subject,
          message: statusInfo.message,
          type: 'APPLICATION_UPDATE',
          reference_id: payload.record.id,
          reference_type: 'APPLICATION',
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})


