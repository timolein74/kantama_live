import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, type, customer_name, company_name, html } = await req.json();

    console.log('Received request:', { to, subject, type, customer_name, company_name });

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailHtml = html || '';
    
    if (!emailHtml) {
      const greeting = customer_name ? `Hei ${customer_name},` : 'Hei,';
      const companyInfo = company_name ? ` yrityksellenne ${company_name}` : '';
      
      switch (type) {
        case 'offer':
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Uusi tarjous${companyInfo}</h2>
              <p>${greeting}</p>
              <p>Olet saanut uuden rahoitustarjouksen Juuri Rahoituksen kautta.</p>
              <p>Kirjaudu portaaliin nähdäksesi tarjouksen tiedot ja vastataksesi siihen.</p>
              <a href="https://juurirahoitus.fi/login" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Kirjaudu portaaliin</a>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
          break;
        case 'info_request':
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Lisätietopyyntö${companyInfo}</h2>
              <p>${greeting}</p>
              <p>Hakemukseesi liittyen on pyydetty lisätietoja tai dokumentteja.</p>
              <p>Kirjaudu portaaliin nähdäksesi pyynnön ja vastataksesi siihen.</p>
              <a href="https://juurirahoitus.fi/login" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Kirjaudu portaaliin</a>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
          break;
        case 'message':
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Uusi viesti${companyInfo}</h2>
              <p>${greeting}</p>
              <p>Olet saanut uuden viestin hakemukseesi liittyen.</p>
              <p>Kirjaudu portaaliin nähdäksesi viestin.</p>
              <a href="https://juurirahoitus.fi/login" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Kirjaudu portaaliin</a>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
          break;
        case 'contract':
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Sopimus allekirjoitettavaksi${companyInfo}</h2>
              <p>${greeting}</p>
              <p>Rahoitussopimus on valmis allekirjoitettavaksi.</p>
              <p>Kirjaudu portaaliin allekirjoittaaksesi sopimuksen.</p>
              <a href="https://juurirahoitus.fi/login" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Kirjaudu portaaliin</a>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
          break;
        case 'rejected':
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Rahoituspäätös${companyInfo}</h2>
              <p>${greeting}</p>
              <p>Valitettavasti emme tällä kertaa voi tarjota rahoitusta hakemukseesi.</p>
              <p>Rahoituspäätös perustuu kokonaisarvioon, joka huomioi useita tekijöitä. Mikäli tilanteesi muuttuu, olet tervetullut hakemaan uudelleen.</p>
              <p>Kiitos mielenkiinnostasi Juuri Rahoitusta kohtaan.</p>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
          break;
        default:
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>${greeting}</p>
              <p>Sinulle on uusi ilmoitus Juuri Rahoituksesta.</p>
              <a href="https://juurirahoitus.fi/login" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Kirjaudu portaaliin</a>
              <p style="margin-top: 24px; color: #666;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
            </div>
          `;
      }
    }

    console.log('Sending email via Resend...');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Juuri Rahoitus <noreply@juurirahoitus.fi>',
        to: [to],
        subject: subject,
        html: emailHtml,
      }),
    });

    const data = await res.json();
    console.log('Resend response:', res.status, data);

    if (!res.ok) {
      console.error('Resend error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
