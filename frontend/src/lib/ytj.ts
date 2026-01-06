/**
 * YTJ (Yritys- ja yhteisötietojärjestelmä) API Integration
 * PRH Open Data API v3: https://avoindata.prh.fi/opendata-ytj-api/v3
 * 
 * Uses corsproxy.io to avoid CORS issues
 */

const YTJ_API_V3 = 'https://avoindata.prh.fi/opendata-ytj-api/v3/companies';

// CORS proxy wrapper - uses corsproxy.io
// Note: corsproxy.io expects the URL as-is after the ?
async function fetchWithCorsProxy(url: string): Promise<Response> {
  const proxyUrl = `https://corsproxy.io/?${url}`;
  console.log('Fetching via CORS proxy:', proxyUrl);
  return fetch(proxyUrl);
}

export interface YTJCompanySearchResult {
  businessId: string;
  name: string;
  registrationDate: string;
  companyForm: string;
}

export interface YTJAddress {
  street: string;
  postCode: string;
  city: string;
  country: string;
}

export interface YTJCompanyDetails {
  businessId: string;
  name: string;
  registrationDate: string;
  companyForm: string;
  companyFormCode: string;
  businessLine: string;
  businessLineCode: string;
  liquidations: any[];
  addresses: YTJAddress[];
  contactDetails: {
    phone?: string;
    email?: string;
    website?: string;
  };
  registeredEntries: any[];
  auxiliaryNames: string[];
  status: string;
  raw: any; // Full raw response
}

/**
 * Parse company name from v3 API names array
 */
function parseCompanyName(names: any[]): string {
  if (!names || names.length === 0) return '';
  // Type 1 = official name, find the one without endDate
  const currentName = names.find((n: any) => n.type === 1 && !n.endDate) || names[0];
  return currentName?.name || '';
}

/**
 * Search companies by name (autocomplete)
 * Returns results after 3+ characters
 * PRH v3 API uses 'name' parameter
 */
export async function searchCompanies(query: string): Promise<YTJCompanySearchResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    // v3 API uses 'name' parameter for search
    const url = `${YTJ_API_V3}?name=${encodeURIComponent(query)}`;
    console.log('YTJ search URL:', url);
    const response = await fetchWithCorsProxy(url);

    if (!response.ok) {
      console.error('YTJ API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('YTJ search response:', data);

    // v3 API returns companies in 'companies' array
    const companies = data.companies || data.results || [];
    
    if (companies.length === 0) {
      return [];
    }

    // v3 API structure: businessId is an object with 'value' property
    // names is an array of name objects
    const queryLower = query.toLowerCase();
    
    const results = companies.map((company: any) => {
      const businessIdValue = typeof company.businessId === 'object' 
        ? company.businessId.value 
        : company.businessId;
      
      const companyName = Array.isArray(company.names) 
        ? parseCompanyName(company.names)
        : company.name || '';

      const regDate = typeof company.businessId === 'object'
        ? company.businessId.registrationDate
        : company.registrationDate || '';

      return {
        businessId: businessIdValue || '',
        name: companyName,
        registrationDate: regDate,
        companyForm: ''
      };
    }).filter((c: YTJCompanySearchResult) => c.name && c.businessId);
    
    // Sort results: companies starting with query first, then alphabetically
    results.sort((a: YTJCompanySearchResult, b: YTJCompanySearchResult) => {
      const aStartsWith = a.name.toLowerCase().startsWith(queryLower);
      const bStartsWith = b.name.toLowerCase().startsWith(queryLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.name.localeCompare(b.name, 'fi');
    });
    
    return results.slice(0, 10);
  } catch (error) {
    console.error('YTJ search error:', error);
    return [];
  }
}

/**
 * Get full company details by Y-tunnus (business ID)
 */
export async function getCompanyDetails(businessId: string): Promise<YTJCompanyDetails | null> {
  if (!businessId) {
    return null;
  }

  try {
    // v3 API uses businessId query parameter
    const url = `${YTJ_API_V3}?businessId=${encodeURIComponent(businessId)}`;
    const response = await fetchWithCorsProxy(url);

    if (!response.ok) {
      console.error('YTJ API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('YTJ details response:', data);

    // v3 API returns companies in 'companies' array
    const companies = data.companies || data.results || [];
    if (companies.length === 0) {
      return null;
    }

    const company = companies[0];

    // Parse businessId (v3 returns it as object with 'value')
    const businessIdValue = typeof company.businessId === 'object' 
      ? company.businessId.value 
      : company.businessId;

    // Parse company name from names array
    const companyName = Array.isArray(company.names) 
      ? parseCompanyName(company.names)
      : company.name || '';

    // Parse registration date
    const registrationDate = typeof company.businessId === 'object'
      ? company.businessId.registrationDate
      : company.registrationDate || '';

    // Parse addresses (v3 format)
    const addresses: YTJAddress[] = [];
    if (company.addresses && company.addresses.length > 0) {
      for (const addr of company.addresses) {
        // v3 doesn't have endDate in same way
        const postOffice = Array.isArray(addr.postOffices) && addr.postOffices.length > 0
          ? (typeof addr.postOffices[0] === 'object' ? addr.postOffices[0].name : addr.postOffices[0])
          : '';
        
        addresses.push({
          street: `${addr.street || ''} ${addr.buildingNumber || ''}`.trim(),
          postCode: addr.postCode || '',
          city: postOffice || '',
          country: 'FI'
        });
      }
    }

    // Parse contact details
    const contactDetails: YTJCompanyDetails['contactDetails'] = {};
    if (company.contactDetails && company.contactDetails.length > 0) {
      for (const contact of company.contactDetails) {
        if (!contact.endDate) {
          if (contact.type === 'Puhelin' || contact.type === 'Matkapuhelin') {
            contactDetails.phone = contact.value;
          } else if (contact.type === 'Kotisivun www-osoite') {
            contactDetails.website = contact.value;
          }
        }
      }
    }

    // Parse business line (v3: mainBusinessLine)
    let businessLine = '';
    let businessLineCode = '';
    if (company.mainBusinessLine) {
      businessLineCode = company.mainBusinessLine.type || '';
      businessLine = company.mainBusinessLine.descriptions || '';
    }

    // Parse company form (v3 format)
    let companyForm = '';
    let companyFormCode = '';
    if (company.companyForms && company.companyForms.length > 0) {
      const currentForm = company.companyForms[0];
      if (currentForm) {
        companyFormCode = currentForm.type || '';
        // Try to get description from descriptions array
        if (Array.isArray(currentForm.descriptions)) {
          companyForm = currentForm.descriptions[0]?.name || currentForm.descriptions[0] || '';
        }
      }
    }

    // Parse auxiliary names from names array (type !== 1)
    const auxiliaryNames: string[] = [];
    if (Array.isArray(company.names)) {
      for (const nameObj of company.names) {
        if (nameObj.type !== 1 && !nameObj.endDate) {
          auxiliaryNames.push(nameObj.name);
        }
      }
    }

    // Determine status from companySituations
    let status = 'Aktiivinen';
    if (company.companySituations && company.companySituations.length > 0) {
      status = 'Selvitystilassa';
    }
    // Also check tradeRegisterStatus
    if (company.tradeRegisterStatus === '2') {
      status = 'Poistettu rekisteristä';
    }

    return {
      businessId: businessIdValue,
      name: companyName,
      registrationDate,
      companyForm,
      companyFormCode,
      businessLine,
      businessLineCode,
      liquidations: company.companySituations || [],
      addresses,
      contactDetails,
      registeredEntries: company.registeredEntries || [],
      auxiliaryNames,
      status,
      raw: company
    };
  } catch (error) {
    console.error('YTJ details error:', error);
    return null;
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: YTJAddress): string {
  const parts = [address.street, `${address.postCode} ${address.city}`.trim()].filter(Boolean);
  return parts.join(', ');
}

/**
 * Check if company has active liquidation or bankruptcy
 */
export function hasActiveLiquidation(details: YTJCompanyDetails): boolean {
  return details.liquidations.some((liq: any) => liq.endDate === null);
}

