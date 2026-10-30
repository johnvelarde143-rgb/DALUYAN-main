export type MunicipalityVisual = {
  municipality_name: string;
  municipality_code: string;
  image_url: string;
  image_title: string;
  image_category: string;
  source_name: string;
  source_url: string;
  attribution_text: string;
  is_verified: boolean;
  display_order: number;
  is_active: boolean;
};

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;

export const municipalityVisuals: MunicipalityVisual[] = [
  {
    municipality_name: "Boac", municipality_code: "boac",
    image_url: commons("Boac Cathedral Marinduque.jpg"), image_title: "Boac Cathedral",
    image_category: "Built heritage", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Boac_Cathedral_Marinduque.jpg",
    attribution_text: "Ranieljosecastaneda · CC BY-SA 4.0", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Boac", municipality_code: "boac",
    image_url: "/landscape-1.svg", image_title: "DALUYAN heritage fallback",
    image_category: "DALUYAN placeholder", source_name: "DALUYAN",
    source_url: "https://marinduque.gov.ph/places-of-interest-and-contact-persons/",
    attribution_text: "Original DALUYAN illustration; official place reference", is_verified: false, display_order: 2, is_active: true,
  },
  {
    municipality_name: "Mogpog", municipality_code: "mogpog",
    image_url: commons("Balanacan Cove Lake.JPG"), image_title: "Balanacan Cove",
    image_category: "Coastal landscape", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Mogpog",
    attribution_text: "Wikimedia Commons · see file page for license", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Mogpog", municipality_code: "mogpog",
    image_url: "/landscape-2.svg", image_title: "DALUYAN cultural fallback",
    image_category: "DALUYAN placeholder", source_name: "DALUYAN",
    source_url: "https://marinduque.gov.ph/provincial-government-of-marinduque-honors-dot-for-cultural-tourism-development-caravan/",
    attribution_text: "Original DALUYAN illustration; official Moriones reference", is_verified: false, display_order: 2, is_active: true,
  },
  {
    municipality_name: "Gasan", municipality_code: "gasan",
    image_url: commons("Gasan Church, Marinduque.jpg"), image_title: "Gasan Church",
    image_category: "Built heritage", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Gasan_Church,_Marinduque.jpg",
    attribution_text: "Joelaldor · CC BY-SA 4.0", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Gasan", municipality_code: "gasan",
    image_url: commons("San Jose Esposo de Maria Parish Church, Gasan, Marinduque.jpg"), image_title: "San Jose Esposo de Maria Parish Church",
    image_category: "Built heritage", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:San_Jose_Esposo_de_Maria_Parish_Church,_Gasan,_Marinduque.jpg",
    attribution_text: "Joelaldor · CC BY 3.0", is_verified: true, display_order: 2, is_active: true,
  },
  {
    municipality_name: "Buenavista", municipality_code: "buenavista",
    image_url: commons("Malbog Hot Spring.jpg"), image_title: "Malbog Hot Spring",
    image_category: "Nature and wellness", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Buenavista,_Marinduque",
    attribution_text: "Wikimedia Commons · see file page for license", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Buenavista", municipality_code: "buenavista",
    image_url: commons("Buenavista Town Park.jpg"), image_title: "Buenavista Town Park",
    image_category: "Community scene", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Buenavista,_Marinduque",
    attribution_text: "Wikimedia Commons · see file page for license", is_verified: true, display_order: 2, is_active: true,
  },
  {
    municipality_name: "Santa Cruz", municipality_code: "santa-cruz",
    image_url: commons("Santa Cruz de Napo Church, Marinduque.jpg"), image_title: "Santa Cruz de Napo Church",
    image_category: "Built heritage", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Santa_Cruz_de_Napo_Church,_Marinduque.jpg",
    attribution_text: "Joelaldor · CC BY-SA 4.0", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Santa Cruz", municipality_code: "santa-cruz",
    image_url: commons("Santa Cruz Marinduque Monte de Ramos Buntal Talipot bagsB.jpg"), image_title: "Santa Cruz buntal and talipot craft",
    image_category: "Local craft", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Santa_Cruz,_Marinduque",
    attribution_text: "Wikimedia Commons · see file page for license", is_verified: true, display_order: 2, is_active: true,
  },
  {
    municipality_name: "Torrijos", municipality_code: "torrijos",
    image_url: commons("Boac - Mogpog - Santa Cruz - Torrijos Rd, Torrijos, Marinduque, Philippines - panoramio.jpg"), image_title: "Torrijos road landscape",
    image_category: "Landscape", source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Boac_-_Mogpog_-_Santa_Cruz_-_Torrijos_Rd,_Torrijos,_Marinduque,_Philippines_-_panoramio.jpg",
    attribution_text: "Mozhar · CC BY-SA 3.0", is_verified: true, display_order: 1, is_active: true,
  },
  {
    municipality_name: "Torrijos", municipality_code: "torrijos",
    image_url: commons("Ang Labanan sa Pulang Lupa historical marker.jpg"), image_title: "Pulang Lupa historical marker",
    image_category: "History", source_name: "Wikimedia Commons / NHCP marker",
    source_url: "https://commons.wikimedia.org/wiki/File:Ang_Labanan_sa_Pulang_Lupa_historical_marker.jpg",
    attribution_text: "Wikimedia Commons · see file page for license", is_verified: true, display_order: 2, is_active: true,
  },
];
