// YTJ API Proxy for CORS
// Edge runtime for better performance

export const config = {
  runtime: 'edge',
};

const YTJ_API_BASE = 'https://avoindata.prh.fi/bis/v1';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  const businessId = url.searchParams.get('businessId');

  try {
    let apiUrl: string;

    if (businessId) {
      // Fetch company details by business ID
      apiUrl = `${YTJ_API_BASE}/${encodeURIComponent(businessId)}`;
    } else if (name) {
      // Search companies by name
      apiUrl = `${YTJ_API_BASE}?name=${encodeURIComponent(name)}&resultsFrom=0&maxResults=10`;
    } else {
      return new Response(JSON.stringify({ error: 'Missing name or businessId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'YTJ API error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('YTJ proxy error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

