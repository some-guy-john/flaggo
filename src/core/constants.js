export const OPTIONAL_COUNTRIES = [
  { name: "Taiwan", code: "tw", aliases: ["republic of china"] },
  { name: "Kosovo", code: "xk", aliases: ["republic of kosovo"] }
];

export const MAX_GUESSES = 6;
export const TOTAL_TILES = 6;
export const MODE_STORAGE_KEY = "flaggo-mode-v2";
export const THEME_STORAGE_KEY = "flaggo-theme";
export const SITE_ZOOM_STORAGE_KEY = "flaggo-site-zoom";
export const RECOGNITION_STORAGE_KEY = "flaggo-recognition-options";
export const SITE_ZOOM_MIN = 0.85;
export const SITE_ZOOM_MAX = 1.15;
export const SITE_ZOOM_STEP = 0.05;
export const HEAT_BANDS_KM = {
  hot: 250,
  warm: 1000
};
export const GLOBE_ZOOM_MIN = 0.7;
export const GLOBE_ZOOM_MAX = 3.2;
export const GLOBE_ZOOM_BUTTON_FACTOR = 1.2;
export const GLOBE_WHEEL_SENSITIVITY = 0.0015;
export const ATLAS_ZOOM_MAX = 32;
export const ATLAS_ZOOM_BUTTON_FACTOR = 1.6;
export const ATLAS_DETAIL_ZOOM = 2;
export const ATLAS_OVERVIEW_TOLERANCE = 0.04;
export const ATLAS_PATH_CACHE_LIMIT = 4;
export const MAP_FEATURE_CODE_OVERRIDES = new Map([
  ["France", "fr"],
  ["Norway", "no"],
  ["Israel", "ps"],
  ["Taiwan", "tw"],
  ["Kosovo", "xk"]
]);
export const OPTIONAL_COUNTRY_CENTROIDS = [
  { code: "xk", lat: 42.5735, lng: 20.8705 },
  { code: "tw", lat: 23.7451, lng: 120.9498 }
];
export const ATLAS_SETS = [
  { id: "world", label: "All countries", kind: "countries", region: null },
  { id: "africa", label: "All countries in Africa", kind: "countries", region: "africa" },
  { id: "asia", label: "All countries in Asia", kind: "countries", region: "asia" },
  { id: "europe", label: "All countries in Europe", kind: "countries", region: "europe" },
  { id: "north-america", label: "All countries in North America", kind: "countries", region: "north-america" },
  { id: "south-america", label: "All countries in South America", kind: "countries", region: "south-america" },
  { id: "oceania", label: "All countries in Oceania", kind: "countries", region: "oceania" },
  { id: "oceans", label: "Oceans", kind: "oceans" },
  { id: "seas", label: "Seas & gulfs", kind: "seas" },
  { id: "islands", label: "Major islands", kind: "islands" },
  { id: "continents", label: "The seven continents", kind: "continents" }
];
export const ATLAS_SET_IDS = new Set(ATLAS_SETS.map((set) => set.id));
export const CAPITALS_REGIONS = new Set(["world", "africa", "asia", "europe", "north-america", "south-america", "oceania"]);
export const COUNTRY_REGION_BY_CODE = new Map([
  ["africa", "ao bf bi bj bw cd cf cg ci cm cv dj dz eg er et ga gh gm gn gq gw ke km lr ls ly ma mg ml mr mu mw mz na ne ng rw sc sd sl sn so ss st sz td tg tn tz ug za zm zw"],
  ["asia", "ae af am az bd bh bn bt cn ge id in iq ir jo jp kg kh kp kr kw kz la lb lk mm mn mv my np om ph pk ps qa sa sg sy th tj tl tm tr tw uz vn ye"],
  ["europe", "ad al at ba be bg by ch cy cz de dk ee es fi fr gb gr hr hu ie is it li lt lu lv mc md me mk mt nl no pl pt ro rs ru se si sk sm ua va xk"],
  ["north-america", "ag bb bs bz ca cr cu dm do gd gt hn ht jm kn lc mx ni pa sv tt us vc"],
  ["oceania", "au fj fm ki mh nr nz pg pw sb to tv vu ws"],
  ["south-america", "ar bo br cl co ec gy pe py sr uy ve"]
].flatMap(([region, codes]) => codes.split(" ").map((code) => [code, region])));
export const ATLAS_PHYSICAL_PLACES = [
  { id: "gulf_of_mexico", name: "Gulf of Mexico", kind: "waters", aliases: [] },
  { id: "philippine_sea", name: "Philippine Sea", kind: "waters", aliases: [] },
  { id: "southern_ocean", name: "Southern Ocean", kind: "waters", aliases: ["antarctic ocean"] },
  { id: "gulf_of_thailand", name: "Gulf of Thailand", kind: "waters", aliases: [] },
  { id: "pacific_ocean", name: "Pacific Ocean", kind: "waters", aliases: [] },
  { id: "atlantic_ocean", name: "Atlantic Ocean", kind: "waters", aliases: [] },
  { id: "indian_ocean", name: "Indian Ocean", kind: "waters", aliases: [] },
  { id: "arctic_ocean", name: "Arctic Ocean", kind: "waters", aliases: [] },
  { id: "hudson_bay", name: "Hudson Bay", kind: "waters", aliases: [] },
  { id: "labrador_sea", name: "Labrador Sea", kind: "waters", aliases: [] },
  { id: "white_sea", name: "White Sea", kind: "waters", aliases: [] },
  { id: "denmark_strait", name: "Denmark Strait", kind: "waters", aliases: [] },
  { id: "norwegian_sea", name: "Norwegian Sea", kind: "waters", aliases: [] },
  { id: "baltic_sea", name: "Baltic Sea", kind: "waters", aliases: [] },
  { id: "celtic_sea", name: "Celtic Sea", kind: "waters", aliases: [] },
  { id: "english_channel", name: "English Channel", kind: "waters", aliases: ["la manche"] },
  { id: "adriatic_sea", name: "Adriatic Sea", kind: "waters", aliases: [] },
  { id: "bay_of_biscay", name: "Bay of Biscay", kind: "waters", aliases: [] },
  { id: "black_sea", name: "Black Sea", kind: "waters", aliases: [] },
  { id: "aegean_sea", name: "Aegean Sea", kind: "waters", aliases: [] },
  { id: "caspian_sea", name: "Caspian Sea", kind: "waters", aliases: [] },
  { id: "mediterranean_sea", name: "Mediterranean Sea", kind: "waters", aliases: [] },
  { id: "east_siberian_sea", name: "East Siberian Sea", kind: "waters", aliases: [] },
  { id: "bering_strait", name: "Bering Strait", kind: "waters", aliases: [] },
  { id: "arabian_sea", name: "Arabian Sea", kind: "waters", aliases: [] },
  { id: "red_sea", name: "Red Sea", kind: "waters", aliases: [] },
  { id: "dead_sea", name: "Dead Sea", kind: "waters", aliases: [] },
  { id: "bay_of_bengal", name: "Bay of Bengal", kind: "waters", aliases: [] },
  { id: "sea_of_japan", name: "Sea of Japan", kind: "waters", aliases: ["east sea"] },
  { id: "yellow_sea", name: "Yellow Sea", kind: "waters", aliases: [] },
  { id: "coral_sea", name: "Coral Sea", kind: "waters", aliases: [] },
  { id: "south_china_sea", name: "South China Sea", kind: "waters", aliases: [] },
  { id: "tasman_sea", name: "Tasman Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_carpentaria", name: "Gulf of Carpentaria", kind: "waters", aliases: [] },
  { id: "aral_sea", name: "Aral Sea", kind: "waters", aliases: [] },
  { id: "persian_gulf", name: "Persian Gulf", kind: "waters", aliases: ["arabian gulf"] },
  { id: "caribbean_sea", name: "Caribbean Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_california", name: "Gulf of California", kind: "waters", aliases: ["sea of cortez", "sea of cortés"] },
  { id: "sea_of_galilee", name: "Sea of Galilee", kind: "waters", aliases: ["lake tiberias", "lake kinneret"] },
  { id: "banda_sea", name: "Banda Sea", kind: "waters", aliases: [] },
  { id: "barents_sea", name: "Barents Sea", kind: "waters", aliases: [] },
  { id: "celebes_sea", name: "Celebes Sea", kind: "waters", aliases: ["sulawesi sea"] },
  { id: "east_china_sea", name: "East China Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_alaska", name: "Gulf of Alaska", kind: "waters", aliases: [] },
  { id: "gulf_of_guinea", name: "Gulf of Guinea", kind: "waters", aliases: [] },
  { id: "north_sea", name: "North Sea", kind: "waters", aliases: [] },
  { id: "sea_of_okhotsk", name: "Sea of Okhotsk", kind: "waters", aliases: [] },
  { id: "timor_sea", name: "Timor Sea", kind: "waters", aliases: [] },
  { id: "europe", name: "Europe", kind: "continents", aliases: [] },
  { id: "north_america", name: "North America", kind: "continents", aliases: [] },
  { id: "south_america", name: "South America", kind: "continents", aliases: [] },
  { id: "asia", name: "Asia", kind: "continents", aliases: [] },
  { id: "africa", name: "Africa", kind: "continents", aliases: [] },
  { id: "oceania", name: "Oceania", kind: "continents", aliases: [] },
  { id: "antarctica", name: "Antarctica", kind: "continents", aliases: [] }
];
export const ATLAS_ISLANDS = [
  { id: "isle_of_man", name: "Isle of Man", kind: "islands", aliases: ["mann"] },
  { id: "reunion", name: "Réunion", kind: "islands", aliases: ["reunion"] },
  { id: "falkland_islands", name: "Falkland Islands", kind: "islands", aliases: ["falklands", "islas malvinas", "malvinas"] },
  { id: "faroe_islands", name: "Faroe Islands", kind: "islands", aliases: ["faroes"] },
  { id: "azores", name: "Azores", kind: "islands", aliases: [] },
  { id: "canary_islands", name: "Canary Islands", kind: "islands", aliases: ["canaries"] },
  { id: "svalbard", name: "Svalbard", kind: "islands", aliases: ["spitsbergen"] },
  { id: "galapagos_islands", name: "Galápagos Islands", kind: "islands", aliases: ["galapagos"] }
];
export const ATLAS_PHYSICAL_COORDINATES = new Map([
  ["gulf_of_mexico", [-90, 24]],
  ["philippine_sea", [134, 20]],
  ["southern_ocean", [0, -60]],
  ["gulf_of_thailand", [101, 9]],
  ["pacific_ocean", [-150, 0]],
  ["atlantic_ocean", [-30, 0]],
  ["indian_ocean", [80, -20]],
  ["arctic_ocean", [0, 82]],
  ["hudson_bay", [-85, 60]],
  ["labrador_sea", [-55, 57]],
  ["white_sea", [36.5, 65]],
  ["denmark_strait", [-28, 66]],
  ["norwegian_sea", [3, 68]],
  ["baltic_sea", [19, 58]],
  ["celtic_sea", [-8, 50]],
  ["english_channel", [-1.5, 50]],
  ["adriatic_sea", [15, 43]],
  ["bay_of_biscay", [-5, 46]],
  ["black_sea", [34, 44]],
  ["aegean_sea", [25, 39]],
  ["caspian_sea", [51, 42]],
  ["mediterranean_sea", [18, 35]],
  ["east_siberian_sea", [165, 72]],
  ["bering_strait", [-169, 66]],
  ["arabian_sea", [65, 15]],
  ["red_sea", [38, 20]],
  ["dead_sea", [35.5, 31.5]],
  ["bay_of_bengal", [88, 15]],
  ["sea_of_japan", [135, 40]],
  ["yellow_sea", [123, 35]],
  ["coral_sea", [155, -20]],
  ["south_china_sea", [115, 14]],
  ["tasman_sea", [160, -40]],
  ["gulf_of_carpentaria", [139, -15]],
  ["aral_sea", [60.5, 45]],
  ["persian_gulf", [51, 27]],
  ["caribbean_sea", [-75, 15]],
  ["gulf_of_california", [-110, 28]],
  ["sea_of_galilee", [35.6, 32.8]],
  ["banda_sea", [128, -5]],
  ["barents_sea", [40, 75]],
  ["celebes_sea", [122, 3]],
  ["east_china_sea", [125, 28]],
  ["gulf_of_alaska", [-145, 57]],
  ["gulf_of_guinea", [2, 1]],
  ["north_sea", [3, 56]],
  ["sea_of_okhotsk", [150, 53]],
  ["timor_sea", [127, -11]],
  ["isle_of_man", [-4.55, 54.23]],
  ["reunion", [55.53, -21.12]],
  ["falkland_islands", [-59.5, -51.75]],
  ["faroe_islands", [-6.8, 62]],
  ["azores", [-28, 38.6]],
  ["canary_islands", [-15.6, 28.1]],
  ["svalbard", [15.6, 78.2]],
  ["galapagos_islands", [-90.4, -0.6]]
]);
export const ATLAS_WATER_FALLBACK_AREAS = new Map([
  ["celtic_sea", [22, 14, -18]],
  ["bering_strait", [15, 22, 12]],
  ["dead_sea", [9, 18, -8]],
  ["aral_sea", [15, 12, 0]],
  ["sea_of_galilee", [8, 12, 0]]
]);

export const PALETTES = {
  sage: {
    light: {'--bg':'#f4f5f2','--surface':'#fafaf7','--fg':'#2c302d','--muted':'#777c74','--border':'#e2e5df','--accent':'#6b8b7a','--accent-hover':'#557364','--accent-soft':'rgba(107,139,122,0.08)','--success':'#7aaa8a','--success-soft':'rgba(122,170,138,0.1)','--danger':'#c47a6b','--danger-soft':'rgba(196,122,107,0.08)','--warning':'#d4a56a','--heat-cold':'#98b7c5','--heat-warm':'#d4a56a','--heat-hot':'#c47a6b'},
    dark: {'--bg':'#1a1c19','--surface':'#242722','--fg':'#e4e6e0','--muted':'#92988b','--border':'#353830','--accent':'#8db8a0','--accent-hover':'#a3cdb5','--accent-soft':'rgba(141,184,160,0.12)','--success':'#8db89a','--success-soft':'rgba(141,184,154,0.12)','--danger':'#d99585','--danger-soft':'rgba(217,149,133,0.1)','--warning':'#e0b87c','--heat-cold':'#82a6b8','--heat-warm':'#e0b87c','--heat-hot':'#d99585'}
  },
  lavender: {
    light: {'--bg':'#f6f5f9','--surface':'#fdfcfd','--fg':'#2d2a35','--muted':'#7a7688','--border':'#e5e3ec','--accent':'#8b7d9e','--accent-hover':'#736588','--accent-soft':'rgba(139,125,158,0.08)','--success':'#8a9e8a','--success-soft':'rgba(138,158,138,0.1)','--danger':'#c47a7a','--danger-soft':'rgba(196,122,122,0.08)','--warning':'#c4a47a','--heat-cold':'#9a98c0','--heat-warm':'#c4a47a','--heat-hot':'#c47a7a'},
    dark: {'--bg':'#1c1a22','--surface':'#26242e','--fg':'#e5e3ec','--muted':'#9b96a8','--border':'#353340','--accent':'#ad9ec0','--accent-hover':'#c0b3d1','--accent-soft':'rgba(173,158,192,0.12)','--success':'#9ec0a2','--success-soft':'rgba(158,192,162,0.12)','--danger':'#d9a09a','--danger-soft':'rgba(217,160,154,0.1)','--warning':'#d9b89a','--heat-cold':'#a9a6cf','--heat-warm':'#d9b89a','--heat-hot':'#d9a09a'}
  },
  ochre: {
    light: {'--bg':'#faf7f2','--surface':'#fefdf9','--fg':'#3d3228','--muted':'#8a7a68','--border':'#ece5db','--accent':'#c4956a','--accent-hover':'#a87b52','--accent-soft':'rgba(196,149,106,0.08)','--success':'#899b6a','--success-soft':'rgba(137,155,106,0.1)','--danger':'#c47a6b','--danger-soft':'rgba(196,122,107,0.08)','--warning':'#c4a55a','--heat-cold':'#a0b8b0','--heat-warm':'#c4a55a','--heat-hot':'#c47a6b'},
    dark: {'--bg':'#1f1c17','--surface':'#2a2620','--fg':'#ebe5d8','--muted':'#a09880','--border':'#3d362d','--accent':'#d4a875','--accent-hover':'#e0bb90','--accent-soft':'rgba(212,168,117,0.12)','--success':'#a0b880','--success-soft':'rgba(160,184,128,0.12)','--danger':'#d9a090','--danger-soft':'rgba(217,160,144,0.1)','--warning':'#d9b878','--heat-cold':'#b0c5bb','--heat-warm':'#d9b878','--heat-hot':'#d9a090'}
  },
  ocean: {
    light: {'--bg':'#f4f6f8','--surface':'#fcfdfd','--fg':'#24333a','--muted':'#6b7d85','--border':'#dfe4e8','--accent':'#6b8e9e','--accent-hover':'#547586','--accent-soft':'rgba(107,142,158,0.08)','--success':'#7a9e8a','--success-soft':'rgba(122,158,138,0.1)','--danger':'#b88a7a','--danger-soft':'rgba(184,138,122,0.08)','--warning':'#b8a070','--heat-cold':'#8ea8b8','--heat-warm':'#b8a070','--heat-hot':'#b88a7a'},
    dark: {'--bg':'#151d21','--surface':'#1f282d','--fg':'#e0e6ea','--muted':'#8c9ba2','--border':'#2f383e','--accent':'#8cb0c0','--accent-hover':'#a2c4d2','--accent-soft':'rgba(140,176,192,0.12)','--success':'#8db89a','--success-soft':'rgba(141,184,154,0.12)','--danger':'#d0a090','--danger-soft':'rgba(208,160,144,0.1)','--warning':'#d0b888','--heat-cold':'#9eb8c8','--heat-warm':'#d0b888','--heat-hot':'#d0a090'}
  }
};
