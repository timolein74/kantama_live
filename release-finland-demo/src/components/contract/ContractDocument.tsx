import { forwardRef } from 'react';
import type { Contract, LeaseObject } from '../../types/contract';
import type { Application } from '../../types';

interface ContractDocumentProps {
  contract: Contract;
  application: Application;
  logoUrl?: string;
  showDeliveryConfirmation?: boolean;
}

/**
 * Professional financing lease contract document
 * Based on Finnish leasing contract standards
 * Clean, professional PDF-ready design
 */
const ContractDocument = forwardRef<HTMLDivElement, ContractDocumentProps>(
  ({ contract, application, logoUrl, showDeliveryConfirmation = true }, ref) => {
    const formatEuro = (value: number | null | undefined) => {
      if (value === null || value === undefined) return '€ 0,00';
      return `€ ${value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateFi = (date: string | null | undefined) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('fi-FI');
    };

    const leaseObjects: LeaseObject[] = contract.lease_objects || [];
    const today = new Date().toLocaleDateString('fi-FI');
    const contractNumber = contract.contract_number || 'XXXXXXXXXX';

    // Styles for print
    const tableStyle = {
      borderCollapse: 'collapse' as const,
      width: '100%',
    };

    const cellStyle = {
      border: '1px solid #374151',
      padding: '6px 10px',
      fontSize: '9pt',
      verticalAlign: 'top' as const,
    };

    const headerCellStyle = {
      ...cellStyle,
      backgroundColor: '#f3f4f6',
      fontWeight: 'bold' as const,
    };

    return (
      <div 
        ref={ref}
        className="bg-white text-gray-900"
        style={{ 
          fontFamily: 'Arial, Helvetica, sans-serif',
          width: '210mm', 
          minHeight: '297mm', 
          padding: '15mm 20mm',
          boxSizing: 'border-box',
          fontSize: '10pt',
          lineHeight: '1.4',
          color: '#1f2937'
        }}
      >
        {/* ===== PAGE 1: SOPIMUSETUSIVU ===== */}
        
        {/* HEADER */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '3px solid #1f2937'
        }}>
          {/* Logo and company name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Release Logo - SVG */}
            <svg viewBox="0 0 200 50" height="40" width="160" aria-label="Release">
              <text x="0" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">R</text>
              <text x="28" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#E31937">e</text>
              <text x="52" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">lease</text>
            </svg>
            <div>
              <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1f2937' }}>
                {contract.lessor_company_name || 'Release Finland Oy'}
              </div>
              {contract.lessor_business_id && (
                <div style={{ fontSize: '9pt', color: '#6b7280' }}>
                  Y-tunnus: {contract.lessor_business_id}
                </div>
              )}
            </div>
          </div>
          
          {/* Document title */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: '14pt', 
              fontWeight: 'bold', 
              color: '#1f2937',
              marginBottom: '5px'
            }}>
              Rahoitusleasingsopimus
            </div>
            <div style={{ 
              background: '#f3f4f6', 
              padding: '8px 15px', 
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              <div style={{ fontSize: '8pt', color: '#6b7280' }}>Sopimusnumero</div>
              <div style={{ 
                fontSize: '14pt', 
                fontWeight: 'bold', 
                fontFamily: 'Monaco, Consolas, monospace',
                letterSpacing: '1px'
              }}>
                {contractNumber}
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT NUMBER BOX */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '9pt' }}>
            <tbody>
              <tr>
                <td style={{ 
                  ...headerCellStyle, 
                  padding: '4px 8px',
                  fontSize: '8pt'
                }}>
                  Sopimusnumero
                </td>
                {contractNumber.split('').map((char, i) => (
                  <td key={i} style={{ 
                    ...cellStyle, 
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontWeight: 'bold',
                    width: '22px'
                  }}>
                    {char}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* VUOKRALLEOTTAJA */}
        <table style={{ ...tableStyle, marginBottom: '15px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                VUOKRALLEOTTAJA
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, width: '50%' }}>
                <span style={{ color: '#6b7280' }}>Nimi: </span>
                <strong>{contract.lessee_company_name}</strong>
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Y-tunnus: </span>
                <span style={{ fontFamily: 'monospace' }}>{contract.lessee_business_id}</span>
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Katuosoite: </span>
                {contract.lessee_street_address}
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Postinumero ja -toimipaikka: </span>
                {contract.lessee_postal_code} {contract.lessee_city}
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Yhteyshenkilö: </span>
                {contract.lessee_contact_person}
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Puhelinnumero: </span>
                {contract.lessee_phone}
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Sähköpostiosoite: </span>
                {contract.lessee_email}
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Verotusmaa: </span>
                {contract.lessee_tax_country || 'Suomi'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* VUOKRALLEANTAJA */}
        <table style={{ ...tableStyle, marginBottom: '15px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                VUOKRALLEANTAJA
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, width: '50%' }}>
                <span style={{ color: '#6b7280' }}>Nimi: </span>
                <strong>{contract.lessor_company_name}</strong>
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Y-tunnus: </span>
                <span style={{ fontFamily: 'monospace' }}>{contract.lessor_business_id || '-'}</span>
              </td>
            </tr>
            {contract.lessor_street_address && (
              <tr>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Katuosoite: </span>
                  {contract.lessor_street_address}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Postinumero ja -toimipaikka: </span>
                  {contract.lessor_postal_code} {contract.lessor_city}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* MYYJÄ */}
        {contract.seller_company_name && (
          <table style={{ ...tableStyle, marginBottom: '15px' }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ 
                  ...headerCellStyle, 
                  textAlign: 'left',
                  fontSize: '10pt',
                  padding: '8px 10px',
                  backgroundColor: '#e5e7eb'
                }}>
                  MYYJÄ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, width: '50%' }}>
                  <span style={{ color: '#6b7280' }}>Nimi: </span>
                  <strong>{contract.seller_company_name}</strong>
                </td>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Y-tunnus: </span>
                  <span style={{ fontFamily: 'monospace' }}>{contract.seller_business_id || '-'}</span>
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Katuosoite: </span>
                  {contract.seller_street_address}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Postinumero ja -toimipaikka: </span>
                  {contract.seller_postal_code} {contract.seller_city}
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Yhteyshenkilö: </span>
                  {contract.seller_contact_person}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Puhelinnumero: </span>
                  {contract.seller_phone}
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Sähköpostiosoite: </span>
                  {contract.seller_email}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Verotusmaa: </span>
                  {contract.seller_tax_country || 'Suomi'}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* VUOKRAKOHDE */}
        <table style={{ ...tableStyle, marginBottom: '15px' }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                VUOKRAKOHDE
              </th>
            </tr>
            <tr>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Uusi/Käytetty</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Merkki ja malli</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Lisävarusteet</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Sarja-/Rekisterinumero</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Vuosimalli</th>
            </tr>
          </thead>
          <tbody>
            {leaseObjects.length > 0 ? (
              leaseObjects.map((obj, index) => (
                <tr key={index}>
                  <td style={{ ...cellStyle, width: '12%' }}>{obj.is_new ? 'Uusi' : 'Käytetty'}</td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', width: '30%' }}>{obj.brand_model}</td>
                  <td style={{ ...cellStyle, width: '20%' }}>{obj.accessories || ''}</td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '8pt', width: '23%' }}>{obj.serial_number || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center', width: '15%' }}>{obj.year_model || ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, fontWeight: 'bold' }}>{application.equipment_description}</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '8pt' }}>{application.equipment_serial_number || ''}</td>
                <td style={cellStyle}></td>
              </tr>
            )}
            <tr>
              <td colSpan={5} style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Käyttöpaikka: </span>
                {contract.usage_location || 'Suomi'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* TOIMITUS */}
        <table style={{ ...tableStyle, marginBottom: '10px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                TOIMITUS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, width: '50%' }}>
                <span style={{ color: '#6b7280' }}>Toimitustapa: </span>
                {contract.delivery_method || 'Toimitus'}
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Arvioitu toimituspäivä: </span>
                {formatDateFi(contract.estimated_delivery_date)}
              </td>
            </tr>
            {contract.other_delivery_terms && (
              <tr>
                <td colSpan={2} style={cellStyle}>
                  <span style={{ color: '#6b7280' }}>Muut toimitusehdot: </span>
                  {contract.other_delivery_terms}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p style={{ fontSize: '8pt', color: '#6b7280', fontStyle: 'italic', marginBottom: '15px' }}>
          Vuokralleottajan tulee toimittaa allekirjoittamansa toimitusvahvistus vuokralleantajalle välittömästi vuokrakohteen toimituksen jälkeen.
        </p>

        {/* VUOKRAN MÄÄRÄ */}
        <table style={{ ...tableStyle, marginBottom: '10px' }}>
          <thead>
            <tr>
              <th colSpan={4} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                VUOKRAN MÄÄRÄ
              </th>
            </tr>
            <tr>
              <th colSpan={4} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '9pt',
                backgroundColor: '#f9fafb',
                padding: '6px 10px'
              }}>
                Vuokraerät:
              </th>
            </tr>
            <tr>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb', width: '25%' }}>Nro.</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb', width: '25%' }}>Vuokrajakson pituus</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb', width: '25%' }}>Arvioitu eräpäivä</th>
              <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb', width: '25%', textAlign: 'right' }}>Vuokraerä (ALV 0%)</th>
            </tr>
          </thead>
          <tbody>
            {contract.advance_payment && contract.advance_payment > 0 && (
              <tr>
                <td style={cellStyle}>Ennakkovuokra</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>
                  {formatEuro(contract.advance_payment)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ ...cellStyle, fontWeight: 'bold' }}>
                {contract.rent_installments_start || 1}-{contract.rent_installments_end || contract.lease_period_months}
              </td>
              <td style={cellStyle}>{contract.lease_period_months} kk</td>
              <td style={cellStyle}>{contract.lease_start_date ? formatDateFi(contract.lease_start_date) : 'Toimituspäivästä'}</td>
              <td style={{ 
                ...cellStyle, 
                textAlign: 'right', 
                fontWeight: 'bold',
                fontSize: '12pt',
                color: '#059669'
              }}>
                {formatEuro(contract.monthly_rent)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...cellStyle, backgroundColor: '#f9fafb' }}>
                <strong style={{ color: '#374151' }}>
                  Jäännösarvo varsinaisen vuokra-ajan päättyessä (alv 0%) {formatEuro(contract.residual_value)}
                </strong>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Käsittelymaksu/vuokraerä: </span>
                <strong>{formatEuro(contract.processing_fee || 500)}</strong>
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Järjestelypalkkio: </span>
                <strong>{formatEuro(contract.arrangement_fee || 10)}</strong>
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Laskutustapa: </span>
                <strong>{contract.invoicing_method || 'E-Lasku'}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '15px' }}>
          Vuokraan ja muihin tämän rahoitusleasingsopimuksen mukaisiin palkkioihin lisätään arvonlisävero kulloinkin voimassaolevien säännösten mukaan. 
          Järjestelypalkkio lisätään ensimmäiseen vuokraerään ja käsittelymaksu lisätään jokaiseen vuokraerään.
        </p>

        {/* VUOKRA-AIKA */}
        <table style={{ ...tableStyle, marginBottom: '10px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ 
                ...headerCellStyle, 
                textAlign: 'left',
                fontSize: '10pt',
                padding: '8px 10px',
                backgroundColor: '#e5e7eb'
              }}>
                VUOKRA-AIKA
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, width: '50%' }}>
                <span style={{ color: '#6b7280' }}>Vuokra-aika/kk: </span>
                <strong style={{ fontSize: '14pt' }}>{contract.lease_period_months}</strong>
              </td>
              <td style={cellStyle}>
                <span style={{ color: '#6b7280' }}>Vuokra-ajan alkamispäivä: </span>
                <strong>
                  {contract.lease_start_date ? formatDateFi(contract.lease_start_date) : '(täytetään toimituksen jälkeen)'}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '15px' }}>
          Vuokra-aika alkaa vuokrakohteen toimituspäivänä.
        </p>

        {/* ERITYISEHDOT */}
        {(contract.special_conditions || contract.guarantees || contract.guarantee_type) && (
          <table style={{ ...tableStyle, marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ 
                  ...headerCellStyle, 
                  textAlign: 'left',
                  fontSize: '10pt',
                  padding: '8px 10px',
                  backgroundColor: '#e5e7eb'
                }}>
                  ERITYISEHDOT JA VAKUUDET
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cellStyle}>
                  {contract.guarantee_type && (
                    <p style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#6b7280' }}>Vakuuden tyyppi: </span>
                      <strong>{contract.guarantee_type}</strong>
                    </p>
                  )}
                  {contract.guarantees && (
                    <p style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#6b7280' }}>Vakuudet: </span>
                      {contract.guarantees}
                    </p>
                  )}
                  {contract.special_conditions && (
                    <p>
                      <span style={{ color: '#6b7280' }}>Erityisehdot: </span>
                      {contract.special_conditions}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* PAGE 1 FOOTER */}
        <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '9pt', color: '#6b7280' }}>
          <p>NIMIKIRJAIMET ___________</p>
          <p style={{ marginTop: '10px' }}>Sivu 1/3</p>
        </div>

        {/* ===== PAGE 2: YLEISET SOPIMUSEHDOT ===== */}
        <div style={{ pageBreakBefore: 'always' }}></div>
        
        {/* Page 2 header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #d1d5db'
        }}>
          <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#374151' }}>
            Rahoitusleasingsopimus
          </span>
          <span style={{ fontSize: '9pt', color: '#6b7280' }}>
            Sopimusnumero: <strong style={{ fontFamily: 'monospace' }}>{contractNumber}</strong>
          </span>
        </div>

        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '12pt', 
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '20px',
          color: '#1f2937'
        }}>
          Yleiset sopimusehdot
        </h2>
        
        <div style={{ 
          columnCount: 2, 
          columnGap: '25px',
          columnRule: '1px solid #e5e7eb',
          fontSize: '7pt',
          lineHeight: '1.35',
          color: '#374151'
        }}>
          {/* Release Finland Oy - Leasingsopimuksen yleiset ehdot - TÄSMÄLLEEN PDF:N MUKAAN */}
          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>1. SOPIMUKSEN TARKOITUS</h4>
            <p style={{ textAlign: 'justify' }}>Tämän sopimuksen tarkoituksena on sopia niistä ehdoista, joiden mukaisesti Release Finland Oy, y-tunnus 3486207-1, ("Vuokralleantaja") ostaa etusivulla mainitun vuokrakohteen ja vuokraa sen etusivulla mainitulle Vuokralleottajalle vuokra-ajan alkamispäivänä.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>2. OMISTUSOIKEUS</h4>
            <p style={{ textAlign: 'justify' }}>Vuokrakohde on Vuokralleantajan omaisuutta. Vuokralleottaja ei tämän sopimuksen perusteella saa vuokrakohdetta omistukseensa. Vuokrakohteeseen tulee Vuokralleantajan edellyttämällä tavalla merkitä, että se on Vuokralleantajan omaisuutta. Vuokralleottaja ei saa myydä, vuokrata, pantata eikä millään muullakaan tavalla luovuttaa vuokrakohdetta tai sen osaa kolmannelle.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>3. VUOKRAKOHTEEN HANKINTA JA TARKASTAMINEN</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottaja on valinnut vuokrakohteen ja vakuuttaa, että hän on tutustunut vuokrakohteeseen ja siitä annettuihin tietoihin ja, että vuokrakohde vastaa niitä vaatimuksia, joita Vuokralleottajalla on vuokrakohteen kunnon, soveltuvuuden, kestävyyden tai muiden ominaisuuksien suhteen. Vuokralleottajan tulee tarkastaa vuokrakohde huolellisesti niin pian kuin se on mahdollista.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>4. VUOKRA-AIKA</h4>
            <p style={{ textAlign: 'justify' }}>Vuokrasopimus on määräaikainen. Vuokra-ajan pituus ja vuokra-ajan alkamispäivä on mainittu tämän sopimuksen etusivulla. Vuokrajakso on vuokra-ajan osa ja sen pituus on yksi kuukausi, ellei tämän sopimuksen etusivulla toisin ole sovittu.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>5. VUOKRA JA SEN MUUTTAMINEN</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottaja on velvollinen suorittamaan kultakin vuokrajaksolta etusivulla mainitun vuokran. Mikäli myyjän lasku on muussa kuin tämän sopimuksen mukaisessa valuutassa ja laskun maksuhetken valuuttakurssi poikkeaa etusivulle merkityn vuokran perusteena käytetystä valuuttakurssista, mikäli vuokrakohteen hankintahinta poikkeaa vuokran perusteena käytetystä hankintahinnasta tai mikäli vuokraan sisältyvän huolto-palvelun hinta muuttuu huoltopalvelua koskevan sopimuksen ehtojen mukaisesti, Vuokralleantajalla on oikeus mutta ei velvollisuutta muuttaa vuokraa valuuttakurssin, vuokrakohteen hankintahinnan tai huoltopalvelun hinnan muutoksesta aiheutuneella määrällä. Lisäksi Vuokralleantajalla on oikeus korottaa vuokraa aiheutuneita lisäkustannuksia vastaavalla määrällä, mikäli Vuokralleantajan jälleenrahoitukselle tai tälle sopimukselle määrätään leima- tai luottovero tai muu vero tai maksu tai lainsäädäntö tai viranomaismääräykset muuttuvat siten, että Vuokralleantajalle aiheutuu lisäkustannuksia. Lisäksi Vuokralleottaja sitoutuu suorittamaan Vuokralleantajalle ns. päivävuokraa vuokrakohteen toimituspäivän ja vuokra-ajan alkamispäivän väliseltä ajalta. Tämän päivävuokran määrä lasketaan siten, että kuukausivuokra jaetaan 30:llä ja saatu osamäärä kerrotaan toimituspäivän ja vuokra-ajan alkamispäivän välisten päivien lukumäärällä.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>6. VUOKRIEN JA MUIDEN MAKSUJEN ERÄÄNTYMINEN SEKÄ VIIVÄSTYSKOROT JA KULUT</h4>
            <p style={{ textAlign: 'justify' }}>Vuokra kultakin vuokrajaksolta erääntyy maksettavaksi etukäteen kunkin vuokrajakson ensimmäisenä päivänä. Muut tämän sopimuksen mukaiset maksut erääntyvät maksettavaksi vaadittaessa. Vuokralleantajalla on oikeus periä Vuokralleottajalta perustamis- ja laskutuspalkkion lisäksi Vuokralleottajan pyynnöstä suoritetuista erityispalveluista kulukorvausta kulloinkin voimassa olevan palveluhinnaston mukaisesti. Vuokran tai muun tähän sopimukseen perustuvan maksun viivästyessä Vuokralleantajalla on oikeus periä erääntyneelle määrälle vuotuista viivästyskorkoa maksun eräpäivän ja suorituspäivän väliseltä ajalta. Viivästyskoron määrä on 18 prosenttia p.a. mutta kuitenkin aina vähintään korkolain mukaisen viivästyskoron määrä. Vuokralleottaja on velvollinen korvaamaan Vuokralleantajalle vuokran ja muiden tähän sopimukseen perustuvien saatavien perinnästä aiheutuneet kohtuulliset kulut.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>7. VEROT, MAKSUT JA KUSTANNUKSET</h4>
            <p style={{ textAlign: 'justify' }}>Vuokraan ja muihin tämän sopimuksen mukaisiin maksuihin lisätään arvonlisäverot kulloinkin voimassaolevien säännösten mukaan. Vuokralleottaja vastaa kaikista vuokrakohteen ostamisesta, omistamisesta, vuokraamisesta, käyttämisestä, kuljettamisesta tai asentamisesta tai muutoin tästä sopimuksesta tai vuokrakohteesta Vuokralleantajalle mahdollisesti aiheutuvista kustannuksista, käyttövoima-, ajoneuvo-, leima-, luotto- tai muista veroista, viranomaismaksuista ja muista vastaavista kustannuksista lukuun ottamatta Vuokralleantajalle Suomessa määrättävää tuloveroa.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>8. VUOKRAKOHTEEN KUNTO JA VIRHEELLISYYS</h4>
            <p style={{ textAlign: 'justify' }}>Vuokrakohde vuokrataan siinä kunnossa kuin se toimituksen hyväksymispäivänä on. Vuokralleottaja on itsenäisesti valinnut vuokrakohteen ja sen myyjän. Vuokralleantaja ei ole vuokrakohteen tai vastaavien laitteiden myyjä eikä Vuokralleantajaa voida samaistaa vuokrakohteen myyjään tai valmistajaan. Vuokralleottaja vahvistaa hyväksyvänsä sen, että Vuokralleantaja ostaa vuokrakohteen myyjältä ainoastaan tarkoituksenaan vuokrata se tämän sopimuksen mukaisesti.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>9. VUOKRAKOHTEEN KÄYTTÖ JA KUNNOSSAPITO</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottaja sitoutuu käyttämään vuokrakohdetta huolellisesti ja vain sen tavanomaiseen käyttötarkoitukseen sekä pitämään vuokrakohteen asianmukaisessa kunnossa. Vuokralleottaja vastaa omalla kustannuksellaan vuokrakohteen tarpeellisista huolloista ja korjauksista sekä varaosista. Vuokrakohteeseen ei saa ilman Vuokralleantajan kirjallista suostumusta tehdä muutoksia.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>10. VAKUUTUKSET</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottaja on velvollinen pitämään vuokrakohteen omalla kustannuksellaan asianmukaisesti vakuutettuna koko vuokra-ajan. Vakuutuksen tulee kattaa vuokrakohteen täysi jälleenhankinta-arvo ja sisältää vähintään palo-, varkaus- ja vahinkovakuutuksen. Vakuutuskirjaan tulee Vuokralleantajan pyynnöstä merkitä Vuokralleantaja edunsaajaksi. Vuokralleottaja on velvollinen esittämään vakuutuskirjan Vuokralleantajalle tämän pyynnöstä.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>11. VUOKRAKOHTEEN VAHINGOITTUMINEN TAI TUHOUTUMINEN</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottajan on välittömästi ilmoitettava Vuokralleantajalle vuokrakohteen vahingoittumisesta, tuhoutumisesta, katoamisesta tai menettämisestä. Vuokrakohteen vahingoittuminen, tuhoutuminen, katoaminen tai menettäminen ei vapauta Vuokralleottajaa sopimuksen mukaisesta maksuvelvollisuudesta. Vahingon sattuessa vakuutuskorvaus on käytettävä ensisijaisesti vuokrakohteen korjaamiseen tai korvaavan vuokrakohteen hankkimiseen. Vakuutuskorvaus voidaan suorittaa myös Vuokralleantajalle sopimuksen mukaisten saatavien suoritukseksi.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>12. VASTUU KOLMANSILLE</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottaja vastaa kaikista vuokrakohteen käytöstä tai hallussapidosta kolmansille aiheutuneista vahingoista ja pitää Vuokralleantajan vapaana kaikista tällaisista vaatimuksista, vastuista ja kustannuksista.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>13. SOPIMUKSEN PURKAMINEN JA VAHINGONKORVAUS</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleantajalla on oikeus purkaa sopimus välittömästi ilmoittamalla siitä kirjallisesti Vuokralleottajalle, mikäli: (a) Vuokralleottaja laiminlyö vuokran tai muun tähän sopimukseen perustuvan maksun suorittamisen eräpäivänä; (b) Vuokralleottaja rikkoo olennaisesti tämän sopimuksen ehtoja; (c) Vuokralleottaja asetetaan konkurssiin tai yrityssaneeraukseen tai selvitystilaan; (d) Vuokralleottaja hakee julkista haastetta velkojilleen tai joutuu ulosoton kohteeksi; (e) Vuokralleottajan taloudellinen tilanne tai maksukyky heikkenee olennaisesti. Sopimuksen purkautuessa Vuokralleottaja on velvollinen maksamaan Vuokralleantajalle kaikkien jo erääntyneiden vuokrien ja muiden maksujen lisäksi: kaikki vuokrakohteen takaisinottamisesta, myymisestä, uudelleen vuokraamisesta tai arvioimisesta aiheutuvat kulut sekä muut sopimuksen purkautumisesta aiheutuvat kustannukset; sekä vahingonkorvauksena kaikkien päättymishetkellä jäljellä olevien varsinaisen vuokra-ajan erääntymättömien vuokrien ja vuokrakohteen jäännösarvon nykyarvo. Nykyarvo lasketaan 2 (kahden) prosentin (p.a.) laskentakorolla vahingonkorvauksen eräpäivälle. Vahingonkorvaus erääntyy maksettavaksi vaadittaessa. Vuokralleantajan saatavasta vähennetään vuokrakohteen realisoinnista saatu nettotulo.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>14. VUOKRAKOHTEEN PALAUTTAMINEN</h4>
            <p style={{ textAlign: 'justify' }}>Sopimuksen päätyttyä vuokra-ajan päättymisen tai muun syyn perusteella Vuokralleottaja on omalla kustannuksellaan (mukaan lukien mm. purku-, pakkaus-, kuljetus-, varastointi- ja vakuutuskustannukset ja maastaviennistä tai maahantuonnista aiheutuvat tullit, tariffit, verot tai muut vastaavat maksut) ja riskilläan velvollinen toimittamaan vuokrakohteen Vuokralleantajan osoittamaan paikkaan Suomessa. Palautushetkellä vuokrakohteen tulee olla tämän sopimuksen kohdan 9 mukaisessa kunnossa. Mikäli Vuokralleottaja laiminlyö vuokrakohteen palautusvelvollisuuden ja/tai vuokrakohde ei palautushetkellä ole tämän sopimuksen kohdan 9 mukaisessa kunnossa, Vuokralleantaja on oikeutettu ottamaan vuokrakohteen haltuunsa ja huolehtimaan sen saattamisesta edellä mainittuun kuntoon Vuokralleottajan kustannuksella.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>15. SOPIMUKSEN SIIRTO</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleantaja on oikeutettu siirtämään tähän sopimukseen perustuvat oikeutensa ja/tai velvollisuutensa kokonaan tai osittain ja vuokrakohteen omistusoikeuden kolmannelle (siirronsaaja). Saatua tiedon siirrosta Vuokralleottaja: (i) on velvollinen suorittamaan kaikki tämän sopimuksen mukaiset maksut siirronsaajalle huolimatta (a) vuokrakohteen mahdollisista vioista tai puutteista, vahingoittumisesta tai tuhoutumisesta, (b) myyjän sopimusrikkomuksesta tai muusta laiminlyönnistä, (c) mistään Vuokralleantajaa tai siirronsaajaa vastaan mahdollisesti olevista vastasaatavista ja tekemättä niitä vastaan mitään vastasaataviin tai mihinkään muuhun seikkaan perustuvia kuittausvaatimuksia tai muita väitteitä tai vaatimuksia; (ii) ei vaadi siirronsaajaa täyttämään mitään muita Vuokralleantajan velvoitteita kuin ne, jotka siirronsaaja on kirjallisesti ottanut täyttääkseen; ja (iii) vahvistaa siirron tiedoksisaannin Vuokralleantajalle tai siirronsaajalle tämän pyytämällä tavalla. Siirronsaaja voi samassa laajuudessa siirtää sopimuksen tai siihen perustuvat oikeudet edelleen. Vuokralleottajalla ei ole oikeutta ilman Vuokralleantajan kirjallista suostumusta siirtää tähän sopimukseen perustuvia oikeuksia tai velvollisuuksia kolmannelle.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>16. VUOKRALLEOTTAJAN TIEDONANTOVELVOLLISUUS</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleottajan on ilmoitettava Vuokralleantajalle viivytyksettä nimensä ja osoitteensa muutoksesta. Vuokralleottajan on annettava Vuokralleantajalle pyynnöstä taloudellista asemaansa koskevia tietoja, jotka ovat Vuokralleantajalle tarpeellisia. Lisäksi Vuokralleottajan tulee ilmoittaa Vuokralleantajalle oma-aloitteisesti välittömästi liiketoiminnassaan tapahtuneista olennaisista muutoksista. Tällaisia muutoksia ovat muun muassa: yritysmuodon tai toimialan muutos, liiketoiminnan lopettaminen, sen olennainen laajentaminen tai supistaminen, Vuokralleottajan taloudellisissa etuyhteyksissä tai omistuspohjassa tapahtuneet olennaiset muutokset tai Vuokralleottajan muihin yrityksiin liittyvissä omistuksissa ja sitoumuksissa tapahtuva muutos.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>17. MUUT EHDOT</h4>
            <p style={{ textAlign: 'justify' }}>Tätä sopimusta voidaan muuttaa vain kirjallisesti. Muussa järjestyksessä tehdyt muutokset eivät ole päteviä. Vuokralleantajan kerran tai useammin tapahtunut luopuminen jonkin tämän sopimuksen mukaisen oikeutensa käyttämisestä ei estä Vuokralleantajaa myöhemmin vetoamasta samaan oikeuteensa samanlaisessa tai vastaavassa tilanteessa.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>18. YLIVOIMAINEN ESTE</h4>
            <p style={{ textAlign: 'justify' }}>Vuokralleantaja ei vastaa vahingoista tai viivästyksistä, jotka johtuvat lain määräyksistä, viranomaisten toimenpiteistä, työtaistelutoimenpiteestä, sotatoimista tai muista Vuokralleantajan vaikutusmahdollisuuksien ulkopuolella olevista syistä.</p>
          </div>

          <div style={{ breakInside: 'avoid', marginBottom: '6px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontSize: '7pt' }}>19. RIITOJEN RATKAISU</h4>
            <p style={{ textAlign: 'justify' }}>Tähän sopimukseen sovelletaan Suomen lakia. Kaikki tästä sopimuksesta aiheutuvat riitaisuudet ratkaistaan Helsingin käräjäoikeudessa.</p>
          </div>

          {/* Release Finland yhteystiedot */}
          <div style={{ breakInside: 'avoid', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '6.5pt', color: '#6b7280', textAlign: 'center' }}>
              <strong>Release Finland Oy</strong> ■ Y-tunnus 3486207-1 ■ Bomansonintie 10A, 00570 Helsinki ■ Puh: +358 50 324 1515
            </p>
          </div>
        </div>

        {/* Page 2 footer */}
        <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '9pt', color: '#6b7280' }}>
          <p>NIMIKIRJAIMET ___________</p>
          <p style={{ marginTop: '10px' }}>Sivu 2/3</p>
        </div>

        {/* ===== PAGE 3: ALLEKIRJOITUKSET ===== */}
        <div style={{ pageBreakBefore: 'always' }}></div>
        
        {/* Page 3 header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #d1d5db'
        }}>
          <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#374151' }}>
            Rahoitusleasingsopimus
          </span>
          <span style={{ fontSize: '9pt', color: '#6b7280' }}>
            Sopimusnumero: <strong style={{ fontFamily: 'monospace' }}>{contractNumber}</strong>
          </span>
        </div>

        {/* Contract confirmation text */}
        <div style={{ 
          marginBottom: '25px', 
          padding: '15px', 
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '10pt'
        }}>
          <p style={{ color: '#374151' }}>
            Tämä sopimus on laadittu kahtena samansisältöisenä kappaleena, yksi kummallekin osapuolelle. 
            Allekirjoituksellaan osapuolet vahvistavat tutustuneensa sopimuksen ehtoihin ja sitoutuvat noudattamaan niitä.
          </p>
        </div>

        {/* ALLEKIRJOITUKSET */}
        <h3 style={{ 
          textAlign: 'center', 
          fontWeight: 'bold',
          fontSize: '11pt',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '25px',
          color: '#1f2937'
        }}>
          Allekirjoitukset
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          {/* VUOKRALLEOTTAJA */}
          <div style={{ 
            border: '1px solid #d1d5db', 
            borderRadius: '8px', 
            padding: '20px'
          }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              color: '#374151',
              textAlign: 'center',
              backgroundColor: '#f3f4f6',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '10pt'
            }}>
              VUOKRALLEOTTAJAN ALLEKIRJOITUS
            </h4>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Paikka ja päivämäärä</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '30px',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '5px'
              }}>
                {contract.lessee_signature_place && contract.lessee_signature_date ? (
                  <span style={{ fontSize: '10pt', fontWeight: '500' }}>
                    {contract.lessee_signature_place}, {formatDateFi(contract.lessee_signature_date)}
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Allekirjoitus</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {contract.lessee_signer_name && contract.status === 'SIGNED' ? (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#059669', fontWeight: '500', fontSize: '10pt' }}>✓ Allekirjoitettu sähköisesti</span>
                    <p style={{ fontSize: '8pt', color: '#6b7280' }}>{formatDateFi(contract.signed_at)}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Nimenselvennys</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '30px',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '5px'
              }}>
                {contract.lessee_signer_name ? (
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{contract.lessee_signer_name}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* VUOKRALLEANTAJA */}
          <div style={{ 
            border: '1px solid #d1d5db', 
            borderRadius: '8px', 
            padding: '20px'
          }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              color: '#374151',
              textAlign: 'center',
              backgroundColor: '#f3f4f6',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '10pt'
            }}>
              VUOKRALLEANTAJAN ALLEKIRJOITUS
            </h4>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Paikka ja päivämäärä</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '30px',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '5px'
              }}>
                {contract.lessor_signature_place && contract.lessor_signature_date ? (
                  <span style={{ fontSize: '10pt', fontWeight: '500' }}>
                    {contract.lessor_signature_place}, {formatDateFi(contract.lessor_signature_date)}
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Allekirjoitus</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '60px'
              }}>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Nimenselvennys</p>
              <div style={{ 
                borderBottom: '2px solid #374151', 
                height: '30px',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '5px'
              }}>
                {contract.lessor_signer_name ? (
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{contract.lessor_signer_name}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Bank payment details */}
        {(contract.bank_name || contract.bank_iban) && (
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#374151', marginBottom: '10px', fontSize: '10pt' }}>MAKSUTIEDOT</h4>
            <div style={{ 
              backgroundColor: '#f9fafb', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '15px',
              fontSize: '9pt'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Pankki: </span>
                  <strong>{contract.bank_name}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>IBAN: </span>
                  <strong style={{ fontFamily: 'monospace' }}>{contract.bank_iban}</strong>
                </div>
                {contract.bank_bic && (
                  <div>
                    <span style={{ color: '#6b7280' }}>BIC/SWIFT: </span>
                    <strong style={{ fontFamily: 'monospace' }}>{contract.bank_bic}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ 
          marginTop: 'auto', 
          paddingTop: '25px', 
          borderTop: '1px solid #d1d5db',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: '35px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <div style={{ 
                width: '35px', 
                height: '35px', 
                backgroundColor: '#374151',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14pt',
                fontWeight: 'bold'
              }}>
                {contract.lessor_company_name?.[0] || 'R'}
              </div>
            )}
            <div style={{ textAlign: 'left', fontSize: '9pt', color: '#4b5563' }}>
              <p style={{ fontWeight: 'bold' }}>{contract.lessor_company_name || 'Release Finland Oy'}</p>
              {contract.lessor_business_id && <p>Y-tunnus: {contract.lessor_business_id}</p>}
            </div>
          </div>
          {contract.lessor_street_address && (
            <p style={{ fontSize: '9pt', color: '#6b7280' }}>
              {contract.lessor_street_address}, {contract.lessor_postal_code} {contract.lessor_city}
            </p>
          )}
          <p style={{ fontSize: '8pt', color: '#9ca3af', marginTop: '15px' }}>
            Sopimus luotu Release Finland Oy:n järjestelmässä • {formatDateFi(contract.created_at)}
          </p>
          <p style={{ marginTop: '10px', textAlign: 'right', fontSize: '9pt', color: '#6b7280' }}>Sivu 3/3</p>
        </div>

        {/* ===== PAGE 4: TOIMITUKSEN HYVÄKSYMISILMOITUS (Optional) ===== */}
        {showDeliveryConfirmation && (
          <>
            <div style={{ pageBreakBefore: 'always' }}></div>
            
            {/* Page 4 header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '3px solid #1f2937'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Release Logo - SVG */}
                <svg viewBox="0 0 200 50" height="40" width="160" aria-label="Release">
                  <text x="0" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">R</text>
                  <text x="28" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#E31937">e</text>
                  <text x="52" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">lease</text>
                </svg>
                <div>
                  <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1f2937' }}>
                    {contract.lessor_company_name || 'Release Finland Oy'}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1f2937' }}>
                  Toimituksen Hyväksymisilmoitus
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ 
              marginBottom: '25px', 
              padding: '15px', 
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '9pt'
            }}>
              <p style={{ color: '#92400e' }}>
                <strong>Ohje:</strong> Allekirjoita ja palauta tämä asiakirja välittömästi kohteen toimituksen jälkeen 
                sähköpostitse osoitteeseen: {contract.lessee_email || 'asiakaspalvelu@rahoittaja.fi'}
              </p>
            </div>

            {/* VUOKRALLEOTTAJA */}
            <table style={{ ...tableStyle, marginBottom: '15px' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ ...headerCellStyle, textAlign: 'left', backgroundColor: '#e5e7eb' }}>
                    VUOKRALLEOTTAJA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, width: '50%' }}>
                    <span style={{ color: '#6b7280' }}>Nimi: </span>
                    <strong>{contract.lessee_company_name}</strong>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Y-tunnus: </span>
                    <span style={{ fontFamily: 'monospace' }}>{contract.lessee_business_id}</span>
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Katuosoite: </span>
                    {contract.lessee_street_address}
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Postinumero ja -toimipaikka: </span>
                    {contract.lessee_postal_code} {contract.lessee_city}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Yhteyshenkilö: </span>
                    {contract.lessee_contact_person}
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Puhelinnumero: </span>
                    {contract.lessee_phone}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Sähköpostiosoite: </span>
                    {contract.lessee_email}
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Sopimusnumero: </span>
                    <strong style={{ fontFamily: 'monospace' }}>{contractNumber}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* VUOKRAKOHDE */}
            <table style={{ ...tableStyle, marginBottom: '15px' }}>
              <thead>
                <tr>
                  <th colSpan={3} style={{ ...headerCellStyle, textAlign: 'left', backgroundColor: '#e5e7eb' }}>
                    VUOKRAKOHDE
                  </th>
                </tr>
                <tr>
                  <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Vuokrakohteen nimi, laatu, merkki ja malli</th>
                  <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Lisävarusteet</th>
                  <th style={{ ...headerCellStyle, fontSize: '8pt', backgroundColor: '#f9fafb' }}>Sarja-/Rekisterinumero</th>
                </tr>
              </thead>
              <tbody>
                {leaseObjects.length > 0 ? (
                  leaseObjects.map((obj, index) => (
                    <tr key={index}>
                      <td style={{ ...cellStyle, fontWeight: 'bold' }}>
                        {obj.brand_model}{obj.year_model ? `, vm. ${obj.year_model}` : ''}
                      </td>
                      <td style={cellStyle}>{obj.accessories || ''}</td>
                      <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '9pt' }}>{obj.serial_number || ''}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{application.equipment_description}</td>
                    <td style={cellStyle}></td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '9pt' }}>{application.equipment_serial_number || ''}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TOIMITUS */}
            <table style={{ ...tableStyle, marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ ...headerCellStyle, textAlign: 'left', backgroundColor: '#e5e7eb' }}>
                    TOIMITUS
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, width: '50%' }}>
                    <span style={{ color: '#6b7280' }}>Toimituspäivä: </span>
                    <strong>{formatDateFi(contract.estimated_delivery_date) || '_______________'}</strong>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#6b7280' }}>Toimituspaikka: </span>
                    <strong>{contract.usage_location || '_______________'}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* VAHVISTUS JA HYVÄKSYNTÄ */}
            <table style={{ ...tableStyle, marginBottom: '25px' }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'left', backgroundColor: '#e5e7eb' }}>
                    VAHVISTUS JA HYVÄKSYNTÄ
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, padding: '15px' }}>
                    <p style={{ marginBottom: '15px', fontStyle: 'italic', color: '#374151' }}>
                      Vahvistamme, että yllä mainittu vuokrakohde on toimitettu meille sovitun mukaisesti. 
                      Olemme huolellisesti tarkastaneet vuokrakohteen ja hyväksymme sen allekirjoittamalla 
                      tämän toimituksen hyväksymisilmoituksen.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Allekirjoitus */}
            <div style={{ 
              border: '1px solid #d1d5db', 
              borderRadius: '8px', 
              padding: '20px',
              maxWidth: '400px'
            }}>
              <h4 style={{ 
                fontWeight: 'bold', 
                marginBottom: '15px',
                fontSize: '10pt',
                color: '#374151'
              }}>
                VUOKRALLEOTTAJAN ALLEKIRJOITUS
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Paikka ja päivämäärä</p>
                <div style={{ borderBottom: '2px solid #374151', height: '25px' }}></div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Allekirjoitus</p>
                <div style={{ borderBottom: '2px solid #374151', height: '50px' }}></div>
              </div>
              <div>
                <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '5px' }}>Nimenselvennys</p>
                <div style={{ borderBottom: '2px solid #374151', height: '25px' }}></div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              marginTop: '40px', 
              paddingTop: '20px', 
              borderTop: '1px solid #d1d5db',
              textAlign: 'center',
              fontSize: '8pt',
              color: '#6b7280'
            }}>
              <p><strong>{contract.lessor_company_name || 'Release Finland Oy'}</strong></p>
              {contract.lessor_business_id && <p>Y-tunnus: {contract.lessor_business_id}</p>}
              {contract.lessor_street_address && (
                <p>{contract.lessor_street_address}, {contract.lessor_postal_code} {contract.lessor_city}</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

ContractDocument.displayName = 'ContractDocument';

export default ContractDocument;
