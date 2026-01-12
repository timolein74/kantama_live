import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Bot, User, Sparkles, 
  FileText, HelpCircle, ArrowRight, Building2,
  Clock, CheckCircle, AlertCircle, Euro, Phone,
  Mail, ExternalLink, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { applications, offers } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCurrency, getStatusLabel } from '../lib/utils';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
}

interface QuickAction {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface UserContext {
  userName: string;
  companyName: string;
  applications: any[];
  ytjData: any;
  pendingActions: string[];
  currentPage: string;
}

// Contextual knowledge base - knows about portal features
// Based on comprehensive chatbot database with 50+ Q&A pairs across 18 categories
const portalKnowledge: { keywords: string[]; answer: (ctx: UserContext) => string; actions?: (ctx: UserContext, nav: any) => QuickAction[] }[] = [
  // ===== YDINPALVELUT =====
  
  // TARJOUKSET - Näkeminen ja voimassaolo
  {
    keywords: ['tarjous', 'tarjoukset', 'offer', 'tarjouksen', 'näytä tarjous'],
    answer: (ctx) => {
      const pendingOffers = ctx.applications.filter(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
      if (pendingOffers.length > 0) {
        return `Sinulla on ${pendingOffers.length} tarjous odottamassa! 🎉\n\nTarjoukset löytyvät hakemuksesi "Tarjoukset"-välilehdeltä. Voit hyväksyä tarjouksen ja hakea virallisen luottopäätöksen.`;
      }
      return 'Tarjoukset näkyvät hakemuksesi "Tarjoukset"-välilehdellä kun rahoittaja on lähettänyt tarjouksen. Käsittelemme hakemukset yleensä 1-2 arkipäivän sisällä.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
      if (app) {
        return [{ label: 'Katso tarjous', icon: <Euro className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // TARJOUKSEN VOIMASSAOLO
  {
    keywords: ['voimassa', 'kuinka kauan tarjous', 'tarjouksen voimassaolo', 'umpeutuu'],
    answer: () => 'Tarjoukset ovat tyypillisesti voimassa 14-30 päivää. Tarkka voimassaoloaika näkyy tarjouksessa.\n\nJos tarjous on umpeutunut, voit pyytää uuden tarjouksen ottamalla yhteyttä rahoittajaan hakemuksesi kautta.'
  },
  // TARJOUSNEUVOTTELU
  {
    keywords: ['neuvottelu', 'neuvotella', 'tingitä', 'parempi', 'ehdot', 'muuttaa tarjous'],
    answer: () => '💬 Kyllä, tarjouksesta voi neuvotella!\n\nVoit pyytää rahoittajalta:\n• Pidempää/lyhyempää sopimuskautta\n• Erilaista käsirahaa\n• Erilaista jäännösarvoa\n\nLähetä viesti hakemuksesi kautta ja kerro mitä ehtoja haluaisit muuttaa. Rahoittaja tekee tarvittaessa uuden tarjouksen.'
  },

  // SOPIMUKSET - Allekirjoitus ja muutokset
  {
    keywords: ['sopimus', 'allekirjoitus', 'allekirjoita', 'contract', 'sopimuksen'],
    answer: (ctx) => {
      const contractPending = ctx.applications.find(a => a.status === 'CONTRACT_SENT');
      if (contractPending) {
        return `Sopimus odottaa allekirjoitustasi! 📝\n\nLöydät sopimuksen hakemuksesi "Sopimukset"-välilehdeltä. Voit ladata PDF:n, tarkistaa ehdot ja hyväksyä sopimuksen allekirjoitettavaksi.`;
      }
      return 'Sopimus lähetetään sinulle kun olet hyväksynyt tarjouksen ja luottopäätös on tehty. Allekirjoitus tapahtuu sähköisesti Visma Sign -palvelun kautta.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'CONTRACT_SENT');
      if (app) {
        return [{ label: 'Avaa sopimus', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // SOPIMUKSEN MUUTTAMINEN
  {
    keywords: ['muuttaa sopimus', 'sopimuksen muutos', 'muokata sopimus', 'kesken sopimus'],
    answer: () => 'Sopimuksen muuttaminen kesken sopimuskauden on mahdollista tietyissä tilanteissa:\n\n✅ Mahdolliset muutokset:\n• Kohteen vaihto (järjestelymaksu)\n• Sopimuskauden pidentäminen\n• Ennenaikainen lunastus\n\n❌ Ei yleensä mahdollista:\n• Kuukausierän pienentäminen\n• Sopimuskauden lyhentäminen\n\nOta yhteyttä hakemuksesi kautta niin selvitetään mahdollisuudet!'
  },
  // SOPIMUKSEN IRTISANOMINEN
  {
    keywords: ['irtisano', 'lopettaa', 'peruuttaa', 'keskeyttää', 'purkaa sopimus'],
    answer: () => '⚠️ Leasingsopimus on sitova koko sopimuskauden ajan.\n\nVaihtoehdot kesken kauden:\n\n1️⃣ Ennenaikainen lunastus\n• Maksat jäljellä olevat erät + jäännösarvo\n• Kohde siirtyy omistukseesi\n\n2️⃣ Kohteen vaihto\n• Vaihdat uuteen koneeseen\n• Uusi sopimus tehdään\n\nOta yhteyttä rahoittajaan keskustellaksesi vaihtoehdoista.'
  },

  // HAKEMUS JA TILA
  {
    keywords: ['hakemus', 'hakemukset', 'tila', 'status', 'missä', 'vaihe', 'hakemuksen', 'eteneminen', 'tilanne'],
    answer: (ctx) => {
      if (ctx.applications.length === 0) {
        return 'Sinulla ei ole vielä hakemuksia. Voit tehdä uuden hakemuksen etusivulta!';
      }
      const statuses = ctx.applications.map(a => `• ${a.company_name}: ${getStatusLabel(a.status)}`).join('\n');
      return `Hakemustesi tilanne:\n\n${statuses}\n\nKlikkaa hakemusta nähdäksesi lisätiedot.`;
    },
    actions: (ctx, nav) => [{ label: 'Näytä hakemukset', icon: <FileText className="w-4 h-4" />, action: () => nav('/dashboard'), variant: 'primary' }]
  },
  // HAKEMUKSEN KÄSITTELYAIKA
  {
    keywords: ['käsittelyaika', 'kuinka nopeasti', 'milloin saan', 'odottaa'],
    answer: () => '⏱️ Tyypilliset käsittelyajat:\n\n• Tarjous hakemuksen jälkeen: 1-2 arkipäivää\n• Luottopäätös: 1-3 arkipäivää\n• Sopimus allekirjoitettavaksi: 1-2 arkipäivää\n\nKiireellisissä tapauksissa ota yhteyttä hakemuksesi kautta - pyrimme joustavuuteen!'
  },
  // HAKEMUKSEN MUOKKAAMINEN
  {
    keywords: ['muokkaa hakemus', 'korjaa hakemus', 'väärä tieto', 'muuttaa hakemus'],
    answer: () => 'Jos hakemuksessa on virheellisiä tietoja:\n\n1. Lähetä viesti hakemuksesi "Viestit"-välilehdeltä\n2. Kerro mitä tietoja pitää korjata\n3. Rahoittaja päivittää tiedot\n\nHuom! Hakemuksen perustiedot (summa, kohde) vaikuttavat tarjoukseen, joten muutokset kannattaa tehdä ennen tarjousta.'
  },

  // DOKUMENTIT JA LIITTEET
  {
    keywords: ['lisätiedot', 'dokumentit', 'liite', 'liitteet', 'tiedosto', 'tilinpäätös', 'paperit', 'asiakirjat'],
    answer: (ctx) => {
      const infoRequested = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (infoRequested) {
        return `Rahoittaja on pyytänyt lisätietoja hakemukseesi "${infoRequested.company_name}"! 📎\n\nAvaa hakemus ja lähetä pyydetyt dokumentit "Viestit"-välilehdeltä.`;
      }
      return '📎 Tyypillisesti tarvittavia dokumentteja:\n\n• Tilinpäätös (viimeisin)\n• Tulos ja tase -ajot (tuoreet)\n• Henkilötodistus (passi/henkilökortti)\n• Kuva kohteesta\n• Urakkasopimus (tarvittaessa)\n\nRahoittaja ilmoittaa mitä dokumentteja juuri sinun hakemukseesi tarvitaan.';
    },
    actions: (ctx, nav) => {
      const app = ctx.applications.find(a => a.status === 'INFO_REQUESTED');
      if (app) {
        return [{ label: 'Lähetä dokumentit', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${app.id}`), variant: 'primary' }];
      }
      return [];
    }
  },
  // DOKUMENTTIEN LATAAMINEN
  {
    keywords: ['lataa dokumentti', 'miten lähetän', 'tiedostomuoto', 'pdf'],
    answer: () => 'Dokumenttien lähettäminen on helppoa:\n\n1. Avaa hakemuksesi "Viestit"-välilehti\n2. Klikkaa "Lisää liite" tai vedä tiedosto\n3. Lähetä viesti liitteineen\n\n📄 Tuetut muodot: PDF, JPG, PNG, DOC, XLS\n📦 Max koko: 10 MB per tiedosto'
  },

  // LUOTTOPÄÄTÖS
  {
    keywords: ['luottopäätös', 'luotto', 'päätös', 'hyväksyntä', 'luoton'],
    answer: (ctx) => {
      const creditPending = ctx.applications.find(a => a.status === 'CREDIT_DECISION_PENDING');
      if (creditPending) {
        return `Luottopäätös on käsittelyssä! ⏳\n\nSaat tiedon päätöksestä sähköpostiisi. Käsittelyaika on yleensä 1-3 arkipäivää.`;
      }
      return 'Luottopäätös tehdään kun olet hyväksynyt tarjouksen ja toimittanut tarvittavat dokumentit.\n\nPäätökseen vaikuttavat:\n• Yrityksen taloustiedot\n• Maksuhäiriömerkinnät\n• Yrityksen ikä ja historia\n• Rahoitettavan kohteen arvo';
    }
  },
  // HYLÄTTY LUOTTOPÄÄTÖS
  {
    keywords: ['hylätty', 'ei mennyt läpi', 'kielteinen', 'hylkäys', 'miksi hylättiin'],
    answer: () => 'Jos luottopäätös on kielteinen, syitä voivat olla:\n\n• Maksuhäiriömerkinnät\n• Heikko taloustilanne\n• Yritys liian nuori\n• Liian suuri rahoitustarve\n\n💡 Voit kokeilla:\n• Suurempaa käsirahaa\n• Pienempää rahoitussummaa\n• Hakea uudelleen myöhemmin\n\nOta yhteyttä niin keskustellaan vaihtoehdoista!'
  },

  // ===== RAHOITUSVAIHTOEHDOT =====

  // LEASING PERUSTEET
  {
    keywords: ['leasing', 'lea', 'mitä on leasing', 'miten leasing'],
    answer: () => '📋 Leasing on rahoitusmuoto, jossa:\n\n✅ Vuokraat koneen/laitteen kiinteällä kuukausierällä\n✅ Et sido pääomaa\n✅ Kuukausierä on vähennyskelpoinen kulu\n✅ Sopimuskauden lopussa voit lunastaa, palauttaa tai jatkaa\n\nLeasing sopii erityisesti yrityksille, jotka haluavat pitää käyttöpääoman vapaana ja ennustaa kulut tarkasti.'
  },
  // LEASING VS LAINA
  {
    keywords: ['ero', 'laina', 'pankki', 'luotto', 'rahoitus vai', 'kumpi parempi'],
    answer: () => '📊 Leasing vs. Pankkilaina:\n\n💚 Leasing:\n• Ei sido pääomaa\n• Kiinteä kuukausierä\n• Vähennyskelpoinen kulu\n• Nopea prosessi\n• Kohde vakuutena\n\n🏦 Pankkilaina:\n• Kohde omaksi heti\n• Voi vaatia lisävakuuksia\n• Usein korkosidonnainen\n• Pidempi käsittelyaika\n\nLeasing on yleensä parempi valinta kalustohankintoihin!'
  },
  // LEASING TYYPIT
  {
    keywords: ['rahoitusleasing', 'huoltoleasing', 'käyttöleasing', 'leasing tyyppi'],
    answer: () => '📋 Leasing-tyypit:\n\n1️⃣ Rahoitusleasing (yleisin)\n• Kiinteä kuukausierä\n• Lunastus mahdollinen\n• Sopii koneisiin ja laitteisiin\n\n2️⃣ Käyttöleasing\n• Sisältää usein huollon\n• Lyhyempi sitoutuminen\n• Sopii autoihin\n\n3️⃣ Huoltoleasing\n• Sisältää huolto- ja ylläpitopalvelut\n• Kokonaiskustannus selvillä\n\nJuuri Rahoituksessa käytämme pääasiassa rahoitusleasingiä.'
  },

  // TAKAISINVUOKRAUS
  {
    keywords: ['takaisinvuokraus', 'slb', 'sale-leaseback', 'sale', 'myy', 'omistan jo'],
    answer: () => '💰 Takaisinvuokraus (Sale-Leaseback):\n\nMyyt omistamasi koneen rahoitusyhtiölle ja vuokraat sen takaisin itsellesi.\n\n✅ Edut:\n• Vapautat pääomaa kassaan heti\n• Jatkat koneen käyttöä normaalisti\n• Kiinteä kuukausierä\n• Parantaa kassavirtaa\n\nSopii erinomaisesti käyttöpääoman vahvistamiseen tai uusiin investointeihin!'
  },
  // TAKAISINVUOKRAUS ARVOSTUS
  {
    keywords: ['arvostus', 'paljonko saan', 'koneen arvo', 'arviointi'],
    answer: () => '💎 Koneen arvostus takaisinvuokrauksessa:\n\n• Perustuu kohteen käypään markkina-arvoon\n• Huomioi iän, kunnon ja käyttötunnit\n• Tyypillisesti 60-80% uushankintahinnasta\n\nTee hakemus niin rahoittaja arvioi kohteesi arvon ja tekee tarjouksen!'
  },

  // ===== TALOUDELLISET =====

  // MAKSUT JA KUUKAUSIERÄ
  {
    keywords: ['maksu', 'kuukausi', 'erä', 'hinta', 'kuukausierä', 'maksaa', 'paljonko'],
    answer: () => '💰 Kuukausierä koostuu:\n\n• Pääoman lyhennys\n• Korko\n• Laskutuslisä (n. 9€/kk)\n\nErän suuruuteen vaikuttavat:\n• Rahoitettava summa\n• Sopimuskausi (24-72 kk)\n• Käsiraha\n• Jäännösarvo\n\nTarkka kuukausierä näkyy tarjouksessa. ALV 25,5% lisätään erään.'
  },
  // MAKSUTAVAT
  {
    keywords: ['maksutapa', 'lasku', 'e-lasku', 'suoramaksu', 'miten maksan'],
    answer: () => '💳 Maksutavat:\n\n• E-lasku (suositus)\n• Paperilasku\n• Suoramaksu\n\nLasku tulee kuukausittain ja eräpäivä on tyypillisesti kuun 15. tai viimeinen päivä. Voit vaihtaa maksutapaa ottamalla yhteyttä.'
  },
  // MAKSUVIIVÄSTYKSET
  {
    keywords: ['myöhässä', 'viivästys', 'maksamatta', 'unohdin', 'eräpäivä'],
    answer: () => '⚠️ Jos maksu on myöhässä:\n\n1. Maksa lasku mahdollisimman pian\n2. Myöhästyneestä maksusta peritään viivästyskorko\n3. Toistuvat myöhästymiset voivat johtaa perintään\n\n💡 Jos tiedät etukäteen ongelmista, ota heti yhteyttä - löydämme usein ratkaisun!'
  },
  // MAKSUVAIKEUDET
  {
    keywords: ['maksuvaikeus', 'ei pysty', 'taloudellinen', 'vaikea', 'maksukyky'],
    answer: () => '🆘 Maksuvaikeuksissa toimi näin:\n\n1️⃣ Ota HETI yhteyttä rahoittajaan\n2️⃣ Kerro tilanteesta avoimesti\n3️⃣ Yhdessä etsitään ratkaisu\n\n💚 Mahdollisia järjestelyjä:\n• Maksuajan pidennys\n• Maksuerän pienennys väliaikaisesti\n• Maksuvapaa kuukausi\n\nÄlä jätä laskuja maksamatta ilman yhteydenottoa!'
  },

  // KÄSIRAHA
  {
    keywords: ['käsiraha', 'ennakko', 'alkumaksu', 'omarahoitus', 'ennakkovuokra'],
    answer: () => '💵 Käsiraha (ennakkovuokra):\n\n• Vapaaehtoinen alkumaksu\n• Pienentää rahoitettavaa summaa\n• Laskee kuukausierää\n• Voi parantaa rahoitusehtoja\n\n❓ Onko pakollinen?\nEi! Voit rahoittaa myös 100% kohteen arvosta ilman käsirahaa.'
  },

  // JÄÄNNÖSARVO
  {
    keywords: ['jäännösarvo', 'lunastus', 'osta', 'omaksi', 'loppu', 'sopimuskauden jälkeen'],
    answer: () => '📊 Jäännösarvo:\n\nSumma, jolla voit lunastaa kohteen sopimuskauden päätyttyä.\n\n• Sovitaan etukäteen (tyypillisesti 0-20%)\n• Suurempi jäännösarvo = pienempi kuukausierä\n\n🔚 Sopimuskauden lopussa voit:\n1. Lunastaa kohteen (maksat jäännösarvon)\n2. Palauttaa kohteen\n3. Jatkaa sopimusta uudella kaudella'
  },

  // SOPIMUSKAUSI
  {
    keywords: ['sopimuskausi', 'aika', 'kesto', 'kausi', 'pituus', 'kuinka kauan', 'kauanko'],
    answer: () => '📅 Sopimuskausi:\n\nTyypillisesti 24-72 kuukautta.\n\n⚡ Lyhyempi kausi (24-36 kk):\n• Suurempi kuukausierä\n• Nopeampi lunastus\n• Sopii nopeasti kuluviin kohteisiin\n\n🔄 Pidempi kausi (48-72 kk):\n• Pienempi kuukausierä\n• Sopii kalliimmille kohteille\n• Parempi kassavirta\n\nValitse yrityksellesi sopiva kausi!'
  },

  // ALV JA VEROTUS
  {
    keywords: ['alv', 'vero', 'verotus', 'arvonlisävero', 'vähennys'],
    answer: () => '🧾 ALV ja verotus leasingissä:\n\n✅ ALV-käsittely:\n• Kuukausierään lisätään ALV 25,5%\n• ALV-velvollinen yritys vähentää ALV:n normaalisti\n\n✅ Tuloverotus:\n• Kuukausierät ovat vähennyskelpoista liiketoiminnan kulua\n• Ei poistoja kirjanpitoon\n\nLeasing on verotuksellisesti edullinen tapa hankkia kalustoa!'
  },
  // OSINGOT JA RAHOITUS
  {
    keywords: ['osinko', 'yrityksen raha', 'varallisuus'],
    answer: () => '💼 Leasing ja yrityksen talous:\n\nLeasing ei sido yrityksen pääomaa, joten:\n\n✅ Käyttöpääoma pysyy vapaana\n✅ Osinkoja voidaan jakaa normaalisti\n✅ Tase ei rasitu samalla tavalla kuin lainassa\n✅ Tunnusluvut (esim. omavaraisuus) eivät heikkene yhtä paljon\n\nLeasing on kassavirran kannalta järkevä valinta!'
  },

  // ===== ERITYISTILANTEET =====

  // YRITYSKAUPPA
  {
    keywords: ['yrityskauppa', 'myydä yritys', 'omistajanvaihdos', 'sukupolvenvaihdos'],
    answer: () => '🏢 Leasingsopimus yrityskaupassa:\n\nJos yritys vaihtaa omistajaa:\n\n1. Ilmoita rahoittajalle heti\n2. Sopimus voidaan siirtää uudelle omistajalle\n3. Uusi omistaja käy läpi luottokelpoisuusarvioinnin\n4. Siirto vaatii rahoittajan hyväksynnän\n\nOta yhteyttä ajoissa niin hoidetaan siirto sujuvasti!'
  },
  // KONKURSSI
  {
    keywords: ['konkurssi', 'saneeraus', 'maksukyvytön', 'lopettaa yritys'],
    answer: () => '⚠️ Konkurssi/saneeraustilanteessa:\n\n🔴 Konkurssi:\n• Leasingkohde palautetaan rahoittajalle\n• Pesänhoitaja hoitaa käytännön järjestelyt\n\n🟡 Yrityssaneeraus:\n• Sopimus voidaan usein jatkaa\n• Ehdoista neuvotellaan saneerausohjelmassa\n\n💚 Ota yhteyttä heti kun tilanne selviää - etsitään yhdessä paras ratkaisu!'
  },

  // VAKUUDET
  {
    keywords: ['vakuus', 'takaus', 'henkilötakaus', 'vakuudet'],
    answer: () => '🔐 Vakuudet leasingissä:\n\n✅ Pääsääntöisesti EI tarvita lisävakuuksia\n• Rahoitettava kohde toimii vakuutena\n\n❓ Milloin voidaan pyytää:\n• Henkilötakaus (nuori/pieni yritys)\n• Lisävakuus (erityisen suuri rahoitus)\n\nVakuustarve selviää luottopäätöksen yhteydessä.'
  },

  // KÄYTETYT KONEET
  {
    keywords: ['käytetty', 'vanha', 'käytetyn', 'second hand', 'ikä'],
    answer: () => '🔧 Käytetyt koneet ja laitteet:\n\n✅ Rahoitamme myös käytettyjä koneita!\n\nHuomioitavaa:\n• Kohteen kunto arvioidaan\n• Ikä vaikuttaa sopimuskauden pituuteen\n• Käyttötunnit huomioidaan\n\n💡 Takaisinvuokraus sopii erityisen hyvin jo omistetuille käytetyille koneille!'
  },
  // OHJELMISTOT JA IT
  {
    keywords: ['ohjelmisto', 'software', 'it-laite', 'it-infra', 'tietokone', 'palvelin', 'lisenssi'],
    answer: () => '💻 IT-laitteet ja ohjelmistot:\n\n✅ Rahoitamme:\n• Tietokoneet ja palvelimet\n• IT-infrastruktuuri\n• Tuotannonohjausjärjestelmät\n\n❌ Emme yleensä rahoita:\n• Pelkkiä ohjelmistolisenssejä\n• SaaS-palveluita\n\nLisätietoja? Kysy hakemuksen yhteydessä!'
  },

  // ===== PROSESSI JA TUKI =====

  // PROSESSI JA AIKATAULU
  {
    keywords: ['prosessi', 'miten toimii', 'kuinka toimii', 'toimii', 'kauanko', 'kestää', 'aikataulu', 'nopea'],
    answer: () => '⚡ Rahoitusprosessi vaihe vaiheelta:\n\n1️⃣ Hakemus (5 min)\n2️⃣ Tarjous (1-2 arkipäivää)\n3️⃣ Hyväksyntä + dokumentit\n4️⃣ Luottopäätös (1-3 arkipäivää)\n5️⃣ Sopimus allekirjoitettavaksi\n6️⃣ Rahoitus aktivoituu!\n\n📅 Kokonaisuudessaan tyypillisesti 3-7 arkipäivää. Kiireellisissä tapauksissa jopa nopeammin!'
  },
  // NOPEUTTAMINEN
  {
    keywords: ['nopeuttaa', 'nopeammin', 'kiire', 'heti', 'pikaisesti'],
    answer: () => '⚡ Näin nopeutat prosessia:\n\n1. Täytä hakemus huolellisesti\n2. Lisää kaikki dokumentit heti\n3. Vastaa lisätietopyyntöihin nopeasti\n4. Mainitse kiireestä hakemuksessa\n\n💡 Kiireellisissä tapauksissa lähetä viesti hakemuksesi kautta!'
  },

  // ASIAKASPALVELU
  {
    keywords: ['yhteyttä', 'apu', 'apua', 'ihminen', 'puhelin', 'soita', 'asiakaspalvelu', 'kontakti', 'sähköposti', 'saan apua'],
    answer: () => '📞 Ota yhteyttä:\n\n💬 Nopein tapa: Viesti hakemuksen kautta\n→ Rahoittaja näkee kaikki tietosi suoraan\n\n📧 Sähköposti: info@juurirahoitus.fi\n\nHakemuksesi kautta lähetetty viesti menee suoraan rahoittajalle ja saat nopeimman vastauksen!'
  },
  // TAKAISINSOITTO
  {
    keywords: ['takaisinsoitto', 'soittaa', 'puhelinnumero', 'soittopyyntö'],
    answer: () => '📞 Haluatko takaisinsoiton?\n\nLähetä viesti hakemuksesi kautta ja kerro:\n• Puhelinnumerosi\n• Sopiva soittoaika\n• Mitä asia koskee\n\nRahoittaja soittaa sinulle sovittuna aikana!'
  },

  // MIKSI JUURIRAHOITUS
  {
    keywords: ['miksi', 'ero muihin', 'kilpailija', 'parempi', 'juuri', 'juurirahoitus'],
    answer: () => '💚 Miksi Juuri Rahoitus?\n\n✅ Nopea prosessi (jopa 3 päivää)\n✅ Kilpailukykyiset ehdot\n✅ Henkilökohtainen palvelu\n✅ Erikoistunut konerahoitukseen\n✅ Suomalainen toimija\n✅ Joustava ja ymmärtävä\n\nMe ymmärrämme yrittäjän arkea ja teemme rahoituksesta helppoa!'
  },

  // ===== PERUSTOIMINNOT =====

  // YRITYSTIEDOT JA YTJ
  {
    keywords: ['yritys', 'ytj', 'tiedot', 'y-tunnus', 'yrityksen'],
    answer: (ctx) => {
      if (ctx.ytjData) {
        const ytj = ctx.ytjData;
        return `Yrityksesi tiedot YTJ:stä:\n\n🏢 ${ytj.name || ctx.companyName}\n📍 ${ytj.address || 'Osoite ei saatavilla'}\n🏭 Toimiala: ${ytj.industry || 'Ei tiedossa'}\n📅 Perustettu: ${ytj.registrationDate || 'Ei tiedossa'}\n\nTiedot haetaan automaattisesti hakemuksen yhteydessä.`;
      }
      return `Yritystietosi (${ctx.companyName}) haetaan automaattisesti YTJ:stä hakemuksen yhteydessä.`;
    }
  },

  // MITÄ RAHOITETAAN
  {
    keywords: ['kohde', 'laite', 'kone', 'rahoite', 'rahoitettav', 'auto', 'kuorma', 'traktori', 'kaivinkone'],
    answer: () => '🏗️ Rahoitamme laajasti erilaisia koneita:\n\n🚛 Kuorma-autot ja perävaunut\n🚜 Maatalous- ja metsäkoneet\n🏗️ Kaivurit ja pyöräkuormaajat\n🏭 Tuotantolaitteet\n💻 IT-laitteet\n🔧 Työkalut ja erikoiskoneet\n\nJos et ole varma, kysy - arvioimme jokaisen hakemuksen!'
  },

  // SEURAAVA VAIHE
  {
    keywords: ['seuraava', 'mitä nyt', 'teen', 'pitää', 'tehdä'],
    answer: (ctx) => {
      const app = ctx.applications[0];
      if (!app) return 'Sinulla ei ole vielä hakemusta. Tee uusi hakemus etusivulta!';
      
      switch (app.status) {
        case 'SUBMITTED':
          return 'Hakemuksesi on vastaanotettu! ✅\n\nSeuraavaksi rahoittaja käsittelee hakemuksesi ja lähettää tarjouksen. Tämä kestää yleensä 1-2 arkipäivää.';
        case 'OFFER_SENT':
          return 'Sinulla on tarjous odottamassa! 🎉\n\nSeuraavaksi:\n1. Tarkista tarjous\n2. Hyväksy ja hae luottopäätös\n3. Toimita pyydetyt dokumentit';
        case 'OFFER_ACCEPTED':
        case 'CREDIT_DECISION_PENDING':
          return 'Luottopäätös on käsittelyssä! ⏳\n\nSeuraavaksi:\n• Toimita pyydetyt dokumentit jos et ole vielä\n• Odota luottopäätöstä (1-3 arkipäivää)';
        case 'CONTRACT_SENT':
          return 'Sopimus odottaa allekirjoitustasi! 📝\n\nSeuraavaksi:\n1. Lataa ja tarkista sopimus\n2. Allekirjoita sähköisesti\n3. Rahoitus aktivoituu!';
        default:
          return `Hakemuksesi tila: ${getStatusLabel(app.status)}\n\nAvaa hakemus nähdäksesi lisätiedot.`;
      }
    },
    actions: (ctx, nav) => {
      if (ctx.applications.length > 0) {
        return [{ label: 'Avaa hakemus', icon: <FileText className="w-4 h-4" />, action: () => nav(`/dashboard/applications/${ctx.applications[0].id}`), variant: 'primary' }];
      }
      return [];
    }
  },

  // ===== YLEISET =====

  // TERVEHDYKSET
  {
    keywords: ['terve', 'moi', 'hei', 'hello', 'hyvää', 'päivää', 'huomenta', 'iltaa'],
    answer: (ctx) => `Hei ${ctx.userName}! 👋\n\nOlen Juuri-avustajasi. Tunnen yrityksesi ${ctx.companyName} ja hakemustesi tilanteen.\n\nKysy rohkeasti rahoituksesta, prosessista tai hakemuksestasi!`
  },
  // KIITOKSET
  {
    keywords: ['kiitos', 'thanks', 'ok', 'selvä', 'jees', 'hyvä', 'kyllä'],
    answer: () => 'Ole hyvä! 😊 Olen täällä jos tarvitset lisäapua. Onnea rahoitushakemukseen!'
  },
  // ONGELMAT
  {
    keywords: ['ongelma', 'virhe', 'ei toimi', 'vika', 'bugi', 'jumissa'],
    answer: () => '🔧 Jos kohtaat teknisiä ongelmia:\n\n1. Päivitä sivu (F5)\n2. Tyhjennä selaimen välimuisti\n3. Kokeile toisella selaimella\n\n💬 Jos ongelma jatkuu:\nLähetä viesti hakemuksesi kautta tai info@juurirahoitus.fi'
  },
  // TURVALLISUUS
  {
    keywords: ['turvalli', 'luotettav', 'tietoturv', 'yksityisyys', 'gdpr', 'tiedot'],
    answer: () => '🔒 Tietoturva ja luotettavuus:\n\n✅ Salattu HTTPS-yhteys\n✅ EU:n tietosuoja-asetus (GDPR)\n✅ Tiedot säilytetään Suomessa\n✅ Suomalainen toimija\n\nTietosi ovat turvassa meillä!'
  }
];

function findContextualAnswer(question: string, context: UserContext, navigate: any): { answer: string; actions: QuickAction[] } {
  const q = question.toLowerCase();
  
  for (const item of portalKnowledge) {
    if (item.keywords.some(kw => q.includes(kw))) {
      return {
        answer: item.answer(context),
        actions: item.actions ? item.actions(context, navigate) : []
      };
    }
  }
  
  // Default response with smart suggestions based on context
  const suggestions: string[] = [];
  const defaultActions: QuickAction[] = [];
  
  // Contextual suggestions
  if (context.applications.some(a => a.status === 'OFFER_SENT')) {
    suggestions.push('• "Näytä tarjoukseni"');
  }
  if (context.applications.some(a => a.status === 'INFO_REQUESTED')) {
    suggestions.push('• "Mitä dokumentteja tarvitaan?"');
  }
  if (context.applications.some(a => a.status === 'CONTRACT_SENT')) {
    suggestions.push('• "Miten allekirjoitan sopimuksen?"');
  }
  
  // General suggestions
  suggestions.push('• "Missä hakemukseni on?"');
  suggestions.push('• "Mitä seuraavaksi?"');
  suggestions.push('• "Mitä on leasing?"');
  suggestions.push('• "Miten prosessi toimii?"');
  suggestions.push('• "Miten saan apua?"');
  
  // Add action button
  if (context.applications.length > 0) {
    defaultActions.push({ 
      label: 'Avaa hakemukseni', 
      icon: <FileText className="w-4 h-4" />, 
      action: () => navigate(`/dashboard/applications/${context.applications[0].id}`), 
      variant: 'primary' 
    });
  }
  
  return {
    answer: `Hyvä kysymys, ${context.userName}! 🤔\n\nVoit kysyä minulta esimerkiksi:\n\n${suggestions.slice(0, 5).join('\n')}\n\nTai kirjoita oma kysymyksesi alla olevaan kenttään.`,
    actions: defaultActions
  };
}

// Generate smart suggestions based on user's current situation
function getSmartSuggestions(context: UserContext, navigate: any): QuickAction[] {
  const suggestions: QuickAction[] = [];
  
  // Check for pending offers
  const offerPending = context.applications.find(a => a.status === 'OFFER_SENT' || a.status === 'OFFER_RECEIVED');
  if (offerPending) {
    suggestions.push({
      label: '🎉 Tarjous odottaa!',
      action: () => navigate(`/dashboard/applications/${offerPending.id}`),
      variant: 'primary'
    });
  }
  
  // Check for info requests
  const infoRequest = context.applications.find(a => a.status === 'INFO_REQUESTED');
  if (infoRequest) {
    suggestions.push({
      label: '📎 Lisätietoja pyydetty',
      action: () => navigate(`/dashboard/applications/${infoRequest.id}`),
      variant: 'primary'
    });
  }
  
  // Check for contracts
  const contractPending = context.applications.find(a => a.status === 'CONTRACT_SENT');
  if (contractPending) {
    suggestions.push({
      label: '📝 Sopimus odottaa',
      action: () => navigate(`/dashboard/applications/${contractPending.id}`),
      variant: 'primary'
    });
  }
  
  // Default suggestions if nothing pending
  if (suggestions.length === 0) {
    suggestions.push({
      label: 'Missä hakemukseni on?',
      action: () => {}, // Will trigger chat
      variant: 'secondary'
    });
    suggestions.push({
      label: 'Miten saan apua?',
      action: () => {},
      variant: 'secondary'
    });
  }
  
  return suggestions.slice(0, 3);
}

interface PortalAssistantProps {
  variant?: 'customer' | 'financier';
}

export default function PortalAssistant({ variant = 'customer' }: PortalAssistantProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext>({
    userName: '',
    companyName: '',
    applications: [],
    ytjData: null,
    pendingActions: [],
    currentPage: location.pathname
  });
  const [smartSuggestions, setSmartSuggestions] = useState<QuickAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user context
  useEffect(() => {
    const loadContext = async () => {
      if (!user || !isSupabaseConfigured()) return;
      
      try {
        // Get user's applications - pass email too since apps might be linked by email only
        const { data: apps } = await applications.list(user.id, 'CUSTOMER', user.email);
        
        // Get YTJ data from first application if available
        let ytjData = null;
        if (apps && apps.length > 0 && apps[0].ytj_data) {
          ytjData = apps[0].ytj_data;
        }
        
        // Build context
        const context: UserContext = {
          userName: user.first_name || user.email?.split('@')[0] || 'asiakas',
          companyName: apps?.[0]?.company_name || 'yrityksesi',
          applications: apps || [],
          ytjData,
          pendingActions: [],
          currentPage: location.pathname
        };
        
        // Calculate pending actions
        if (apps?.some((a: any) => a.status === 'INFO_REQUESTED')) {
          context.pendingActions.push('Lisätietoja pyydetty');
        }
        if (apps?.some((a: any) => a.status === 'OFFER_SENT')) {
          context.pendingActions.push('Tarjous odottaa');
        }
        if (apps?.some((a: any) => a.status === 'CONTRACT_SENT')) {
          context.pendingActions.push('Sopimus allekirjoitettavaksi');
        }
        
        setUserContext(context);
        setSmartSuggestions(getSmartSuggestions(context, navigate));
        
        // Set initial greeting
        setMessages([{
          id: 0,
          role: 'bot',
          content: getInitialGreeting(context),
          timestamp: new Date(),
          actions: getSmartSuggestions(context, navigate)
        }]);
        
      } catch (error) {
        console.error('Error loading assistant context:', error);
      }
    };
    
    loadContext();
  }, [user, location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getInitialGreeting = (ctx: UserContext): string => {
    const greetings = [];
    greetings.push(`Hei ${ctx.userName}! 👋`);
    
    if (ctx.pendingActions.length > 0) {
      greetings.push(`\nHuomasin että sinulla on odottavia toimenpiteitä:`);
      ctx.pendingActions.forEach(action => {
        greetings.push(`• ${action}`);
      });
      greetings.push('\nMiten voin auttaa?');
    } else if (ctx.applications.length > 0) {
      greetings.push(`\nNäen hakemuksesi yritykselle ${ctx.companyName}. Miten voin auttaa?`);
    } else {
      greetings.push('\nOlen Juuri-avustajasi. Miten voin auttaa sinua tänään?');
    }
    
    return greetings.join('\n');
  };

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Find contextual answer
    setTimeout(() => {
      const { answer, actions } = findContextualAnswer(messageText, userContext, navigate);
      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        content: answer,
        timestamp: new Date(),
        actions
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.label.includes('?')) {
      // It's a question - send as chat message
      handleSend(action.label);
    } else {
      // It's a navigation action
      action.action();
      setIsOpen(false);
    }
  };

  // Don't show on landing page
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center ${isOpen ? 'hidden' : ''}`}
      >
        <HelpCircle className="w-6 h-6" />
        {userContext.pendingActions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold animate-pulse">
            {userContext.pendingActions.length}
          </span>
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Juuri Avustaja</p>
                  <p className="text-emerald-100 text-xs flex items-center">
                    <span className="w-2 h-2 bg-green-300 rounded-full mr-1 animate-pulse"></span>
                    Tunnen tilanteesi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context banner if pending actions */}
            {userContext.pendingActions.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                <p className="text-amber-800 text-xs font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {userContext.pendingActions.length} odottavaa toimenpidettä
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 ml-2">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(action)}
                          className={`text-xs px-3 py-1.5 rounded-full flex items-center space-x-1 transition-all ${
                            action.variant === 'primary'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 shadow-sm border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && smartSuggestions.length > 0 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Pikatoiminnot:</p>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(suggestion)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        suggestion.variant === 'primary'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex space-x-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Kysy mitä vain..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
