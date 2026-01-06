const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_EkiyeJhb_AuQ4HwhGAcKPDGqZFuCdk29C';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { to, subject, type, customerName, applicationRef } = body;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML based on type
    const emailHtml = generateEmailTemplate(type, { customerName, applicationRef });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Juuri Rahoitus <noreply@juurirahoitus.fi>',
        to: [to],
        subject,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function generateEmailTemplate(type: string, data: { customerName?: string; applicationRef?: string }): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `;

  const buttonStyle = `
    display: inline-block;
    background-color: #10b981;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  `;

  switch (type) {
    case 'OFFER_SENT':
      return `
        <div style="${baseStyle}">
          <h2 style="color: #10b981;">Olet saanut alustavan rahoitustarjouksen!</h2>
          <p>Hei ${data.customerName || 'Asiakas'},</p>
          <p>Olet saanut alustavan rahoitustarjouksen hakemukseesi.</p>
          <p>Kirjaudu portaaliin tarkistaaksesi tarjouksen:</p>
          <p style="margin: 30px 0;">
            <a href="https://juurirahoitus.fi/dashboard" style="${buttonStyle}">Avaa portaali</a>
          </p>
          <p style="color: #666; font-size: 14px;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
        </div>
      `;

    case 'INFO_REQUEST':
      return `
        <div style="${baseStyle}">
          <h2 style="color: #f59e0b;">Lisätietopyyntö</h2>
          <p>Hei ${data.customerName || 'Asiakas'},</p>
          <p>Rahoittaja pyytää lisätietoja hakemukseesi liittyen.</p>
          <p>Kirjaudu portaaliin nähdäksesi pyynnön ja lähettääksesi tarvittavat tiedot:</p>
          <p style="margin: 30px 0;">
            <a href="https://juurirahoitus.fi/dashboard" style="${buttonStyle}">Avaa portaali</a>
          </p>
          <p style="color: #666; font-size: 14px;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
        </div>
      `;

    case 'CONTRACT_SENT':
      return `
        <div style="${baseStyle}">
          <h2 style="color: #10b981;">Sopimus valmiina!</h2>
          <p>Hei ${data.customerName || 'Asiakas'},</p>
          <p>Rahoitussopimus on valmis allekirjoitettavaksi.</p>
          <p>Kirjaudu portaaliin tarkastellaksesi ja allekirjoittaaksesi sopimuksen:</p>
          <p style="margin: 30px 0;">
            <a href="https://juurirahoitus.fi/dashboard" style="${buttonStyle}">Avaa portaali</a>
          </p>
          <p style="color: #666; font-size: 14px;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
        </div>
      `;

    case 'REJECTED':
      return `
        <div style="${baseStyle}">
          <h2 style="color: #6b7280;">Kiitos hakemuksestasi</h2>
          <p>Hei ${data.customerName || 'Asiakas'},</p>
          <p>Kiitos rahoitushakemuksestasi. Valitettavasti emme voi tällä hetkellä myöntää rahoitusta hakemuksellesi.</p>
          <p>Suosittelemme hakemaan uudelleen <strong>3 kuukauden kuluttua</strong> tai kun sinulla on tuoreemmat väliajot (tulos ja tase).</p>
          <p>Jos sinulla on kysyttävää, voit olla yhteydessä meihin portaalin kautta.</p>
          <p style="margin: 30px 0;">
            <a href="https://juurirahoitus.fi" style="${buttonStyle}">Juuri Rahoitus</a>
          </p>
          <p style="color: #666; font-size: 14px;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
        </div>
      `;

    default:
      return `
        <div style="${baseStyle}">
          <h2>Ilmoitus Juuri Rahoitukselta</h2>
          <p>Sinulla on uusi ilmoitus portaalissa.</p>
          <p style="margin: 30px 0;">
            <a href="https://juurirahoitus.fi/dashboard" style="${buttonStyle}">Avaa portaali</a>
          </p>
          <p style="color: #666; font-size: 14px;">Ystävällisin terveisin,<br>Juuri Rahoitus</p>
        </div>
      `;
  }
}
