// ============================================================================
// Telegram SMS/OTP Bot — Single-File Cloudflare Pages (_worker.js) + D1
// Zero npm dependencies. Ready for direct GitHub -> Cloudflare Pages deploy.
// ============================================================================

// ============ 1. CONFIGURATION & CONSTANTS ============
const USD_TO_BDT = 128.0;
const NUMBERS_PER_REQUEST = 3;
const NUMBER_VALIDITY_SECONDS = 600;
const DEFAULT_REQUIRED_CHANNELS = ["@ROXYSMSNEWS"];

const ADMIN_PERMISSIONS = {
  numbers: "📱 Add/Remove Numbers",
  otp_inbox: "📥 OTP Inbox & API",
  wallet: "💰 Wallet & Rates",
  withdraw: "💳 Withdraw Requests",
  filter: "🛡️ Number Filter",
  stats: "📊 Stats & Live Traffic",
  broadcast: "📢 Broadcast & Channels",
  platforms: "🌐 Platform & Providers",
  control: "⚙️ System & Backup",
};

const OTP_PATTERNS = [
  /(?:Your Code|Code|OTP|Codigo|verification|OTP Code|Pin|Secret Code)\s*(?:➡️|:|\s|is)\s*([\d\s-]{3,8})/i,
  /G-([\d]{4,8}) is your Google verification code/i,
  /#\s*([\d]{4,8})\s*is your Facebook code/i,
  /Your WhatsApp(?: Business)? code\s*([\d\s-]{3,8})/i,
  /code is\s*[:\s]*(\d{3,8})/i,
  /code:\s*(\d{3,8})/i,
  /otp:\s*(\d{3,8})/i,
  /\b(\d{3}[-\s]\d{3,4})\b/i,
  /\b(\d{4,8})\b/i,
];

const NUMBER_PATTERNS = [
  /(?:Number|Mobile|Phone|Tel|To|Acc|Account|📱|☎️|📞)\s*[:\s]*(\+?[\d•*xX⁕\s-]{6,})/i,
  /(\+?\d{1,4}[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,5})/,
  /(\+?[\d]{2,}[*xX•⁕\s.\-]{2,}[\d]{2,})/,
  /(\b[\d]*[*xX•⁕]+[\d]{3,}\b|\b\d{10,}\b)/i,
  /(\d{3,}[*xX•⁕]+\d{3,})/i,
  /(\b\d{9,16}\b)/,
  /(\+?\d{8,16})/,
];

const COUNTRY_MAP = {
  "1": "🇺🇸 USA / Canada", "7": "🇷🇺 Russia / Kazakhstan", "20": "🇪🇬 Egypt", "27": "🇿🇦 South Africa",
  "30": "🇬🇷 Greece", "31": "🇳🇱 Netherlands", "32": "🇧🇪 Belgium", "33": "🇫🇷 France", "34": "🇪🇸 Spain",
  "36": "🇭🇺 Hungary", "39": "🇮🇹 Italy", "40": "🇷🇴 Romania", "41": "🇨🇭 Switzerland", "43": "🇦🇹 Austria",
  "44": "🇬🇧 United Kingdom", "45": "🇩🇰 Denmark", "46": "🇸🇪 Sweden", "47": "🇳🇴 Norway", "48": "🇵🇱 Poland",
  "49": "🇩🇪 Germany", "51": "🇵🇪 Peru", "52": "🇲🇽 Mexico", "53": "🇨🇺 Cuba", "54": "🇦🇷 Argentina",
  "55": "🇧🇷 Brazil", "56": "🇨🇱 Chile", "57": "🇨🇴 Colombia", "58": "🇻🇪 Venezuela", "60": "🇲🇾 Malaysia",
  "61": "🇦🇺 Australia", "62": "🇮🇩 Indonesia", "63": "🇵🇭 Philippines", "64": "🇳🇿 New Zealand", "65": "🇸🇬 Singapore",
  "66": "🇹🇭 Thailand", "81": "🇯🇵 Japan", "82": "🇰🇷 South Korea", "84": "🇻🇳 Vietnam", "86": "🇨🇳 China",
  "90": "🇹🇷 Turkey", "91": "🇮🇳 India", "92": "🇵🇰 Pakistan", "93": "🇦🇫 Afghanistan", "94": "🇱🇰 Sri Lanka",
  "95": "🇲🇲 Myanmar", "98": "🇮🇷 Iran", "211": "🇸🇸 South Sudan", "212": "🇲🇦 Morocco", "213": "🇩🇿 Algeria",
  "216": "🇹🇳 Tunisia", "218": "🇱🇾 Libya", "220": "🇬🇲 Gambia", "221": "🇸🇳 Senegal", "222": "🇲🇷 Mauritania",
  "223": "🇲🇱 Mali", "224": "🇬🇳 Guinea", "225": "🇨🇮 Ivory Coast", "226": "🇧🇫 Burkina Faso", "227": "🇳🇪 Niger",
  "228": "🇹🇬 Togo", "229": "🇧🇯 Benin", "230": "🇲🇺 Mauritius", "231": "🇱🇷 Liberia", "232": "🇸🇱 Sierra Leone",
  "233": "🇬🇭 Ghana", "234": "🇳🇬 Nigeria", "235": "🇹🇩 Chad", "236": "🇨🇫 Central African Republic",
  "237": "🇨🇲 Cameroon", "238": "🇨🇻 Cape Verde", "239": "🇸🇹 Sao Tome & Principe", "240": "🇬🇶 Equatorial Guinea",
  "241": "🇬🇦 Gabon", "242": "🇨🇬 Congo", "243": "🇨🇩 DR Congo", "244": "🇦🇴 Angola", "245": "🇬🇼 Guinea-Bissau",
  "246": "🇮🇴 British Indian Ocean Territory", "248": "🇸🇨 Seychelles", "249": "🇸🇩 Sudan", "250": "🇷🇼 Rwanda",
  "251": "🇪🇹 Ethiopia", "252": "🇸🇴 Somalia", "253": "🇩🇯 Djibouti", "254": "🇰🇪 Kenya", "255": "🇹🇿 Tanzania",
  "256": "🇺🇬 Uganda", "257": "🇧🇮 Burundi", "258": "🇲🇿 Mozambique", "260": "🇿🇲 Zambia", "261": "🇲🇬 Madagascar",
  "262": "🇷🇪 Reunion", "263": "🇿🇼 Zimbabwe", "264": "🇳🇦 Namibia", "265": "🇲🇼 Malawi", "266": "🇱🇸 Lesotho",
  "267": "🇧🇼 Botswana", "268": "🇸🇿 Eswatini", "269": "🇰🇲 Comoros", "290": "🇸🇭 Saint Helena", "291": "🇪🇷 Eritrea",
  "297": "🇦🇼 Aruba", "298": "🇫🇴 Faroe Islands", "299": "🇬🇱 Greenland", "350": "🇬🇮 Gibraltar", "351": "🇵🇹 Portugal",
  "352": "🇱🇺 Luxembourg", "353": "🇮🇪 Ireland", "354": "🇮🇸 Iceland", "355": "🇦🇱 Albania", "356": "🇲🇹 Malta",
  "357": "🇨🇾 Cyprus", "358": "🇫🇮 Finland", "359": "🇧🇬 Bulgaria", "370": "🇱🇹 Lithuania", "371": "🇱🇻 Latvia",
  "372": "🇪🇪 Estonia", "373": "🇲🇩 Moldova", "374": "🇦🇲 Armenia", "375": "🇧🇾 Belarus", "376": "🇦🇩 Andorra",
  "377": "🇲🇨 Monaco", "378": "🇸🇲 San Marino", "379": "🇻🇦 Vatican City", "380": "🇺🇦 Ukraine", "381": "🇷🇸 Serbia",
  "382": "🇲🇪 Montenegro", "383": "🇽🇰 Kosovo", "385": "🇭🇷 Croatia", "386": "🇸🇮 Slovenia",
  "387": "🇧🇦 Bosnia & Herzegovina", "389": "🇲🇰 North Macedonia", "420": "🇨🇿 Czech Republic", "421": "🇸🇰 Slovakia",
  "423": "🇱🇮 Liechtenstein", "500": "🇫🇰 Falkland Islands", "501": "🇧🇿 Belize", "502": "🇬🇹 Guatemala",
  "503": "🇸🇻 El Salvador", "504": "🇭🇳 Honduras", "505": "🇳🇮 Nicaragua", "506": "🇨🇷 Costa Rica", "507": "🇵🇦 Panama",
  "508": "🇵🇲 Saint Pierre & Miquelon", "509": "🇭🇹 Haiti", "590": "🇬🇵 Guadeloupe", "591": "🇧🇴 Bolivia",
  "592": "🇬🇾 Guyana", "593": "🇪🇨 Ecuador", "594": "🇬🇫 French Guiana", "595": "🇵🇾 Paraguay", "596": "🇲🇶 Martinique",
  "597": "🇸🇷 Suriname", "598": "🇺🇾 Uruguay", "599": "🇨🇼 Curacao", "670": "🇹🇱 Timor-Leste", "672": "🇦🇶 Antarctica",
  "673": "🇧🇳 Brunei", "674": "🇳🇷 Nauru", "675": "🇵🇬 Papua New Guinea", "676": "🇹🇴 Tonga", "677": "🇸🇧 Solomon Islands",
  "678": "🇻🇺 Vanuatu", "679": "🇫🇯 Fiji", "680": "🇵🇼 Palau", "681": "🇼🇫 Wallis & Futuna", "682": "🇨🇰 Cook Islands",
  "683": "🇳🇺 Niue", "685": "🇼🇸 Samoa", "686": "🇰🇮 Kiribati", "687": "🇳🇨 New Caledonia", "688": "🇹🇻 Tuvalu",
  "689": "🇵🇫 French Polynesia", "690": "🇹🇰 Tokelau", "691": "🇫🇲 Micronesia", "692": "🇲🇭 Marshall Islands",
  "850": "🇰🇵 North Korea", "852": "🇭🇰 Hong Kong", "853": "🇲🇴 Macau", "855": "🇰🇭 Cambodia", "856": "🇱🇦 Laos",
  "870": "📡 Satellite", "880": "🇧🇩 Bangladesh", "886": "🇹🇼 Taiwan", "960": "🇲🇻 Maldives", "961": "🇱🇧 Lebanon",
  "962": "🇯🇴 Jordan", "963": "🇸🇾 Syria", "964": "🇮🇶 Iraq", "965": "🇰🇼 Kuwait", "966": "🇸🇦 Saudi Arabia",
  "967": "🇾🇪 Yemen", "968": "🇴🇲 Oman", "970": "🇵🇸 Palestine", "971": "🇦🇪 UAE", "972": "🇮🇱 Israel",
  "973": "🇧🇭 Bahrain", "974": "🇶🇦 Qatar", "975": "🇧🇹 Bhutan", "976": "🇲🇳 Mongolia", "977": "🇳🇵 Nepal",
  "992": "🇹🇯 Tajikistan", "993": "🇹🇲 Turkmenistan", "994": "🇦🇿 Azerbaijan", "995": "🇬🇪 Georgia",
  "996": "🇰🇬 Kyrgyzstan", "998": "🇺🇿 Uzbekistan",
};

const CUSTOM_EMOJIS = {
  home: "5465226866321268133", shield: "5352888345972187597", link: "6307644762530782800",
  lightning: "4990225396306805545", diamond: "5328098344495490329", chart: "6084477132254218612",
  check: "6003547523057194167", heart: "5215286931067251318", package: "4990298741463319592",
  folder: "5433653135799228968", plus: "5226945370684140473", trash: "5231339530249845638",
  cross: "5231339530249845638", edit: "6301092489273018328", warning: "5352888345972187597",
  user: "5372926953978341366", phone: "5407025283456835913", fire: "4990225396306805545",
  megaphone: "6239911547724895865", get_number: "5332531536723984111", live_system: "6001546944470587024",
  wallet: "5190576863226933563", support_pro: "5190498849440931467", facebook: "5330470948854314862",
  whatsapp: "5233354831984353090", instagram: "5364310996179503764", tiktok: "5391044040860906456",
  telegram: "5364125616801073577", imo: "6237849688544910140", timer: "6084396322444544568",
  refresh: "6282702779341346176", globe: "5399898266265475100", globe_new: "5224450179368767019",
  mobile: "5407025283456835913", stats: "6212722789833514739", back: "5352759161945867747",
  money: "6170011680831969294", users: "5372926953978341366", handshake: "5456371000239212004",
  tv: "5373330964372004748", broadcast: "5316847419965579451", clipboard: "6301092489273018328",
  withdraw: "6185774116319006168", set_wallet: "5213470220030585409", bkash: "6237975191784266396",
  nagad: "6235336389647407554", binance: "6237610939902858402", withdraw_requests: "6239911547724895865",
  otp_settings: "6001546944470587024", otp_group: "5195343031384950165", last_48h_otp: "6249228719064356119",
  number_copy: "5861680977994060034", otp_copy: "5330115548900501467", otp_bubbles: "6192618748000609137",
  dollar: "5258435482487900483", otp_icon: "6235235303297128975", channel_settings: "6239911547724895865",
  lb_otp: "5353032893096567467", lb_money: "5190576863226933563", lb_rate: "5420396762189831222",
  rank_1: "5352651766288652742", rank_2: "5355186458418257716", rank_3: "5352867219028091093",
  rank_4: "5352566657216714037", rank_5: "5353086880835474989", lb_trophy: "6266973397922616654",
  lb_refresh: "6282702779341346176", lb_timer: "5978841844673416652", lb_rules: "5264821604935804414",
  lb_crown: "6266995104687330978", download: "6266818688905648040",
};

const PLATFORM_EMOJIS = {
  Whatsapp: CUSTOM_EMOJIS.whatsapp, WhatsApp: CUSTOM_EMOJIS.whatsapp, Telegram: CUSTOM_EMOJIS.telegram,
  Facebook: CUSTOM_EMOJIS.facebook, Tiktok: CUSTOM_EMOJIS.tiktok, TikTok: CUSTOM_EMOJIS.tiktok,
  Instagram: CUSTOM_EMOJIS.instagram, IMO: CUSTOM_EMOJIS.imo, Imo: CUSTOM_EMOJIS.imo,
};

const FLAG_CUSTOM_EMOJIS = {
  US: "5913463998522592692", UA: "5911406692007941050", PL: "5913550391789752571", KZ: "5913724621433082323",
  CN: "5913779335021466780", AZ: "5911197578640233518", RU: "5913274246867456342", ZM: "5913564754160389778",
  BR: "5911148568768418614", IN: "5913754823643107921", GB: "5913443365499703513", TR: "5910995113881901195",
  JP: "5913293711659241040", DE: "5911096835887337583", UZ: "5911051846104912282", YE: "5913346492512341993",
  VN: "5913428887164949581", AE: "5913726554168365343", CH: "5913271227505448072", TJ: "5911287639809463107",
  TZ: "5911418949844603556", TH: "5913617968805187987", TG: "5913423260757790970", TN: "5911332947419468671",
  TM: "5913315521503170180", UG: "5913488939397681980", SE: "5911156510162949403", SZ: "5913374525763883286",
  SR: "5913275539652611719", SD: "5911387497799094470", ES: "5911193287967904547", LK: "5911293163137406640",
  SS: "5911406262511211744", KR: "5913371673905598425", ZA: "5911203119148044594", SN: "5910995302860461643",
  RS: "5913592598433369871", SC: "5911185183364616913", SL: "5911210450657218661", SG: "5911531460808051849",
  SI: "5913431983836368644", SK: "5913751666842145020", SB: "5911482712929080608", SO: "5911397852965244436",
  SA: "5911300687920108242", ST: "5913574331937462345", SM: "5913587968458625465", WS: "5913325971158602854",
  KN: "5913691898077253637", VC: "5911318941531116255", LC: "5911243659344351824", PS: "5913684768431541668",
  PG: "5911107251183030903", PY: "5911014265141072316", PE: "5911207993935925780", PH: "5911268638874145162",
  PT: "5911023653939581472", QA: "5911260864983339619", RO: "5913460373570195273", RW: "5911455229433352234",
  NL: "5913367645226275100", NP: "5913496520014958723", NA: "5911108535378252443", MZ: "5911333419865871464",
  MA: "5911482111633658301", ME: "5913239436157522151", MC: "5911245347266500057", MN: "5911041383564580038",
  MD: "5913456847402045950", MV: "5913501399097806832", ML: "5911305266355245916", MT: "5911023714069123567",
  MU: "5913291113204027321", MX: "5913687302462246518", FM: "5911271104185373336", MY: "5913654360063087453",
  KE: "5913656245553730622", MG: "5913766918271012920", MK: "5913394029210374721", LU: "5913390842344640293",
  LT: "5911172315642597775", LI: "5911166650580734660", LY: "5911236989260140996", LR: "5913324167272337727",
  XK: "5911433681582429010", KW: "5913290705182134003", KG: "5911202161370337549", LA: "5913718526874489279",
  LV: "5913738489882480243", LB: "5911504273664905447", LS: "5911059881988723711", JO: "5913234136167878475",
  JM: "5913232280742006526", IE: "5913427959452012488", IT: "5913688444923547525", IL: "5911471936856134692",
  IQ: "5911382442622587735", IR: "5920160977818489355", ID: "5913479361620611038", GT: "5913324858762072330",
  GW: "5911398694778836149", GY: "5913579412883771480", HT: "5913459789454643194", HN: "5911406889576436289",
  HU: "5913767635530551104", IS: "5911047899029967246", GR: "5911210399117611448", GH: "5913391155877252952",
  GE: "5913434771270144023", GM: "5913657267755945883", GA: "5911037896051137264", FR: "5913605586414473124",
  FI: "5911041344909873378", FJ: "5911393832875856716", ET: "5911078333168227043", DO: "5911152099231536123",
  TL: "5911141915864076479", EC: "5911273865849347408", SV: "5913238624408703010", EG: "5913694831539916769",
  EE: "5910986042910969906", DK: "5911206009661034712", CY: "5911023550860366409", HR: "5913692684056269311",
  CR: "5911261745451635030", CG: "5911338788574990168", CD: "5913770362834783827", KM: "5911338582416560604",
  KH: "5913699998385573485", CM: "5911172109484167745", CA: "5913623736946265914", CV: "5913571501554012193",
  CZ: "5911198691036764307", CL: "5911470957603592832", CO: "5913773060074246009", BF: "5913407764515786948",
  BG: "5911263776971168517", BN: "5911336409163109113", BW: "5911513782722499475", BA: "5913700002680541032",
  BO: "5913638795101606133", BT: "5913236734623093021", BJ: "5913735869952430547", AR: "5913573356979884082",
  AU: "5913632326880858455", AT: "5911338831524664592", BD: "5911365056594973179", BH: "5913581663446634403",
  BB: "5911016996740272263", BE: "5913529642802745141", BZ: "5913355005137522807", AG: "5913389025573475085",
  AO: "5913753316109586411", AD: "5911314702398396902", DZ: "5913782968563800236", AL: "5911357458797826163",
  AF: "5913492040364068694", ZW: "5911092502265336396", MM: "5433666360003540231",
};

const DIAL_TO_ISO = {
  "1": "US", "7": "RU", "20": "EG", "27": "ZA", "30": "GR", "31": "NL", "32": "BE", "33": "FR", "34": "ES", "36": "HU",
  "39": "IT", "40": "RO", "41": "CH", "43": "AT", "44": "GB", "45": "DK", "46": "SE", "47": "NO", "48": "PL", "49": "DE",
  "51": "PE", "52": "MX", "53": "CU", "54": "AR", "55": "BR", "56": "CL", "57": "CO", "58": "VE", "60": "MY", "61": "AU",
  "62": "ID", "63": "PH", "64": "NZ", "65": "SG", "66": "TH", "81": "JP", "82": "KR", "84": "VN", "86": "CN", "90": "TR",
  "91": "IN", "92": "PK", "93": "AF", "94": "LK", "95": "MM", "98": "IR", "211": "SS", "212": "MA", "213": "DZ", "216": "TN",
  "218": "LY", "220": "GM", "221": "SN", "222": "MR", "223": "ML", "224": "GN", "225": "CI", "226": "BF", "227": "NE", "228": "TG",
  "229": "BJ", "230": "MU", "231": "LR", "232": "SL", "233": "GH", "234": "NG", "235": "TD", "236": "CF", "237": "CM", "238": "CV",
  "239": "ST", "240": "GQ", "241": "GA", "242": "CG", "243": "CD", "244": "AO", "245": "GW", "248": "SC", "249": "SD", "250": "RW",
  "251": "ET", "252": "SO", "253": "DJ", "254": "KE", "255": "TZ", "256": "UG", "257": "BI", "258": "MZ", "260": "ZM", "261": "MG",
  "262": "RE", "263": "ZW", "264": "NA", "265": "MW", "266": "LS", "267": "BW", "268": "SZ", "269": "KM", "290": "SH", "291": "ER",
  "297": "AW", "298": "FO", "299": "GL", "350": "GI", "351": "PT", "352": "LU", "353": "IE", "354": "IS", "355": "AL", "356": "MT",
  "357": "CY", "358": "FI", "359": "BG", "370": "LT", "371": "LV", "372": "EE", "373": "MD", "374": "AM", "375": "BY", "376": "AD",
  "377": "MC", "378": "SM", "379": "VA", "380": "UA", "381": "RS", "382": "ME", "383": "XK", "385": "HR", "386": "SI", "387": "BA",
  "389": "MK", "420": "CZ", "421": "SK", "423": "LI", "500": "FK", "501": "BZ", "502": "GT", "503": "SV", "504": "HN", "505": "NI",
  "506": "CR", "507": "PA", "508": "PM", "509": "HT", "590": "GP", "591": "BO", "592": "GY", "593": "EC", "594": "GF", "595": "PY",
  "596": "MQ", "597": "SR", "598": "UY", "599": "CW", "670": "TL", "673": "BN", "674": "NR", "675": "PG", "676": "TO", "677": "SB",
  "678": "VU", "679": "FJ", "680": "PW", "681": "WF", "682": "CK", "683": "NU", "685": "WS", "686": "KI", "687": "NC", "688": "TV",
  "689": "PF", "690": "TK", "691": "FM", "692": "MH", "850": "KP", "852": "HK", "853": "MO", "855": "KH", "856": "LA", "880": "BD",
  "886": "TW", "960": "MV", "961": "LB", "962": "JO", "963": "SY", "964": "IQ", "965": "KW", "966": "SA", "967": "YE", "968": "OM",
  "970": "PS", "971": "AE", "972": "IL", "973": "BH", "974": "QA", "975": "BT", "976": "MN", "977": "NP", "992": "TJ", "993": "TM",
  "994": "AZ", "995": "GE", "996": "KG", "998": "UZ",
};

const EMOJI_TO_CUSTOM_TAG = {
  "❌": '<tg-emoji emoji-id="5231339530249845638">❌</tg-emoji>',
  "✅": '<tg-emoji emoji-id="6003547523057194167">✅</tg-emoji>',
  "⚡": '<tg-emoji emoji-id="4990225396306805545">⚡</tg-emoji>',
  "📱": '<tg-emoji emoji-id="5407025283456835913">📱</tg-emoji>',
  "💰": '<tg-emoji emoji-id="6170011680831969294">💰</tg-emoji>',
  "👤": '<tg-emoji emoji-id="5372926953978341366">👤</tg-emoji>',
  "⏰": '<tg-emoji emoji-id="6084396322444544568">⏰</tg-emoji>',
  "⏱️": '<tg-emoji emoji-id="6084396322444544568">⏱</tg-emoji>',
  "⏱": '<tg-emoji emoji-id="6084396322444544568">⏱</tg-emoji>',
  "💳": '<tg-emoji emoji-id="6086980694460861135">💳</tg-emoji>',
  "💎": '<tg-emoji emoji-id="5328098344495490329">💎</tg-emoji>',
  "🎁": '<tg-emoji emoji-id="5328098344495490329">🎁</tg-emoji>',
  "📁": '<tg-emoji emoji-id="5433653135799228968">📁</tg-emoji>',
  "📂": '<tg-emoji emoji-id="5433653135799228968">📂</tg-emoji>',
  "🛡️": '<tg-emoji emoji-id="5352888345972187597">🛡</tg-emoji>',
  "🛡": '<tg-emoji emoji-id="5352888345972187597">🛡</tg-emoji>',
  "📢": '<tg-emoji emoji-id="5316847419965579451">📢</tg-emoji>',
  "🟢": '<tg-emoji emoji-id="6001546944470587024">🟢</tg-emoji>',
  "🔴": '<tg-emoji emoji-id="5231339530249845638">🔴</tg-emoji>',
  "⚠️": '<tg-emoji emoji-id="5352888345972187597">⚠️</tg-emoji>',
  "💬": '<tg-emoji emoji-id="6192618748000609137">💬</tg-emoji>',
  "🔥": '<tg-emoji emoji-id="4990225396306805545">⚡</tg-emoji>',
  "🌐": '<tg-emoji emoji-id="5399898266265475100">🌐</tg-emoji>',
  "🌍": '<tg-emoji emoji-id="5399898266265475100">🌍</tg-emoji>',
  "👥": '<tg-emoji emoji-id="5372926953978341366">👥</tg-emoji>',
  "🔄": '<tg-emoji emoji-id="6282702779341346176">🔄</tg-emoji>',
  "🗑️": '<tg-emoji emoji-id="5231339530249845638">🗑</tg-emoji>',
  "🗑": '<tg-emoji emoji-id="5231339530249845638">🗑</tg-emoji>',
  "📋": '<tg-emoji emoji-id="6301092489273018328">📋</tg-emoji>',
  "👝": '<tg-emoji emoji-id="6086980694460861135">👝</tg-emoji>',
  "🏆": '<tg-emoji emoji-id="6266973397922616654">🏆</tg-emoji>',
  "⏳": '<tg-emoji emoji-id="5978841844673416652">⏳</tg-emoji>',
  "📜": '<tg-emoji emoji-id="5264821604935804414">📜</tg-emoji>',
  "👑": '<tg-emoji emoji-id="6266995104687330978">👑</tg-emoji>',
  "🏅": '<tg-emoji emoji-id="6212722789833514739">🏅</tg-emoji>',
  "🎖️": '<tg-emoji emoji-id="6212722789833514739">🎖</tg-emoji>',
  "🎖": '<tg-emoji emoji-id="6212722789833514739">🎖</tg-emoji>',
};

const SERVICE_NORM_MAP = {
  fb: "Facebook", facebook: "Facebook", wa: "WhatsApp", whatsapp: "WhatsApp",
  g: "Google", google: "Google", tg: "Telegram", telegram: "Telegram",
  ig: "Instagram", instagram: "Instagram", tt: "Tiktok", tiktok: "Tiktok", imo: "IMO",
};

const DEFAULT_PLATFORMS = {
  Facebook: { name: "Facebook", emoji_id: "5330470948854314862", short: "FB" },
  WhatsApp: { name: "WhatsApp", emoji_id: "5233354831984353090", short: "WA" },
  Google: { name: "Google", emoji_id: "", short: "G" },
  Telegram: { name: "Telegram", emoji_id: "5364125616801073577", short: "TG" },
  Instagram: { name: "Instagram", emoji_id: "5364310996179503764", short: "IG" },
  Tiktok: { name: "Tiktok", emoji_id: "5391044040860906456", short: "TT" },
  IMO: { name: "IMO", emoji_id: "6237849688544910140", short: "IMO" },
};

const DEFAULT_WALLET_CONFIG = {
  service_rates: {
    Facebook: { global: 0.5, country: {} }, WhatsApp: { global: 0.5, country: {} },
    Google: { global: 0.5, country: {} }, Telegram: { global: 0.5, country: {} },
    Instagram: { global: 0.5, country: {} }, Tiktok: { global: 0.5, country: {} },
  },
  min_withdraw: 10.0, withdraw_enabled: true, referral_percent: 10.0,
  required_channels: ["@ROXYSMSNEWS"], usd_to_bdt_rate: 128.0, usd_to_bdt_migrated: true,
  oxapay: { api_key: "", currency: "POL", network: "POLYGON", callback_url: "" },
  manual_withdraw: { enabled: true, min_amount: 10.0, instructions: "Send Bkash number to receive manual payment." },
  auto_withdraw_limit_per_day: 3, withdraw_tutorial_url: "",
  hidden_numbers: {}, live_traffic_minutes: 60, live_traffic_mode: 1, live_traffic_show_time: true,
  external_traffic_api: { enabled: true, url: "", last_sync: 0, last_count: 0 },
  withdraw_methods: {
    Bkash: { min_withdraw: 10.0, emoji_id: "6237975191784266396" },
    Nagad: { min_withdraw: 10.0, emoji_id: "6235336389647407554" },
    Binance: { min_withdraw: 50.0, emoji_id: "6237610939902858402" },
  },
  channel_logs: {
    withdraw: { enabled: false, chat_id: "", bot_token: "" },
    otp_group: { enabled: false, chat_id: "", bot_token: "", channel_url: "" },
    otp_logs: { enabled: false, chat_id: "", bot_token: "" },
    otp: { enabled: false, chat_id: "", bot_token: "", channel_url: "" },
  },
  number_filter: { enabled: true, duration_hours: 24 },
  default_number_limit: 3, country_number_limits: {},
  otp_inbox_api: { enabled: true, interval_seconds: 5, last_run: 0, apis: [] },
  sub_admins: {},
};

const DEFAULT_LEADERBOARD = {
  daily_stats: {}, history: {}, claims: {},
  settings: {
    enabled: true, cycle_type: "weekly", cycle_hours: 168,
    reward_text: "🥇 #1: ৳500 BDT\n🥈 #2: ৳300 BDT\n🥉 #3: ৳200 BDT\n🏅 #4 - #5: ৳100 BDT",
    rates: { diamond: 0.3, gold: 0.25, silver: 0.15, none: 0.1 },
    requirements: { diamond_min: 31, gold_min: 10, silver_min: 5, streak_days: 7 },
    top_winners_count: 5, claim_duration_hours: 24,
  },
};

const CHANNEL_TITLE_CACHE = {
  "@ROXYSMSNEWS": "𝗥𝗢𝗫𝗬 𝗦𝗠𝗦 𝗡𝗘𝗪𝗦",
  "@ROXYMETHOT": "𝐑𝐎𝐗𝐘 𝐌𝐄𝐓𝐇𝐎𝐃",
  "@ROXYSMSBACKUP": "𝐑𝐎𝐗𝐘 𝐒𝗠𝗦 𝐖𝐎𝐑𝐋𝐃",
};

// ============ 2. UTILITIES & PURE-JS XLSX PARSER ============
function nowTs() { return Math.floor(Date.now() / 1000); }
function escapeHtml(str) { return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function tgEmoji(emojiId, fallback = "✨") { return `<tg-emoji emoji-id="${emojiId || CUSTOM_EMOJIS.diamond}">${fallback}</tg-emoji>`; }

const _sortedPrem = Object.keys(EMOJI_TO_CUSTOM_TAG).sort((a, b) => b.length - a.length);
const _premRegex = new RegExp(_sortedPrem.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
function premiumizeText(t) {
  if (!t || typeof t !== "string") return t;
  return t.split(/(<tg-emoji[^>]*>.*?<\/tg-emoji>)/g).map((tok) => tok.startsWith("<tg-emoji") ? tok : tok.replace(_premRegex, (m) => EMOJI_TO_CUSTOM_TAG[m] || m)).join("");
}

function splitCountryProvider(key) {
  if (!key) return ["", ""];
  const s = String(key).trim();
  const idx = s.indexOf("#");
  return idx !== -1 ? [s.slice(0, idx).trim(), s.slice(idx + 1).trim()] : [s, ""];
}
function makeCountryProviderKey(ccode, provider = "") {
  const prov = (provider || "").trim();
  return prov ? `${String(ccode).trim()}#${prov}` : String(ccode).trim();
}
function getCountryDisplayName(key) {
  const [ccode, prov] = splitCountryProvider(key);
  const cname = COUNTRY_MAP[ccode] || ccode;
  const clean = cname.split("/")[0].replace(/[^a-zA-Z\s/]/g, "").trim() || ccode;
  return prov ? `${clean} ${prov}` : clean;
}
function getCountryFlagUnicode(key) {
  const [ccode] = splitCountryProvider(key);
  const cname = COUNTRY_MAP[String(ccode)] || "";
  const tok = cname.split(" ")[0];
  return tok && /[^\x00-\x7F]/.test(tok) ? tok : "🏳️";
}
function getCountryButtonLabel(key) {
  return `${getCountryFlagUnicode(key)} ${getCountryDisplayName(key)}`;
}
function getCountryFlagEmoji(countryCode) {
  const [dialCode] = splitCountryProvider(countryCode);
  const iso = DIAL_TO_ISO[String(dialCode)] || String(dialCode).toUpperCase();
  const eid = FLAG_CUSTOM_EMOJIS[iso];
  return eid ? `<tg-emoji emoji-id="${eid}">🇺🇳</tg-emoji>` : `<tg-emoji emoji-id="${CUSTOM_EMOJIS.globe}">🌐</tg-emoji>`;
}
function normalizeServiceName(svcName) {
  if (!svcName) return "Facebook";
  const s = String(svcName).trim();
  const sl = s.toLowerCase();
  return SERVICE_NORM_MAP[sl] || (s === sl ? s.charAt(0).toUpperCase() + s.slice(1) : s);
}
function getPlatformEmojiHtml(platName, platforms = {}, fallback = "🌐") {
  const norm = normalizeServiceName(platName);
  const eid = platforms?.[norm]?.emoji_id || PLATFORM_EMOJIS[norm] || CUSTOM_EMOJIS.mobile;
  return `<tg-emoji emoji-id="${eid}">${fallback}</tg-emoji>`;
}
function getPlatformEmojiId(platName, platforms = {}) {
  const norm = normalizeServiceName(platName);
  return platforms?.[norm]?.emoji_id || PLATFORM_EMOJIS[norm] || "";
}
function extractCountryCode(number) {
  const num = String(number || "").replace(/^\+/, "");
  for (const len of [3, 2, 1]) {
    if (num.length >= len && COUNTRY_MAP[num.slice(0, len)]) return [num.slice(0, len), num.slice(len)];
  }
  return ["unknown", num];
}
function formatNumber(number, countryCode) {
  const [dialCode] = splitCountryProvider(countryCode);
  const clean = String(number || "").trim();
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("00")) return `+${clean.slice(2)}`;
  if (dialCode && clean.startsWith(dialCode)) return `+${clean}`;
  return `+${dialCode}${clean}`;
}
function getRewardRate(walletConfig, service, countryCode, userData = null) {
  const sClean = String(service || "").trim().toLowerCase();
  // 1. Check VIP / Specific User Custom Service Rate
  if (userData?.custom_rates && typeof userData.custom_rates === "object") {
    for (const [uk, uv] of Object.entries(userData.custom_rates)) {
      if (uk.toLowerCase() === sClean && uv !== null && uv !== undefined) return Number(uv);
    }
  }
  // 2. Check VIP / Specific User Custom Global Rate
  if (userData?.custom_global_rate !== undefined && userData?.custom_global_rate !== null) {
    return Number(userData.custom_global_rate);
  }
  const [dialCode] = splitCountryProvider(countryCode);
  const svcRates = walletConfig.service_rates || {};
  const cClean = String(countryCode || "").trim().replace(/^\+/, "");
  const dClean = String(dialCode || "").trim().replace(/^\+/, "");
  let matched = null;
  for (const [k, v] of Object.entries(svcRates)) { if (k.toLowerCase() === sClean) { matched = v; break; } }
  if (!matched && sClean) {
    for (const [k, v] of Object.entries(svcRates)) { if (sClean.includes(k.toLowerCase()) || k.toLowerCase().includes(sClean)) { matched = v; break; } }
  }
  if (matched && typeof matched === "object") {
    const cMap = matched.country || {};
    if (cClean in cMap) return Number(cMap[cClean]);
    if (dClean in cMap) return Number(cMap[dClean]);
    if (countryCode in cMap) return Number(cMap[countryCode]);
    return Number(matched.global ?? 0.5);
  }
  return 0.5;
}
function getCountryNumberLimit(walletConfig, ccode = null) {
  const limits = walletConfig.country_number_limits || {};
  if (ccode) {
    const [dial] = splitCountryProvider(ccode);
    const cd = String(dial).replace(/^\+/, "").trim();
    const cc = String(ccode).replace(/^\+/, "").trim();
    if (cd in limits) return Math.max(1, parseInt(limits[cd], 10));
    if (cc in limits) return Math.max(1, parseInt(limits[cc], 10));
  }
  return Math.max(1, parseInt(walletConfig.default_number_limit ?? NUMBERS_PER_REQUEST, 10));
}
function isServiceCountryHidden(walletConfig, svc, ccode) {
  const hidden = walletConfig.hidden_numbers || {};
  const key = `${svc}|${ccode}`;
  const item = hidden[key];
  if (!item) return false;
  if ((item.unhide_at || 0) > 0 && nowTs() >= item.unhide_at) { delete hidden[key]; return false; }
  return true;
}
function isCountryHidden(walletConfig, ccode) {
  const hidden = walletConfig.hidden_numbers || {};
  const cStr = String(ccode);
  for (const [key, item] of Object.entries(hidden)) {
    let ic = String(item.country || ""), isvc = item.service || "";
    if (!ic && key.includes("|")) [isvc, ic] = key.split("|", 2);
    if (ic === cStr && isServiceCountryHidden(walletConfig, isvc, ic)) return true;
  }
  return false;
}

// Pure-JS zero-dependency ZIP + XLSX parser using Cloudflare Workers DecompressionStream
async function unzipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = {};
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const compMethod = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    const raw = bytes.subarray(dataStart, dataEnd);
    if (compMethod === 0) {
      files[name] = new TextDecoder().decode(raw);
    } else if (compMethod === 8) {
      try {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(raw);
        writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        files[name] = new TextDecoder().decode(buf);
      } catch { /* skip corrupt */ }
    }
    offset = dataEnd;
  }
  return files;
}

async function extractNumbersFromXlsx(bytes) {
  const numbersList = [];
  const seen = new Set();
  try {
    const files = await unzipEntries(bytes);
    const sharedStrings = [];
    if (files["xl/sharedStrings.xml"]) {
      const siMatches = files["xl/sharedStrings.xml"].matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g);
      for (const m of siMatches) {
        const txt = m[1].replace(/<[^>]+>/g, "");
        sharedStrings.push(txt);
      }
    }
    for (const [fname, xml] of Object.entries(files)) {
      if (!fname.startsWith("xl/worksheets/sheet")) continue;
      const cellMatches = xml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g);
      for (const cm of cellMatches) {
        const attrs = cm[1];
        const inner = cm[2];
        const vMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner);
        if (!vMatch) continue;
        let val = vMatch[1];
        if (/t=["']s["']/.test(attrs)) {
          const idx = parseInt(val, 10);
          val = sharedStrings[idx] || "";
        }
        let valStr = String(val).trim();
        const cleaned = valStr.replace(/[^\d+]/g, "");
        if (cleaned.replace(/\+/g, "").length >= 5) {
          if (!valStr.startsWith("+") && !valStr.startsWith("0")) valStr = "+" + valStr;
          if (!seen.has(valStr)) { seen.add(valStr); numbersList.push(valStr); }
        }
      }
    }
  } catch (e) { console.error("XLSX parse error:", e); }
  return numbersList;
}

function extractNumbersFromText(text) {
  const out = [], seen = new Set();
  for (const line of String(text || "").split(/[\r\n,;]+/)) {
    let val = line.trim();
    const cleaned = val.replace(/[^\d+]/g, "");
    if (cleaned.replace(/\+/g, "").length >= 5) {
      if (!val.startsWith("+") && !val.startsWith("0")) val = "+" + val;
      if (!seen.has(val)) { seen.add(val); out.push(val); }
    }
  }
  return out;
}

function extractOtpCode(text, candNumbers = null) {
  if (!text) return null;
  const skip = new Set();
  if (candNumbers) {
    for (const cn of candNumbers) {
      const cl = String(cn).replace(/[^\d]/g, "");
      if (cl) { skip.add(cl); if (cl.length >= 6) skip.add(cl.slice(-6)); if (cl.length >= 4) skip.add(cl.slice(-4)); }
    }
  }
  for (const pat of OTP_PATTERNS) {
    const m = pat.exec(text);
    if (m && m[1]) {
      const code = m[1].replace(/[^\d]/g, "");
      if (code.length >= 4 && code.length <= 8 && !skip.has(code)) return code;
    }
  }
  return null;
}

function extractNumberCandidates(text) {
  if (!text) return [];
  const cands = [], seen = new Set();
  for (const pat of NUMBER_PATTERNS) {
    for (const m of text.matchAll(new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : pat.flags + "g"))) {
      const raw = (m[1] || m[0] || "").trim();
      if (raw.replace(/[^\d]/g, "").length >= 4 && !seen.has(raw)) { seen.add(raw); cands.push(raw); }
    }
  }
  return cands;
}

function extractSmsBody(rawText) {
  if (!rawText) return "";
  for (const line of String(rawText).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    if (/(?:code|otp|verification|pin|facebook|whatsapp|telegram|google|instagram|tiktok)/i.test(line) && /\d{4,8}/.test(line)) return line;
  }
  return rawText.slice(0, 300);
}

function isSuperAdmin(userId, env) { return userId != null && String(userId) === String(env.ADMIN_ID || "5806585314").trim(); }
function isAdminUser(userId, env, walletConfig) { return userId != null && (isSuperAdmin(userId, env) || String(userId) in (walletConfig?.sub_admins || {})); }
function hasPermission(userId, perm, env, walletConfig) {
  if (isSuperAdmin(userId, env)) return true;
  const perms = walletConfig?.sub_admins?.[String(userId)]?.permissions || [];
  return perms.includes(perm) || perms.includes("all");
}

// ============ 3. TELEGRAM API WRAPPER & BUTTONS ============
function autoClassifyButtonStyle(text, cb = null) {
  if (!text) return "primary";
  const tStr = String(text), tLow = tStr.toLowerCase(), cLow = String(cb || "").toLowerCase();
  const danger = ["🔙", "❌", "🗑", "⛔", "🚫", "🔴", "back", "cancel", "delete", "remove", "reject", "ban", "clear", "reset", "close", "off", "disable", "noop", "no numbers", "পিছনে", "বাতিল", "মুছুন", "বন্ধ"];
  if (danger.some((i) => tLow.includes(i) || tStr.includes(i))) return "danger";
  if (["_del", "del_", "_back", "back_", "cancel", "_remove", "remove_", "_reject", "reject_", "_ban", "_clear", "noop"].some((i) => cLow.includes(i))) return "danger";
  const cleanNum = tStr.replace(/[^\d+]/g, "");
  if (cleanNum.startsWith("+") || (/^\d+$/.test(cleanNum) && cleanNum.length >= 7)) return "success";
  const success = ["✅", "🟢", "🎁", "💵", "💰", "➕", "confirm", "claim", "approve", "accept", "save", "add", "create", "withdraw", "get number", "pay", "enable", "start", "yes", "নিশ্চিত", "ক্লেইম", "উত্তোলন", "𝐆𝐞𝐭 𝐍𝐮𝐦𝐛𝐞𝐫"];
  if (success.some((i) => tLow.includes(i) || tStr.includes(i))) return "success";
  if (["confirm", "claim", "approve", "save", "withdraw", "get_", "add_", "check_join"].some((i) => cLow.includes(i))) return "success";
  return "primary";
}

function btn(text, opts = {}) {
  const b = { text: String(text), style: opts.style || autoClassifyButtonStyle(text, opts.callback_data) };
  if (opts.callback_data !== undefined) b.callback_data = String(opts.callback_data);
  if (opts.url !== undefined) b.url = String(opts.url);
  if (opts.copy_text !== undefined) b.copy_text = typeof opts.copy_text === "string" ? { text: opts.copy_text } : opts.copy_text;
  if (opts.icon_custom_emoji_id) b.icon_custom_emoji_id = String(opts.icon_custom_emoji_id);
  return b;
}
function ikb(rows) { return { inline_keyboard: rows }; }
function rkb(rows) { return { keyboard: rows.map((r) => r.map((x) => typeof x === "string" ? { text: x } : x)), resize_keyboard: true }; }

class TelegramAPI {
  constructor(token) { this.token = token; this.baseUrl = `https://api.telegram.org/bot${token}`; }
  async call(method, payload = {}) {
    const res = await fetch(`${this.baseUrl}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return res.json().catch(() => ({ ok: false }));
  }
  sendMessage(chatId, text, opts = {}) {
    return this.call("sendMessage", { chat_id: chatId, text: String(text), parse_mode: opts.parse_mode ?? "HTML", ...(opts.reply_markup ? { reply_markup: opts.reply_markup } : {}), ...(opts.disable_web_page_preview ? { disable_web_page_preview: true } : {}) });
  }
  editMessageText(chatId, messageId, text, opts = {}) {
    return this.call("editMessageText", { chat_id: chatId, message_id: messageId, text: String(text), parse_mode: opts.parse_mode ?? "HTML", ...(opts.reply_markup ? { reply_markup: opts.reply_markup } : {}) });
  }
  async safeEditMessage(chatId, messageId, text, replyMarkup = null, parseMode = "HTML") {
    const res = await this.editMessageText(chatId, messageId, text, { reply_markup: replyMarkup, parse_mode: parseMode });
    if (!res.ok) {
      const d = (res.description || "").toLowerCase();
      if (d.includes("not modified")) return res;
      if (d.includes("no text") || d.includes("can't be edited")) return this.sendMessage(chatId, text, { reply_markup: replyMarkup, parse_mode: parseMode });
    }
    return res;
  }
  deleteMessage(chatId, messageId) { return this.call("deleteMessage", { chat_id: chatId, message_id: messageId }); }
  answerCallbackQuery(id, text = null) { return this.call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text: String(text).slice(0, 200) } : {}) }); }
  getChatMember(chatId, userId) { return this.call("getChatMember", { chat_id: chatId, user_id: Number(userId) || userId }); }
  getChat(chatId) { return this.call("getChat", { chat_id: chatId }); }
  getMe() { return this.call("getMe", {}); }
  getFile(fileId) { return this.call("getFile", { file_id: fileId }); }
  async downloadFile(filePath) {
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${filePath}`);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  async sendDocument(chatId, bytes, filename, caption = "") {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("document", new Blob([bytes]), filename);
    if (caption) { form.append("caption", caption); form.append("parse_mode", "HTML"); }
    const res = await fetch(`${this.baseUrl}/sendDocument`, { method: "POST", body: form });
    return res.json().catch(() => ({ ok: false }));
  }
  copyMessage(chatId, fromChatId, messageId) { return this.call("copyMessage", { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId }); }
}

// ============ 4. D1 DATABASE LAYER ============
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, name TEXT DEFAULT '', username TEXT DEFAULT '', joined INTEGER DEFAULT 0, last_seen INTEGER DEFAULT 0, balance REAL DEFAULT 0.0, referred_by TEXT, referral_count INTEGER DEFAULT 0, referral_earnings REAL DEFAULT 0.0, referred_users TEXT DEFAULT '[]', service TEXT DEFAULT 'Facebook', country TEXT DEFAULT '', pending_action TEXT, wallets TEXT DEFAULT '{}', otps TEXT DEFAULT '[]', auto_withdraw_history TEXT DEFAULT '{}', extra TEXT DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS numbers (id INTEGER PRIMARY KEY AUTOINCREMENT, service TEXT NOT NULL, country_key TEXT NOT NULL, number TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_numbers_svc_country ON numbers(service, country_key, id)`,
  `CREATE TABLE IF NOT EXISTS sold (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL, clean_number TEXT NOT NULL, service TEXT DEFAULT 'Facebook', country TEXT DEFAULT '', user_id TEXT NOT NULL, ts INTEGER NOT NULL, expires_at INTEGER, last_6 TEXT, last_4 TEXT, last_3 TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_sold_clean ON sold(clean_number)`,
  `CREATE INDEX IF NOT EXISTS idx_sold_last6 ON sold(last_6)`,
  `CREATE INDEX IF NOT EXISTS idx_sold_last4 ON sold(last_4)`,
  `CREATE INDEX IF NOT EXISTS idx_sold_user_exp ON sold(user_id, expires_at)`,
  `CREATE TABLE IF NOT EXISTS otp_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, country TEXT, service TEXT, user_id TEXT, inbox INTEGER DEFAULT 0, number TEXT, code TEXT, sms TEXT, digits INTEGER DEFAULT 0, lang TEXT, duplicate INTEGER DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_events_ts ON otp_events(ts)`,
  `CREATE TABLE IF NOT EXISTS withdrawals (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, method TEXT, amount REAL DEFAULT 0.0, account TEXT, status TEXT, ts INTEGER, type TEXT, extra TEXT DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS filtered_numbers (clean TEXT PRIMARY KEY, number TEXT, ts INTEGER, service TEXT, country TEXT, code TEXT)`,
  `CREATE TABLE IF NOT EXISTS seen_api_msgs (msg_key TEXT PRIMARY KEY, ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS support_map (msg_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER DEFAULT 0)`,
];

class BotDB {
  constructor(d1) { this.d1 = d1; this._cache = new Map(); this._userCache = new Map(); }
  async initSchema() {
    for (const sql of SCHEMA_STATEMENTS) await this.d1.prepare(sql).run();
  }
  async preloadCore(uid = null) {
    const now = Date.now();
    const mem = globalThis._kvMemCache;
    const memValid = mem && (now - mem.ts < 15000);
    if (memValid) {
      for (const [k, v] of Object.entries(mem.data)) this._cache.set(k, v);
      if (uid) {
        const uRow = await this.d1.prepare("SELECT * FROM users WHERE uid = ?").bind(String(uid)).first();
        this._userCache.set(String(uid), this._rowToUser(uRow));
      }
      return;
    }
    const kvPromise = this.d1.prepare("SELECT key, value FROM kv_store WHERE key IN ('wallet_config', 'platforms', 'providers', 'leaderboard')").all();
    const userPromise = uid ? this.d1.prepare("SELECT * FROM users WHERE uid = ?").bind(String(uid)).first() : Promise.resolve(null);
    const [kvRes, uRow] = await Promise.all([kvPromise, userPromise]);
    const memData = {};
    for (const row of kvRes?.results || []) {
      try { const p = JSON.parse(row.value); this._cache.set(row.key, p); memData[row.key] = p; } catch {}
    }
    if (!this._cache.has("wallet_config")) { const d = JSON.parse(JSON.stringify(DEFAULT_WALLET_CONFIG)); this._cache.set("wallet_config", d); memData.wallet_config = d; }
    if (!this._cache.has("platforms")) { const d = JSON.parse(JSON.stringify(DEFAULT_PLATFORMS)); this._cache.set("platforms", d); memData.platforms = d; }
    if (!this._cache.has("providers")) { this._cache.set("providers", ["RX SMS"]); memData.providers = ["RX SMS"]; }
    if (!this._cache.has("leaderboard")) { const d = JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD)); this._cache.set("leaderboard", d); memData.leaderboard = d; }
    globalThis._kvMemCache = { ts: now, data: memData };
    if (uid) this._userCache.set(String(uid), this._rowToUser(uRow));
  }
  async getKV(key, fallback = null) {
    if (this._cache.has(key)) return this._cache.get(key);
    const row = await this.d1.prepare("SELECT value FROM kv_store WHERE key = ?").bind(key).first();
    if (!row) {
      if (fallback !== null) { const c = JSON.parse(JSON.stringify(fallback)); this._cache.set(key, c); return c; }
      return null;
    }
    try { const p = JSON.parse(row.value); this._cache.set(key, p); return p; } catch { return fallback; }
  }
  async setKV(key, val) {
    this._cache.set(key, val);
    if (globalThis._kvMemCache?.data) {
      globalThis._kvMemCache.data[key] = val;
      globalThis._kvMemCache.ts = Date.now();
    }
    await this.d1.prepare("INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").bind(key, JSON.stringify(val), nowTs()).run();
  }
  async getWalletConfig() {
    const cfg = await this.getKV("wallet_config", DEFAULT_WALLET_CONFIG);
    for (const [k, v] of Object.entries(DEFAULT_WALLET_CONFIG)) if (cfg[k] === undefined) cfg[k] = JSON.parse(JSON.stringify(v));
    return cfg;
  }
  saveWalletConfig(cfg) { return this.setKV("wallet_config", cfg); }
  getPlatforms() { return this.getKV("platforms", DEFAULT_PLATFORMS); }
  savePlatforms(p) { return this.setKV("platforms", p); }
  getProviders() { return this.getKV("providers", ["RX SMS"]); }
  saveProviders(p) { return this.setKV("providers", p); }
  async getLeaderboard() {
    const lb = await this.getKV("leaderboard", DEFAULT_LEADERBOARD);
    if (!lb.daily_stats) lb.daily_stats = {};
    if (!lb.history) lb.history = {};
    if (!lb.claims) lb.claims = {};
    if (!lb.settings) lb.settings = JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD.settings));
    return lb;
  }
  saveLeaderboard(lb) { return this.setKV("leaderboard", lb); }

  _rowToUser(row) {
    if (!row) return null;
    const extra = JSON.parse(row.extra || "{}");
    return {
      ...extra, uid: row.uid, name: row.name || "", username: row.username || "",
      joined: row.joined || 0, last_seen: row.last_seen || 0, balance: Number(row.balance || 0),
      referred_by: row.referred_by || null, referral_count: Number(row.referral_count || 0),
      referral_earnings: Number(row.referral_earnings || 0), referred_users: JSON.parse(row.referred_users || "[]"),
      service: row.service || "Facebook", country: row.country || "",
      pending_action: row.pending_action ? JSON.parse(row.pending_action) : null,
      wallets: JSON.parse(row.wallets || "{}"), otps: JSON.parse(row.otps || "{}"),
      auto_withdraw_history: JSON.parse(row.auto_withdraw_history || "{}"),
    };
  }
  async getUser(uid) {
    const k = String(uid);
    if (this._userCache.has(k)) return this._userCache.get(k);
    const u = this._rowToUser(await this.d1.prepare("SELECT * FROM users WHERE uid = ?").bind(k).first());
    this._userCache.set(k, u);
    return u;
  }
  async saveUser(uid, u) {
    this._userCache.set(String(uid), u);
    const known = new Set(["uid", "name", "username", "joined", "last_seen", "balance", "referred_by", "referral_count", "referral_earnings", "referred_users", "service", "country", "pending_action", "wallets", "otps", "auto_withdraw_history"]);
    const extra = {};
    for (const [k, v] of Object.entries(u)) if (!known.has(k)) extra[k] = v;
    await this.d1.prepare(`INSERT INTO users (uid, name, username, joined, last_seen, balance, referred_by, referral_count, referral_earnings, referred_users, service, country, pending_action, wallets, otps, auto_withdraw_history, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name, username=excluded.username, joined=excluded.joined, last_seen=excluded.last_seen, balance=excluded.balance, referred_by=excluded.referred_by, referral_count=excluded.referral_count, referral_earnings=excluded.referral_earnings, referred_users=excluded.referred_users, service=excluded.service, country=excluded.country, pending_action=excluded.pending_action, wallets=excluded.wallets, otps=excluded.otps, auto_withdraw_history=excluded.auto_withdraw_history, extra=excluded.extra`)
      .bind(String(uid), u.name || "", u.username || "", u.joined || 0, u.last_seen || 0, Number(u.balance || 0), u.referred_by ? String(u.referred_by) : null, Number(u.referral_count || 0), Number(u.referral_earnings || 0), JSON.stringify(u.referred_users || []), u.service || "Facebook", u.country || "", u.pending_action ? JSON.stringify(u.pending_action) : null, JSON.stringify(u.wallets || {}), JSON.stringify(u.otps || {}), JSON.stringify(u.auto_withdraw_history || {}), JSON.stringify(extra)).run();
  }
  async getAllUsers() { const { results } = await this.d1.prepare("SELECT * FROM users").all(); const m = {}; for (const r of results || []) m[r.uid] = this._rowToUser(r); return m; }
  async getAllUserIds() { const { results } = await this.d1.prepare("SELECT uid FROM users").all(); return (results || []).map((r) => r.uid); }
  async countUsers() { const r = await this.d1.prepare("SELECT COUNT(*) as cnt FROM users").first(); return r ? r.cnt : 0; }
  async findUsers(query) {
    const q = `%${query.replace(/^@/, "").toLowerCase()}%`;
    const { results } = await this.d1.prepare("SELECT * FROM users WHERE uid = ? OR LOWER(username) LIKE ? OR LOWER(name) LIKE ? LIMIT 20").bind(query, q, q).all();
    return (results || []).map((r) => this._rowToUser(r));
  }

  async getCountryCounts(svc) {
    const { results } = await this.d1.prepare("SELECT country_key, COUNT(*) as cnt FROM numbers WHERE service = ? GROUP BY country_key").bind(svc).all();
    const out = {}; for (const r of results || []) out[r.country_key] = r.cnt; return out;
  }
  async getAllNumbersSummary() {
    const { results } = await this.d1.prepare("SELECT service, country_key, COUNT(*) as cnt FROM numbers GROUP BY service, country_key").all();
    const out = {}; for (const r of results || []) { if (!out[r.service]) out[r.service] = {}; out[r.service][r.country_key] = r.cnt; } return out;
  }
  async getNumbersList(svc, cKey, limit = 1) {
    const { results } = await this.d1.prepare("SELECT number FROM numbers WHERE service = ? AND country_key = ? ORDER BY id ASC LIMIT ?").bind(svc, cKey, limit).all();
    return (results || []).map((r) => r.number);
  }
  async popNumbers(svc, cKey, count) {
    const { results } = await this.d1.prepare("SELECT id, number FROM numbers WHERE service = ? AND country_key = ? ORDER BY id ASC LIMIT ?").bind(svc, cKey, count).all();
    if (!results || !results.length) return [];
    const ids = results.map((r) => r.id);
    await this.d1.prepare(`DELETE FROM numbers WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
    return results.map((r) => r.number);
  }
  async addNumbers(svc, cKey, list) {
    if (!list?.length) return 0;
    const stmt = this.d1.prepare("INSERT INTO numbers (service, country_key, number) VALUES (?, ?, ?)");
    for (let i = 0; i < list.length; i += 80) await this.d1.batch(list.slice(i, i + 80).map((n) => stmt.bind(svc, cKey, n)));
    return list.length;
  }
  async removeNumbersByCountry(svc, cKey) { const r = await this.d1.prepare("DELETE FROM numbers WHERE service = ? AND country_key = ?").bind(svc, cKey).run(); return r.meta?.changes || 0; }
  async removeNumbersByService(svc) { const r = await this.d1.prepare("DELETE FROM numbers WHERE service = ?").bind(svc).run(); return r.meta?.changes || 0; }
  async removeNumbersByCleanList(cleanSet) {
    if (!cleanSet?.size) return 0;
    const { results } = await this.d1.prepare("SELECT id, number FROM numbers").all();
    const del = (results || []).filter((r) => cleanSet.has(String(r.number).replace(/[^\d]/g, ""))).map((r) => r.id);
    for (let i = 0; i < del.length; i += 80) { const c = del.slice(i, i + 80); await this.d1.prepare(`DELETE FROM numbers WHERE id IN (${c.map(() => "?").join(",")})`).bind(...c).run(); }
    return del.length;
  }

  async addSold(item) {
    const clean = item.clean_number || String(item.number).replace(/[^\d]/g, "");
    await this.d1.prepare("INSERT INTO sold (number, clean_number, service, country, user_id, ts, expires_at, last_6, last_4, last_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(item.number, clean, item.service || "Facebook", item.country || "", String(item.user_id), item.ts, item.expires_at || null, clean.slice(-6), clean.slice(-4), clean.slice(-3)).run();
  }
  async addSoldBatch(items) {
    if (!items?.length) return;
    const stmt = this.d1.prepare("INSERT INTO sold (number, clean_number, service, country, user_id, ts, expires_at, last_6, last_4, last_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    await this.d1.batch(items.map((item) => {
      const clean = item.clean_number || String(item.number).replace(/[^\d]/g, "");
      return stmt.bind(item.number, clean, item.service || "Facebook", item.country || "", String(item.user_id), item.ts, item.expires_at || null, clean.slice(-6), clean.slice(-4), clean.slice(-3));
    }));
  }
  async expireUserNumbers(uid) {
    const now = nowTs();
    await this.d1.prepare("UPDATE sold SET expires_at = ? WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)").bind(now - 1, String(uid), now).run();
  }
  async findActiveSoldByCandidates(cands, now) {
    const cleans = [], l6 = [], l4 = [];
    for (const c of cands || []) {
      const cl = String(c).replace(/[^\d]/g, "");
      if (cl.length >= 6) { cleans.push(cl); if (cl.replace(/^0+/, "")) cleans.push(cl.replace(/^0+/, "")); l6.push(cl.slice(-6)); }
      if (cl.length >= 4) l4.push(cl.slice(-4));
    }
    const map = new Map();
    if (cleans.length) {
      const u = [...new Set(cleans)].slice(0, 30);
      const { results } = await this.d1.prepare(`SELECT * FROM sold WHERE (expires_at IS NULL OR expires_at > ?) AND clean_number IN (${u.map(() => "?").join(",")}) ORDER BY ts DESC`).bind(now, ...u).all();
      for (const r of results || []) map.set(r.id, r);
    }
    if (!map.size && l6.length) {
      const u = [...new Set(l6)].slice(0, 20);
      const { results } = await this.d1.prepare(`SELECT * FROM sold WHERE (expires_at IS NULL OR expires_at > ?) AND last_6 IN (${u.map(() => "?").join(",")}) ORDER BY ts DESC`).bind(now, ...u).all();
      for (const r of results || []) map.set(r.id, r);
    }
    if (!map.size && l4.length) {
      const u = [...new Set(l4)].slice(0, 20);
      const { results } = await this.d1.prepare(`SELECT * FROM sold WHERE (expires_at IS NULL OR expires_at > ?) AND last_4 IN (${u.map(() => "?").join(",")}) ORDER BY ts DESC`).bind(now, ...u).all();
      for (const r of results || []) map.set(r.id, r);
    }
    return [...map.values()];
  }
  cleanupExpiredSold() { const c = nowTs() - 7200; return this.d1.prepare("DELETE FROM sold WHERE expires_at IS NOT NULL AND expires_at < ? AND ts < ?").bind(c, c).run(); }

  addOtpEvent(ev) {
    return this.d1.prepare("INSERT INTO otp_events (ts, country, service, user_id, inbox, number, code, sms, digits, lang, duplicate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(ev.ts, ev.country || "", ev.service || "", ev.user_id ? String(ev.user_id) : null, ev.inbox ? 1 : 0, ev.number || "", ev.code || "", ev.sms || "", ev.digits || 0, ev.lang || "", ev.duplicate ? 1 : 0).run();
  }
  async getOtpEventsSince(sinceTs, limit = 1000) {
    const { results } = await this.d1.prepare("SELECT * FROM otp_events WHERE ts >= ? ORDER BY ts DESC LIMIT ?").bind(sinceTs, limit).all();
    return results || [];
  }
  cleanupOldOtpEvents() { return this.d1.prepare("DELETE FROM otp_events WHERE ts < ?").bind(nowTs() - 7 * 86400).run(); }

  addWithdrawal(w) {
    const { id, user_id, method, amount, account, status, ts, type, ...extra } = w;
    return this.d1.prepare("INSERT INTO withdrawals (id, user_id, method, amount, account, status, ts, type, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(String(id), String(user_id), method || "", Number(amount || 0), account || "", status || "pending_manual", ts || 0, type || "manual", JSON.stringify(extra)).run();
  }
  async getWithdrawal(id) {
    const r = await this.d1.prepare("SELECT * FROM withdrawals WHERE id = ?").bind(String(id)).first();
    return r ? { ...JSON.parse(r.extra || "{}"), id: r.id, user_id: r.user_id, method: r.method, amount: r.amount, account: r.account, status: r.status, ts: r.ts, type: r.type } : null;
  }
  async updateWithdrawal(id, patch) {
    const cur = await this.getWithdrawal(id); if (!cur) return null;
    const u = { ...cur, ...patch };
    const { id: _i, user_id, method, amount, account, status, ts, type, ...extra } = u;
    await this.d1.prepare("UPDATE withdrawals SET method=?, amount=?, account=?, status=?, ts=?, type=?, extra=? WHERE id=?").bind(method || "", Number(amount || 0), account || "", status || "", ts || 0, type || "", JSON.stringify(extra), String(id)).run();
    return u;
  }
  async getWithdrawals(status = null, userId = null, limit = 50) {
    let sql = "SELECT * FROM withdrawals WHERE 1=1"; const b = [];
    if (status) { sql += " AND status = ?"; b.push(status); }
    if (userId) { sql += " AND user_id = ?"; b.push(String(userId)); }
    sql += " ORDER BY ts DESC LIMIT ?"; b.push(limit);
    const { results } = await this.d1.prepare(sql).bind(...b).all();
    return (results || []).map((r) => ({ ...JSON.parse(r.extra || "{}"), id: r.id, user_id: r.user_id, method: r.method, amount: r.amount, account: r.account, status: r.status, ts: r.ts, type: r.type }));
  }

  async isFilteredNumber(clean) { return !!(await this.d1.prepare("SELECT clean FROM filtered_numbers WHERE clean = ?").bind(clean).first()); }
  addFilteredNumber(e) { return this.d1.prepare("INSERT INTO filtered_numbers (clean, number, ts, service, country, code) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(clean) DO UPDATE SET ts=excluded.ts, code=excluded.code").bind(e.clean, e.number || "", e.ts, e.service || "", e.country || "", e.code || "").run(); }
  async countFilteredNumbers() { const r = await this.d1.prepare("SELECT COUNT(*) as cnt FROM filtered_numbers").first(); return r ? r.cnt : 0; }
  clearFilteredNumbers() { return this.d1.prepare("DELETE FROM filtered_numbers").run(); }
  cleanupFilteredNumbers(hrs) { return hrs > 0 ? this.d1.prepare("DELETE FROM filtered_numbers WHERE ts < ?").bind(nowTs() - hrs * 3600).run() : Promise.resolve(); }

  async isApiMsgSeen(key) { return !!(await this.d1.prepare("SELECT msg_key FROM seen_api_msgs WHERE msg_key = ?").bind(key).first()); }
  markApiMsgSeen(key) { return this.d1.prepare("INSERT OR IGNORE INTO seen_api_msgs (msg_key, ts) VALUES (?, ?)").bind(key, nowTs()).run(); }
  cleanupSeenApiMsgs() { return this.d1.prepare("DELETE FROM seen_api_msgs WHERE ts < ?").bind(nowTs() - 86400).run(); }

  setSupportMap(msgId, uid) { return this.d1.prepare("INSERT INTO support_map (msg_id, user_id, ts) VALUES (?, ?, ?) ON CONFLICT(msg_id) DO UPDATE SET user_id=excluded.user_id, ts=excluded.ts").bind(String(msgId), String(uid), nowTs()).run(); }
  async getSupportMap(msgId) { const r = await this.d1.prepare("SELECT user_id FROM support_map WHERE msg_id = ?").bind(String(msgId)).first(); return r ? r.user_id : null; }
  async getUserProfileStats(uid) {
    const sUid = String(uid), now = nowTs();
    const [soldRow, otpRow, wdRow] = await Promise.all([
      this.d1.prepare("SELECT COUNT(*) as cnt FROM sold WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)").bind(sUid, now).first(),
      this.d1.prepare("SELECT COUNT(*) as cnt FROM otp_events WHERE user_id = ? AND inbox = 1").bind(sUid).first(),
      this.d1.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as paid FROM withdrawals WHERE user_id = ?").bind(sUid).first(),
    ]);
    return {
      activeNumbers: Number(soldRow?.cnt || 0),
      totalOtps: Number(otpRow?.cnt || 0),
      totalWithdrawals: Number(wdRow?.cnt || 0),
      totalPaid: Number(wdRow?.paid || 0),
    };
  }
}

// ============ 5. KEYBOARDS ============
function mainMenuKb(isAdmin = false) {
  const rows = [
    [
      { text: "📞 Get Number", style: "primary" },
      { text: "📊 Live Traffic", style: "primary" },
    ],
    [
      { text: "💰 My Wallet", style: "primary" },
      { text: "🏆 Leaderboard", style: "primary" },
    ],
    [
      { text: "👤 Profile Status", style: "primary" },
      { text: "💬 Support", style: "primary" },
    ],
  ];
  if (isAdmin) {
    rows.push([{ text: "👑 Admin Panel", style: "primary" }]);
  }
  return rkb(rows);
}
function servicesKbAvailable(summary, walletConfig, platforms) {
  const buttons = [];
  for (const [svc, cmap] of Object.entries(summary || {})) {
    let total = 0;
    for (const [c, cnt] of Object.entries(cmap || {})) if (!isServiceCountryHidden(walletConfig, svc, c)) total += cnt;
    if (total > 0) buttons.push(btn(svc, { callback_data: `svc|${svc}`, icon_custom_emoji_id: getPlatformEmojiId(svc, platforms) || CUSTOM_EMOJIS.mobile }));
  }
  const rows = [];
  if (buttons.length) { for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2)); }
  else rows.push([btn("No Numbers Available", { callback_data: "noop", icon_custom_emoji_id: CUSTOM_EMOJIS.trash })]);
  return ikb(rows);
}
function countriesKb(svc, cmap, walletConfig) {
  const buttons = [];
  for (const c of Object.keys(cmap || {}).sort()) {
    if (isServiceCountryHidden(walletConfig, svc, c) || !(cmap[c] > 0)) continue;
    const [dial] = splitCountryProvider(c);
    const flagEid = FLAG_CUSTOM_EMOJIS[DIAL_TO_ISO[String(dial)] || String(dial).toUpperCase()] || CUSTOM_EMOJIS.globe;
    buttons.push(btn(getCountryButtonLabel(c), { callback_data: `cty|${svc}|${c}`, icon_custom_emoji_id: flagEid }));
  }
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([btn("Back", { callback_data: "get_number", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
  return ikb(rows);
}
function walletViewKb(walletConfig) {
  const rows = [
    [btn("💸 Withdraw", { callback_data: "withdraw_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.withdraw, style: "success" }), btn("⚙️ Set Wallet", { callback_data: "set_wallet_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.set_wallet })],
    [btn("👥 Referral", { callback_data: "referral_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.users }), btn("🔄 Refresh", { callback_data: "refresh_wallet", icon_custom_emoji_id: CUSTOM_EMOJIS.refresh })],
  ];
  if (walletConfig?.withdraw_tutorial_url) rows.push([btn("📺 Withdraw Tutorial", { url: walletConfig.withdraw_tutorial_url })]);
  return ikb(rows);
}
function adminPanelKb(uid, env, walletConfig) {
  const isSup = isSuperAdmin(uid, env), rows = [], m = [];
  if (isSup) rows.push([btn("👑 Manage Admins (Super Admin)", { callback_data: "adm_manage_admins_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.shield })]);
  if (isSup || hasPermission(uid, "numbers", env, walletConfig) || hasPermission(uid, "filter", env, walletConfig)) m.push(btn("📱 Numbers Management", { callback_data: "adm_menu_numbers", icon_custom_emoji_id: CUSTOM_EMOJIS.mobile }));
  if (isSup || hasPermission(uid, "stats", env, walletConfig) || isAdminUser(uid, env, walletConfig)) m.push(btn("📊 Traffic & Stats", { callback_data: "adm_menu_stats", icon_custom_emoji_id: CUSTOM_EMOJIS.chart }));
  if (isSup || hasPermission(uid, "wallet", env, walletConfig) || hasPermission(uid, "withdraw", env, walletConfig)) {
    m.push(btn("💰 Wallet & Withdraw", { callback_data: "adm_menu_wallet", icon_custom_emoji_id: CUSTOM_EMOJIS.wallet }));
    m.push(btn("🎁 Reward Management", { callback_data: "adm_reward_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.dollar }));
  }
  if (isSup || hasPermission(uid, "platforms", env, walletConfig)) m.push(btn("🌐 Platforms & Services", { callback_data: "adm_menu_platforms", icon_custom_emoji_id: CUSTOM_EMOJIS.folder }));
  if (isSup || hasPermission(uid, "stats", env, walletConfig) || isAdminUser(uid, env, walletConfig)) m.push(btn("👥 User Management", { callback_data: "adm_menu_users", icon_custom_emoji_id: CUSTOM_EMOJIS.users }));
  if (isSup || hasPermission(uid, "broadcast", env, walletConfig)) {
    m.push(btn("📢 Broadcast & Channels", { callback_data: "adm_menu_broadcast", icon_custom_emoji_id: CUSTOM_EMOJIS.broadcast }));
    m.push(btn("🔒 Force Join Channels", { callback_data: "adm_channels_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.channel_settings }));
  }
  if (isSup || hasPermission(uid, "otp_inbox", env, walletConfig)) m.push(btn("📥 OTP System & Inbox", { callback_data: "adm_menu_otp", icon_custom_emoji_id: CUSTOM_EMOJIS.otp_settings }));
  if (isSup || hasPermission(uid, "control", env, walletConfig)) m.push(btn("⚙️ System & Security", { callback_data: "adm_menu_system", icon_custom_emoji_id: CUSTOM_EMOJIS.shield }));
  for (let i = 0; i < m.length; i += 2) rows.push(m.slice(i, i + 2));
  return ikb(rows);
}

// ============ 6. CORE SERVICES ============
function parseChannelEntry(ch) {
  if (ch && typeof ch === "object") {
    return { id: String(ch.id || "").trim(), url: String(ch.url || "").trim() };
  }
  const s = String(ch || "").trim();
  if (s.includes("|")) {
    const [idPart, urlPart] = s.split("|", 2).map((x) => x.trim());
    return { id: idPart, url: urlPart };
  }
  if (/^https?:\/\/t\.me\//i.test(s)) {
    const slug = s.replace(/^https?:\/\/t\.me\//i, "").split(/[/?]/)[0];
    if (slug && !slug.startsWith("+")) {
      return { id: `@${slug}`, url: `https://t.me/${slug}` };
    }
    return { id: s, url: s };
  }
  const clean = s.startsWith("@") ? s : (/^-?\d+$/.test(s) ? s : `@${s}`);
  const url = clean.startsWith("@") ? `https://t.me/${clean.slice(1)}` : "";
  return { id: clean, url };
}
async function getChannelTitle(ch, tg) {
  const entry = parseChannelEntry(ch);
  const c = entry.id;
  if (CHANNEL_TITLE_CACHE[c]) return CHANNEL_TITLE_CACHE[c];
  try { const r = await tg.getChat(c); if (r.ok && r.result?.title) { CHANNEL_TITLE_CACHE[c] = r.result.title; return r.result.title; } } catch {}
  return c.replace(/^@/, "");
}
async function getUnjoinedChannels(userId, db, tg, env, walletConfig, force = false) {
  if (isAdminUser(userId, env, walletConfig)) return [];
  const req = walletConfig.required_channels !== undefined ? walletConfig.required_channels : DEFAULT_REQUIRED_CHANNELS;
  if (!req?.length) return [];
  const chUpdatedAt = Number(walletConfig.channels_updated_at || 0);
  if (!force) {
    const u = await db.getUser(userId);
    if (u?.joined && u.joined >= chUpdatedAt) return [];
  }
  const results = await Promise.all(req.map(async (ch) => {
    const entry = parseChannelEntry(ch);
    try {
      const r = await tg.getChatMember(entry.id, userId);
      return (!r.ok || !["member", "administrator", "creator"].includes(r.result?.status)) ? ch : null;
    } catch { return ch; }
  }));
  const unjoined = results.filter(Boolean);
  if (!unjoined.length) { const u = await db.getUser(userId); if (u) { u.joined = nowTs(); await db.saveUser(userId, u); } }
  return unjoined;
}
async function ensureMembership(uid, chatId, msgId, db, tg, env, walletConfig) {
  const unjoined = await getUnjoinedChannels(uid, db, tg, env, walletConfig, false);
  if (!unjoined.length) return true;
  const titleList = await Promise.all(unjoined.map((ch) => getChannelTitle(ch, tg)));
  const titles = [], rows = [];
  unjoined.forEach((ch, idx) => {
    const entry = parseChannelEntry(ch), title = titleList[idx];
    titles.push(`• ${title}`);
    if (entry.url) rows.push([btn(`📢 ${title}`, { url: entry.url })]);
  });
  rows.push([btn("I have joined", { callback_data: "check_join", icon_custom_emoji_id: CUSTOM_EMOJIS.check })]);
  const prompt = `🔒 <b>Access Restricted</b>\n\nYou must join the following channel(s)/group(s) to use this bot:\n${titles.join("\n")}\n\nPlease join and click '✅ I have joined' to verify.`;
  if (msgId) await tg.safeEditMessage(chatId, msgId, prompt, ikb(rows));
  else await tg.sendMessage(chatId, prompt, { reply_markup: ikb(rows) });
  return false;
}

async function deliverNumbersToUser(db, tg, chatId, msgId, uid, svc, ccode, walletConfig, platforms, ctx = null) {
  if (isServiceCountryHidden(walletConfig, svc, ccode)) {
    const notice = `<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.trash, "🚫")} Numbers Temporarily Unavailable</b>\n\n${getPlatformEmojiHtml(svc, platforms)} <b>Service:</b> ${svc}\n${getCountryFlagEmoji(ccode)} <b>Country:</b> ${getCountryDisplayName(ccode)}\n\nPlease select another country!</blockquote>`;
    const kb = ikb([[btn("Select Other Country", { callback_data: `country_list|${svc}`, icon_custom_emoji_id: CUSTOM_EMOJIS.globe })]]);
    if (msgId) await tg.safeEditMessage(chatId, msgId, notice, kb); else await tg.sendMessage(chatId, notice, { reply_markup: kb });
    return;
  }
  const [popped, , user] = await Promise.all([
    db.popNumbers(svc, ccode, getCountryNumberLimit(walletConfig, ccode)),
    db.expireUserNumbers(uid),
    db.getUser(uid),
  ]);
  if (!popped.length) {
    const kb = ikb([[btn("🔙 Back", { callback_data: `country_list|${svc}`, icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]);
    const m = `❌ No numbers left for <b>${svc}</b> (${getCountryDisplayName(ccode)}).`;
    if (msgId) await tg.safeEditMessage(chatId, msgId, m, kb); else await tg.sendMessage(chatId, m, { reply_markup: kb });
    return;
  }
  const now = nowTs(), exp = now + NUMBER_VALIDITY_SECONDS, fullNums = [], soldItems = [];
  for (const raw of popped) {
    const fmt = formatNumber(raw, ccode);
    fullNums.push(fmt);
    soldItems.push({ number: fmt, clean_number: fmt.replace(/[^\d]/g, ""), service: svc, country: ccode, user_id: String(uid), ts: now, expires_at: exp });
  }
  const [, rem] = await Promise.all([
    db.addSoldBatch(soldItems),
    db.getNumbersList(svc, ccode, 1),
  ]);
  if (user) {
    user.service = svc; user.country = ccode; user.last_seen = now;
    const saveP = db.saveUser(uid, user);
    if (ctx?.waitUntil) ctx.waitUntil(saveP); else await saveP;
  }
  const [dial] = splitCountryProvider(ccode);
  const msgHtml = `<blockquote><b>╭──────── ⋆⋅☆⋅⋆ ────────╮</b>\n<b>  ${getCountryFlagEmoji(dial)} ${getCountryDisplayName(ccode)} Fresh Number</b>\n<b>   ${getPlatformEmojiHtml(svc, platforms)} ${svc} • <tg-emoji emoji-id="5978841844673416652">⏳</tg-emoji> ${NUMBER_VALIDITY_SECONDS / 60}M</b>\n<b>   <tg-emoji emoji-id="6282702779341346176">🔄</tg-emoji> Refreshed: ${new Date().toLocaleTimeString("en-US", { hour12: true })}</b>\n<b>╰──────── ⋆⋅☆⋅⋆ ────────╯</b></blockquote>`;
  const rows = fullNums.map((n) => [btn(n, { copy_text: n, icon_custom_emoji_id: CUSTOM_EMOJIS.number_copy, style: "success" })]);
  const rowB = [];
  if (rem.length) rowB.push(btn("🔄 Change Number", { callback_data: `refresh|${svc}|${ccode}`, icon_custom_emoji_id: "6282702779341346176" }));
  rowB.push(btn("🌍 Country", { callback_data: `country_list|${svc}`, icon_custom_emoji_id: CUSTOM_EMOJIS.globe }));
  rows.push(rowB);
  const otpGroupUrl = walletConfig?.channel_logs?.otp_group?.channel_url || "https://t.me/+Nlyujg2sScVhMzc1";
  rows.push([btn("👥 OTP Group", { url: otpGroupUrl, icon_custom_emoji_id: CUSTOM_EMOJIS.otp_group })]);
  if (msgId) await tg.safeEditMessage(chatId, msgId, msgHtml, ikb(rows)); else await tg.sendMessage(chatId, msgHtml, { reply_markup: ikb(rows) });
}

function getCycleInfo(ts = null, st = {}) {
  const now = ts !== null ? ts : nowTs();
  const bdDate = new Date((now + 6 * 3600) * 1000); // Bangladesh Time (UTC+6)
  const ch = Number(st.cycle_hours || 168);
  const ctype = st.cycle_type || "weekly";
  if (ctype === "weekly" || ch >= 168) {
    // 7-day weekly cycle: resets every Saturday 00:00 BD Time (UTC+6)
    const daysSinceSat = (bdDate.getUTCDay() + 1) % 7; // Sat=0, Sun=1, ..., Fri=6
    const weekStartBdMs = Date.UTC(bdDate.getUTCFullYear(), bdDate.getUTCMonth(), bdDate.getUTCDate() - daysSinceSat);
    const weekEndUtcSec = Math.floor((weekStartBdMs + 7 * 86400000) / 1000) - 6 * 3600;
    const rem = Math.max(0, weekEndUtcSec - now);
    const dayKeys = [];
    for (let i = 0; i < 7; i++) dayKeys.push(new Date(weekStartBdMs + i * 86400000).toISOString().slice(0, 10));
    return {
      cycle_key: `week_${dayKeys[0]}`,
      day_keys: dayKeys,
      days_left: Math.floor(rem / 86400),
      hours_left: Math.floor((rem % 86400) / 3600),
      mins_left: Math.floor((rem % 3600) / 60),
      label: "Weekly (Sat–Fri)",
    };
  }
  const d = new Date(now * 1000);
  if (ctype === "hourly" || ch < 24) {
    const p = Math.max(1, ch) * 3600, b = Math.floor(now / p), rem = Math.max(0, (b + 1) * p - now);
    return { cycle_key: `${d.toISOString().slice(0, 10)}_b${b}`, days_left: 0, hours_left: Math.floor(rem / 3600), mins_left: Math.floor((rem % 3600) / 60), label: `${ch}h Cycle` };
  }
  const nextM = Math.floor(Date.UTC(bdDate.getUTCFullYear(), bdDate.getUTCMonth(), bdDate.getUTCDate() + 1) / 1000) - 6 * 3600;
  const rem = Math.max(0, nextM - now);
  return { cycle_key: bdDate.toISOString().slice(0, 10), days_left: 0, hours_left: Math.floor(rem / 3600), mins_left: Math.floor((rem % 3600) / 60), label: "Daily (24h)" };
}
function calculateUserLevel(lb, uid, dateStr) {
  const st = lb.settings || {}, reqs = st.requirements || {}, days = Number(reqs.streak_days || 7);
  const base = /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? new Date(dateStr.slice(0, 10) + "T00:00:00Z") : new Date();
  const counts = [];
  for (let i = 0; i < days; i++) counts.push(Number(lb.daily_stats?.[new Date(base.getTime() - i * 86400000).toISOString().slice(0, 10)]?.[String(uid)] || 0));
  if (counts.every((c) => c >= (reqs.diamond_min || 31))) return "diamond";
  if (counts.every((c) => c >= (reqs.gold_min || 10))) return "gold";
  if (counts.every((c) => c >= (reqs.silver_min || 5))) return "silver";
  return "none";
}
async function formatLeaderboardMessage(db, uid) {
  const lb = await db.getLeaderboard(), st = lb.settings || {};
  const now = nowTs();
  if (st.enabled === false) return ["<blockquote>🏆 <b>TOP OTP LEADERBOARD</b>\n\n⚠️ <i>Paused by Admin.</i></blockquote>", []];
  const ci = getCycleInfo(now, st);
  const aggStats = {};
  if (Array.isArray(ci.day_keys)) {
    for (const dk of ci.day_keys) {
      const ds = lb.daily_stats?.[dk] || {};
      for (const [uId, c] of Object.entries(ds)) aggStats[uId] = (aggStats[uId] || 0) + Number(c || 0);
    }
  } else {
    Object.assign(aggStats, lb.daily_stats?.[ci.cycle_key] || {});
  }
  const sorted = Object.entries(aggStats).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const topN = Number(st.top_winners_count || 5);
  const resetStr = ci.days_left > 0 ? `${ci.days_left}d ${String(ci.hours_left).padStart(2, "0")}h ${String(ci.mins_left).padStart(2, "0")}m` : `${String(ci.hours_left).padStart(2, "0")}h ${String(ci.mins_left).padStart(2, "0")}m`;
  const rewardText = st.reward_text || DEFAULT_LEADERBOARD.settings.reward_text;
  const rankIcons = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const lines = [
    `<blockquote>🎁 <b>WEEKLY LEADERBOARD REWARD</b>\n${escapeHtml(rewardText)}</blockquote>\n`,
    `<blockquote>🏆 <b>TOP ${topN} OTP LEADERBOARD</b>\n⏳ <b>New Week In:</b> <code>${resetStr}</code> • <i>${ci.label}</i></blockquote>\n`,
  ];
  for (let i = 0; i < Math.min(topN, sorted.length); i++) {
    const [uId, cnt] = sorted[i], u = await db.getUser(uId);
    const badge = rankIcons[i] || `#${i + 1}`;
    lines.push(`${badge} <b>#${i + 1} ${escapeHtml(u?.name || `User_${uId.slice(-4)}`)}</b> — <b>${cnt} OTPs</b>`);
  }
  if (!sorted.length) lines.push("<i>No OTP activity in this week yet.</i>");
  const myOtps = aggStats[String(uid)] || 0;
  const myRank = sorted.findIndex(([uId]) => String(uId) === String(uid));
  const rankStr = myRank >= 0 ? `#${myRank + 1}` : "Unranked";
  lines.push(`\n<blockquote>👤 <b>YOUR STATS (${rankStr}):</b> <b>${myOtps} OTPs</b>\n<i>Top 5 are selected automatically every Saturday. Rewards are provided by Admin.</i></blockquote>`);
  return [premiumizeText(lines.join("\n")), []];
}
function leaderboardViewKb() {
  return ikb([[btn("🔄 Refresh", { callback_data: "refresh_leaderboard", icon_custom_emoji_id: CUSTOM_EMOJIS.refresh, style: "primary" })]]);
}

async function getTrafficStats(db, walletConfig) {
  const mins = Number(walletConfig.live_traffic_minutes || 60), events = await db.getOtpEventsSince(nowTs() - mins * 60, 2000);
  const cCnt = {}, sCnt = {};
  for (const ev of events) {
    if (!ev.inbox) continue;
    const c = String(ev.country || "unknown"), s = normalizeServiceName(ev.service || "Unknown");
    if (isServiceCountryHidden(walletConfig, s, c) || isCountryHidden(walletConfig, c)) continue;
    cCnt[c] = (cCnt[c] || 0) + 1; sCnt[s] = (sCnt[s] || 0) + 1;
  }
  const total = Object.values(cCnt).reduce((a, b) => a + b, 0);
  if (!total) return `<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.live_system, "🟢")} Live Traffic Stats (${mins}m)</b>\n<i>No OTP activity currently.</i></blockquote>`;
  const lines = [`<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.live_system, "🟢")} Live Traffic Stats (${mins}m)</b>\n`, "<b>🌍 By Country:</b>"];
  for (const [c, cnt] of Object.entries(cCnt).sort((a, b) => b[1] - a[1]).slice(0, 5)) lines.push(`  ${getCountryFlagEmoji(c)} ${getCountryDisplayName(c)}: <b>${((cnt / total) * 100).toFixed(1)}%</b>`);
  lines.push("\n<b>📱 By Service:</b>");
  for (const [s, cnt] of Object.entries(sCnt).sort((a, b) => b[1] - a[1]).slice(0, 5)) lines.push(`  ${getPlatformEmojiHtml(s)} ${s}: <b>${((cnt / total) * 100).toFixed(1)}%</b>`);
  lines.push("</blockquote>");
  return lines.join("\n");
}

async function formatWalletMessage(db, uid, walletConfig) {
  const user = (await db.getUser(uid)) || {}, bal = Number(user.balance || 0), rate = Number(walletConfig.usd_to_bdt_rate || USD_TO_BDT);
  const wList = Object.entries(walletConfig.withdraw_methods || {}).map(([m, d]) => `${tgEmoji(d.emoji_id || CUSTOM_EMOJIS.set_wallet, "📱")} <b>${escapeHtml(m)}:</b> ${user.wallets?.[m] ? `<code>${escapeHtml(user.wallets[m])}</code> ✅` : "<i>Not Set</i> ⚠️"}`);
  const recent = await db.getWithdrawals(null, uid, 5);
  const hLines = recent.map((w) => `• <b>৳${Number(w.amount).toFixed(2)}</b> via ${escapeHtml(w.method)} [<b>${w.status}</b>]`);
  return `<blockquote>${tgEmoji(CUSTOM_EMOJIS.wallet, "💰")} <b>YOUR WALLET</b>\n👤 ${escapeHtml(user.name || uid)} (<code>${uid}</code>)</blockquote>\n\n💵 <b>Balance:</b> <b>৳${bal.toFixed(2)} BDT</b> (<code>$${(bal / rate).toFixed(3)}</code>)\n👥 <b>Referrals:</b> ${user.referral_count || 0} • <b>Earned:</b> ৳${Number(user.referral_earnings || 0).toFixed(2)}\n\n<b>💳 Wallets:</b>\n${wList.join("\n")}\n\n<b>📜 Recent Withdrawals:</b>\n${hLines.length ? hLines.join("\n") : "<i>None yet</i>"}`;
}
async function formatProfileStatusMessage(db, uid, walletConfig, platforms) {
  const [user, stats, lb] = await Promise.all([
    db.getUser(uid),
    db.getUserProfileStats(uid),
    db.getLeaderboard(),
  ]);
  const u = user || {};
  const bal = Number(u.balance || 0);
  const usdRate = Number(walletConfig.usd_to_bdt_rate || USD_TO_BDT);
  const joinedStr = u.joined ? new Date(u.joined * 1000).toISOString().slice(0, 16).replace("T", " ") : "N/A";
  const seenStr = u.last_seen ? new Date(u.last_seen * 1000).toISOString().slice(0, 16).replace("T", " ") : "Now";
  const ci = getCycleInfo(nowTs(), lb.settings || {});
  const cycleOtps = lb.daily_stats?.[ci.cycle_key]?.[String(uid)] || 0;
  const lvl = calculateUserLevel(lb, uid, ci.cycle_key);
  const lvlNames = { diamond: "💎 Diamond", gold: "👑 Gold", silver: "🥈 Silver", none: "🎖 Regular" };
  const wList = Object.entries(walletConfig.withdraw_methods || {}).map(([m]) =>
    `  • <b>${escapeHtml(m)}:</b> ${u.wallets?.[m] ? `<code>${escapeHtml(u.wallets[m])}</code> ✅` : "<i>Not Set</i>"}`
  );
  const curSvc = u.service ? `${getPlatformEmojiHtml(u.service, platforms)} ${escapeHtml(u.service)}` : "None";
  const curCty = u.country ? getCountryButtonLabel(u.country) : "None";
  return (
    `<blockquote>${tgEmoji(CUSTOM_EMOJIS.user, "👤")} <b>USER PROFILE STATUS</b></blockquote>\n\n` +
    `📛 <b>Name:</b> ${escapeHtml(u.name || "User")}\n` +
    `🔗 <b>Username:</b> ${u.username ? "@" + escapeHtml(u.username) : "<i>None</i>"}\n` +
    `🆔 <b>User ID:</b> <code>${uid}</code>\n` +
    `📅 <b>Joined:</b> <code>${joinedStr}</code>\n` +
    `🕒 <b>Last Active:</b> <code>${seenStr}</code>\n\n` +
    `💰 <b>Balance:</b> <b>৳${bal.toFixed(2)} BDT</b> (<code>$${(bal / usdRate).toFixed(3)}</code>)\n` +
    `📩 <b>Total OTPs Received:</b> <b>${stats.totalOtps}</b>\n` +
    `📱 <b>Active Numbers:</b> <b>${stats.activeNumbers}</b>\n` +
    `⚙️ <b>Last Selection:</b> ${curSvc} • ${curCty}\n\n` +
    `🏆 <b>Leaderboard Tier:</b> ${lvlNames[lvl] || "Regular"} (<b>${cycleOtps}</b> OTPs this cycle)\n` +
    `👥 <b>Referrals:</b> <b>${u.referral_count || 0}</b> • <b>Ref Earned:</b> <b>৳${Number(u.referral_earnings || 0).toFixed(2)}</b>\n` +
    `💸 <b>Withdrawals:</b> <b>${stats.totalWithdrawals}</b> (Paid: <b>৳${stats.totalPaid.toFixed(2)}</b>)\n\n` +
    `<b>💳 Saved Wallets:</b>\n${wList.length ? wList.join("\n") : "  <i>None configured</i>"}`
  );
}
function profileViewKb() {
  return ikb([
    [btn("🔄 Refresh Profile", { callback_data: "refresh_profile", icon_custom_emoji_id: CUSTOM_EMOJIS.refresh, style: "primary" })],
    [
      btn("💰 My Wallet", { callback_data: "refresh_wallet", icon_custom_emoji_id: CUSTOM_EMOJIS.wallet, style: "primary" }),
      btn("📱 Get Number", { callback_data: "get_number", icon_custom_emoji_id: CUSTOM_EMOJIS.get_number, style: "success" }),
    ],
  ]);
}

async function deliverVerifiedOtp(db, tg, walletConfig, platforms, number, service, otpCode, smsBody = "") {
  const cleanNum = String(number || "").replace(/[^\d]/g, "");
  if (!cleanNum) return false;
  const codeStr = String(otpCode || "N/A").trim() || "N/A", now = nowTs();
  const matches = await db.findActiveSoldByCandidates([cleanNum, `+${cleanNum}`], now);
  const matched = matches.find((r) => service !== "Unknown" && normalizeServiceName(r.service) === normalizeServiceName(service)) || matches[0];

  if (walletConfig.number_filter?.enabled && cleanNum.length >= 7 && cleanNum !== codeStr) {
    await db.addFilteredNumber({ clean: cleanNum, number: cleanNum, ts: now, service, country: matched?.country || "", code: codeStr });
    await db.removeNumbersByCleanList(new Set([cleanNum]));
  }

  if (!matched) {
    const [cc] = extractCountryCode(cleanNum);
    await db.addOtpEvent({ ts: now, country: cc, service, user_id: "No User", inbox: 0, number: cleanNum, code: codeStr, sms: smsBody });
    return false;
  }

  const buyerId = matched.user_id, displayNum = (matched.number || cleanNum).replace(/^\+/, "");
  const countryCode = matched.country && matched.country !== "unknown" ? matched.country : extractCountryCode(displayNum)[0];
  const svcName = matched.service && matched.service !== "Unknown" ? matched.service : service;
  const userData = await db.getUser(buyerId);
  let dup = false;
  if (userData) {
    if (!userData.otps || Array.isArray(userData.otps)) userData.otps = {};
    const ex = userData.otps[displayNum];
    dup = codeStr === "N/A" ? Boolean(ex && ex.code === "N/A" && ex.sms === smsBody) : Boolean(ex && ex.code === codeStr);
    if (!dup) {
      userData.otps[displayNum] = { code: codeStr, sms: smsBody, time: now };
      const rate = getRewardRate(walletConfig, svcName, countryCode, userData);
      userData.balance = Number(((userData.balance || 0) + rate).toFixed(2));
      await db.saveUser(buyerId, userData);
      const lb = await db.getLeaderboard(), ck = new Date((now + 6 * 3600) * 1000).toISOString().slice(0, 10);
      if (!lb.daily_stats[ck]) lb.daily_stats[ck] = {};
      lb.daily_stats[ck][String(buyerId)] = (lb.daily_stats[ck][String(buyerId)] || 0) + 1;
      await db.saveLeaderboard(lb);
      if (userData.referred_by && String(userData.referred_by) !== String(buyerId)) {
        const comm = Number((rate * (Number(walletConfig.referral_percent ?? 10) / 100)).toFixed(4));
        const refU = await db.getUser(userData.referred_by);
        if (refU && comm > 0) { refU.balance = Number(((refU.balance || 0) + comm).toFixed(2)); refU.referral_earnings = Number(((refU.referral_earnings || 0) + comm).toFixed(2)); await db.saveUser(userData.referred_by, refU); }
      }
    }
  }
  await db.addOtpEvent({ ts: now, country: countryCode, service: svcName, user_id: buyerId, inbox: 1, number: displayNum, code: codeStr, sms: smsBody, duplicate: dup });
  const rate = getRewardRate(walletConfig, svcName, countryCode, userData), [dial] = splitCountryProvider(countryCode);
  const otpMsg = dup
    ? `${getCountryFlagEmoji(dial)} <b>${getCountryDisplayName(countryCode)} - ${escapeHtml(svcName)}</b>\n📱 <code>${displayNum}</code>\n<i>⚠️ Duplicate OTP</i>`
    : `${getCountryFlagEmoji(dial)} <b>${getCountryDisplayName(countryCode)} - ${escapeHtml(svcName)}</b>\n📱 <code>${displayNum}</code>\n${tgEmoji(CUSTOM_EMOJIS.money, "💰")} <b>Earned:</b> +৳${rate.toFixed(2)} BDT`;
  const btns = [];
  if (codeStr !== "N/A") btns.push(btn(codeStr, { copy_text: codeStr, icon_custom_emoji_id: CUSTOM_EMOJIS.otp_copy }));
  if (smsBody) btns.push(btn("Full SMS", { copy_text: smsBody.slice(0, 256), icon_custom_emoji_id: CUSTOM_EMOJIS.clipboard }));
  await tg.sendMessage(buyerId, otpMsg, { reply_markup: btns.length ? ikb([btns]) : null }).catch(() => {});
  return true;
}

async function pollOtpInboxApis(db, tg, walletConfig, platforms, force = false) {
  const cfg = walletConfig.otp_inbox_api || {};
  if (!force && !cfg.enabled) return 0;
  let total = 0;
  for (const api of cfg.apis || []) {
    if (!api.enabled || !api.url) continue;
    try {
      let url = api.url; const headers = { Accept: "application/json" };
      if (api.scheme === "bearer") headers.Authorization = `Bearer ${api.token}`;
      else url += (url.includes("?") ? "&" : "?") + `token=${encodeURIComponent(api.token || "")}&records=25`;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data) ? data : data?.data || data?.records || data?.messages || data?.aaData || [];
      for (const r of rows) {
        const num = Array.isArray(r) ? String(r[2] || r[1] || "") : String(r.num || r.number || r.phone || "");
        const svc = Array.isArray(r) ? String(r[3] || "Unknown") : String(r.cli || r.service || r.app || "Unknown");
        const sms = Array.isArray(r) ? String(r[4] || "") : String(r.message || r.sms || r.text || "");
        if (!num || !sms) continue;
        const key = `${api.id}|${num}|${sms.slice(0, 60)}`;
        if (await db.isApiMsgSeen(key)) continue;
        await db.markApiMsgSeen(key);
        const clean = num.replace(/[^\d]/g, "");
        if (await deliverVerifiedOtp(db, tg, walletConfig, platforms, clean, normalizeServiceName(svc), extractOtpCode(sms, [clean]) || "N/A", sms)) total++;
      }
    } catch {}
  }
  return total;
}

// ============ 7. UPDATE ROUTER (COMMANDS, CALLBACKS, MESSAGES) ============
async function handleTelegramUpdate(update, env, ctx = null) {
  const db = new BotDB(env.DB), tg = new TelegramAPI(env.BOT_TOKEN);
  const actorUid = update.callback_query?.from?.id || update.message?.from?.id || null;
  await db.preloadCore(actorUid);
  const walletConfig = await db.getWalletConfig(), platforms = await db.getPlatforms();

  // Ban check for non-admin users
  if (actorUid && !isAdminUser(actorUid, env, walletConfig)) {
    const actorU = await db.getUser(actorUid);
    if (actorU?.banned) {
      if (update.callback_query) {
        await tg.answerCallbackQuery(update.callback_query.id, "🚫 Your account is banned.").catch(() => {});
      } else if (update.message?.chat?.type === "private") {
        await tg.sendMessage(update.message.chat.id, "🚫 <b>Your account has been banned by Admin.</b>");
      }
      return new Response("OK");
    }
  }

  if (update.callback_query) {
    const call = update.callback_query, data = call.data || "", uid = String(call.from.id), chatId = call.message?.chat?.id || uid, msgId = call.message?.message_id;
    const ackP = tg.answerCallbackQuery(call.id).catch(() => {});
    if (ctx?.waitUntil) ctx.waitUntil(ackP); else await ackP;
    if (data === "noop") return new Response("OK");
    if (data === "check_join") {
      const un = await getUnjoinedChannels(uid, db, tg, env, walletConfig, true);
      if (un.length) { await ensureMembership(uid, chatId, msgId, db, tg, env, walletConfig); return new Response("OK"); }
      await tg.deleteMessage(chatId, msgId).catch(() => {});
      await tg.sendMessage(chatId, "✅ <b>Verified!</b> Welcome to the bot.", { reply_markup: mainMenuKb(isAdminUser(uid, env, walletConfig)) });
      return new Response("OK");
    }
    if (!(await ensureMembership(uid, chatId, msgId, db, tg, env, walletConfig))) return new Response("OK");
    if (data === "get_number") {
      const sum = await db.getAllNumbersSummary();
      await tg.safeEditMessage(chatId, msgId, `<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.get_number, "📱")} Select a Service</b></blockquote>`, servicesKbAvailable(sum, walletConfig, platforms));
    } else if (data.startsWith("svc|") || data.startsWith("country_list|")) {
      const svc = data.split("|")[1], cmap = await db.getCountryCounts(svc);
      await tg.safeEditMessage(chatId, msgId, `<blockquote><b>${getPlatformEmojiHtml(svc, platforms)} ${escapeHtml(svc)} — Select Country</b></blockquote>`, countriesKb(svc, cmap, walletConfig));
    } else if (data.startsWith("cty|") || data.startsWith("refresh|")) {
      const [, svc, cc] = data.split("|");
      await deliverNumbersToUser(db, tg, chatId, msgId, uid, svc, cc, walletConfig, platforms, ctx);
    } else if (data === "refresh_traffic") {
      await tg.safeEditMessage(chatId, msgId, await getTrafficStats(db, walletConfig), ikb([[btn("🔄 Refresh Traffic", { callback_data: "refresh_traffic" })], [btn("📱 Get Number", { callback_data: "get_number", style: "success" })]]));
    } else if (data === "refresh_wallet" || data === "wallet_back") {
      await tg.safeEditMessage(chatId, msgId, await formatWalletMessage(db, uid, walletConfig), walletViewKb(walletConfig));
    } else if (data === "refresh_profile") {
      await tg.safeEditMessage(chatId, msgId, await formatProfileStatusMessage(db, uid, walletConfig, platforms), profileViewKb());
    } else if (data === "set_wallet_menu") {
      const rows = Object.entries(walletConfig.withdraw_methods || {}).map(([m, d]) => [btn(`Set ${m}`, { callback_data: `set_w|${m}`, icon_custom_emoji_id: d.emoji_id || CUSTOM_EMOJIS.set_wallet })]);
      rows.push([btn("Back", { callback_data: "wallet_back", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
      await tg.safeEditMessage(chatId, msgId, "⚙️ <b>Select a wallet method:</b>", ikb(rows));
    } else if (data.startsWith("set_w|")) {
      const u = await db.getUser(uid); if (u) { u.pending_action = { action: "set_wallet", method: data.split("|")[1] }; await db.saveUser(uid, u); }
      await tg.sendMessage(chatId, `✏️ Send your <b>${escapeHtml(data.split("|")[1])}</b> wallet/number (or /cancel):`);
    } else if (data === "withdraw_menu") {
      if (!walletConfig.withdraw_enabled) { await tg.sendMessage(chatId, "⚠️ Withdrawals are disabled."); return new Response("OK"); }
      const rows = Object.entries(walletConfig.withdraw_methods || {}).map(([m, d]) => [btn(`${m} (Min ৳${d.min_withdraw || 10})`, { callback_data: `wd_method|${m}`, style: "success" })]);
      rows.push([btn("Back", { callback_data: "wallet_back", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
      await tg.safeEditMessage(chatId, msgId, "💸 <b>Select Withdrawal Method:</b>", ikb(rows));
    } else if (data.startsWith("wd_method|")) {
      const m = data.split("|")[1], u = await db.getUser(uid);
      if (!u?.wallets?.[m]) { await tg.sendMessage(chatId, `⚠️ Set your <b>${escapeHtml(m)}</b> wallet first!`); return new Response("OK"); }
      u.pending_action = { action: "withdraw_amount", method: m }; await db.saveUser(uid, u);
      await tg.sendMessage(chatId, `💸 Enter BDT amount to withdraw via <b>${escapeHtml(m)}</b> (Balance: ৳${Number(u.balance || 0).toFixed(2)}):`);
    } else if (data === "referral_menu") {
      if (!globalThis._botUsername) {
        const me = await tg.getMe();
        if (me.ok && me.result?.username) globalThis._botUsername = me.result.username;
      }
      const uname = globalThis._botUsername || "bot", u = (await db.getUser(uid)) || {};
      const link = `https://t.me/${uname}?start=ref_${uid}`;
      await tg.safeEditMessage(chatId, msgId, `<blockquote>👥 <b>Referral Link:</b> <code>${link}</code>\n🎁 Commission: <b>${walletConfig.referral_percent ?? 10}%</b>\n👤 Referrals: ${u.referral_count || 0} • Earned: ৳${Number(u.referral_earnings || 0).toFixed(2)}</blockquote>`, ikb([[btn("📋 Copy Link", { copy_text: link, style: "success" })], [btn("Back", { callback_data: "wallet_back", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
    } else if (data === "refresh_leaderboard") {
      const [txt, pc] = await formatLeaderboardMessage(db, uid);
      await tg.safeEditMessage(chatId, msgId, txt, leaderboardViewKb(pc));
    } else if (data.startsWith("claim_lb|")) {
      const cid = data.split("|")[1], lb = await db.getLeaderboard(), cl = lb.claims?.[cid];
      if (cl && String(cl.user_id) === uid && cl.status === "pending" && nowTs() <= (cl.expires_at || 0)) {
        cl.status = "claimed"; await db.saveLeaderboard(lb);
        const u = await db.getUser(uid); if (u) { u.balance = Number(((u.balance || 0) + Number(cl.amount || 0)).toFixed(2)); await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `🎉 Claimed <b>৳${Number(cl.amount).toFixed(2)} BDT</b>!`);
      } else await tg.sendMessage(chatId, "⚠️ Claim unavailable or expired.");
    } else if (data === "start_live_support") {
      const u = await db.getUser(uid); if (u) { u.pending_action = { action: "live_support" }; await db.saveUser(uid, u); }
      await tg.sendMessage(chatId, "💬 Send your message for Admin Support (or /cancel):");
    } else if (isAdminUser(uid, env, walletConfig)) {
      if (data === "adm_panel") await tg.safeEditMessage(chatId, msgId, "👑 <b>Admin Control Hub</b>", adminPanelKb(uid, env, walletConfig));
      else if (data === "adm_menu_platforms") await tg.safeEditMessage(chatId, msgId, "🌐 <b>Platforms, Services & Providers</b>", ikb([[btn("🌐 Manage Services", { callback_data: "adm_platforms_menu", style: "success" }), btn("📦 Manage Providers", { callback_data: "adm_providers_menu" })], [btn("🔙 Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_platforms_menu") {
        const rows = Object.keys(platforms).map((p) => [btn(`🗑️ ${p}`, { callback_data: `adm_del_plat_confirm|${p}`, style: "danger" })]);
        rows.push([btn("➕ Add New Service", { callback_data: "adm_add_platform", style: "success" })]);
        rows.push([btn("🔙 Back", { callback_data: "adm_menu_platforms", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, `🌐 <b>Manage Services (${Object.keys(platforms).length})</b>\nTap a service to delete it, or add a new one:`, ikb(rows));
      } else if (data === "adm_add_platform") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_add_platform" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🌐 Send the new <b>Service Name</b> (e.g. <code>Discord</code>, <code>Snapchat</code>, <code>PayPal</code>):\nSend /cancel to abort.");
      } else if (data.startsWith("adm_del_plat_confirm|")) {
        const svc = data.split("|")[1];
        const kb = ikb([
          [btn(`✅ Yes, Delete ${svc}`, { callback_data: `adm_del_plat|${svc}`, style: "danger" })],
          [btn("🔙 Cancel", { callback_data: "adm_platforms_menu", style: "primary" })],
        ]);
        await tg.safeEditMessage(chatId, msgId, `⚠️ <b>Confirm Delete Service</b>\n\nAre you sure you want to delete <b>${escapeHtml(svc)}</b>?\n<i>All available numbers under this service will also be removed!</i>`, kb);
      } else if (data.startsWith("adm_del_plat|")) {
        const svc = data.split("|")[1];
        delete platforms[svc];
        await Promise.all([db.savePlatforms(platforms), db.removeNumbersByService(svc)]);
        await tg.safeEditMessage(chatId, msgId, `✅ Deleted service <b>${escapeHtml(svc)}</b> and its numbers.`, adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_providers_menu") {
        const provs = await db.getProviders();
        const rows = provs.map((p) => [btn(`❌ ${p}`, { callback_data: `adm_del_prov|${p}`, style: "danger" })]);
        rows.push([btn("➕ Add Provider", { callback_data: "adm_add_provider", style: "success" })]);
        rows.push([btn("🔙 Back", { callback_data: "adm_menu_platforms", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, "📦 <b>Manage Providers</b>", ikb(rows));
      } else if (data === "adm_add_provider") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_add_provider" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "📦 Enter new <b>Provider Name</b> (or /cancel):");
      } else if (data.startsWith("adm_del_prov|")) {
        const p = data.split("|")[1], provs = (await db.getProviders()).filter((x) => x !== p);
        await db.saveProviders(provs);
        await tg.safeEditMessage(chatId, msgId, `✅ Deleted provider <b>${escapeHtml(p)}</b>.`, adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_menu_users") {
        const kb = ikb([
          [btn("🔍 Search User (ID / @username)", { callback_data: "adm_search_user", style: "primary" })],
          [btn("👥 All Users", { callback_data: "adm_all_users|0", style: "primary" })],
          [btn("📋 Recent Users", { callback_data: "adm_recent_users", style: "primary" })],
          [btn("🔙 Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
        ]);
        await tg.safeEditMessage(chatId, msgId, "👥 <b>User Management</b>\n\nSearch or browse all users to manage balance or ban/unban:", kb);
      } else if (data.startsWith("adm_all_users|")) {
        const page = Math.max(0, parseInt(data.split("|")[1] || "0", 10));
        const limit = 10, offset = page * limit;
        const [totalCnt, { results }] = await Promise.all([
          db.countUsers(),
          db.d1.prepare("SELECT uid, name, username, balance, extra FROM users ORDER BY joined DESC LIMIT ? OFFSET ?").bind(limit, offset).all(),
        ]);
        const rows = (results || []).map((r) => {
          const ex = JSON.parse(r.extra || "{}");
          return [btn(`${ex.banned ? "🚫" : "👤"} ${r.name || r.uid} (${r.uid}) • ৳${Number(r.balance || 0).toFixed(1)}`, { callback_data: `adm_view_user|${r.uid}` })];
        });
        const nav = [];
        if (page > 0) nav.push(btn("⬅️ Prev", { callback_data: `adm_all_users|${page - 1}`, style: "primary" }));
        if (offset + limit < totalCnt) nav.push(btn("➡️ Next", { callback_data: `adm_all_users|${page + 1}`, style: "primary" }));
        if (nav.length) rows.push(nav);
        rows.push([btn("🔙 Back", { callback_data: "adm_menu_users", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, `👥 <b>All Users (${totalCnt})</b> — Page ${page + 1}`, ikb(rows));
      } else if (data === "adm_recent_users") {
        const { results } = await db.d1.prepare("SELECT uid, name, username, balance, extra FROM users ORDER BY last_seen DESC LIMIT 10").all();
        const rows = (results || []).map((r) => {
          const ex = JSON.parse(r.extra || "{}");
          return [btn(`${ex.banned ? "🚫" : "👤"} ${r.name || r.uid} (৳${Number(r.balance || 0).toFixed(1)})`, { callback_data: `adm_view_user|${r.uid}` })];
        });
        rows.push([btn("🔙 Back", { callback_data: "adm_menu_users", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, "📋 <b>Recent Users (Top 10)</b>", ikb(rows));
      } else if (data.startsWith("adm_view_user|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (!tu) { await tg.safeEditMessage(chatId, msgId, "❌ User not found.", adminPanelKb(uid, env, walletConfig)); return new Response("OK"); }
        const stTxt = tu.banned ? "🚫 <b>BANNED</b>" : "🟢 <b>Active</b>";
        const customInfo = (tu.custom_global_rate != null || (tu.custom_rates && Object.keys(tu.custom_rates).length))
          ? `\n🎁 <b>VIP Rates:</b> ${tu.custom_global_rate != null ? `Global ৳${Number(tu.custom_global_rate).toFixed(2)} ` : ""}${Object.entries(tu.custom_rates || {}).map(([k, v]) => `${k}: ৳${Number(v).toFixed(2)}`).join(", ")}`
          : "";
        const msgTxt = `<blockquote>👤 <b>User Management</b>\n\n🆔 <b>ID:</b> <code>${tu.uid}</code>\n📛 <b>Name:</b> ${escapeHtml(tu.name)}\n🔗 <b>Username:</b> ${tu.username ? "@" + escapeHtml(tu.username) : "N/A"}\n💰 <b>Balance:</b> <b>৳${Number(tu.balance || 0).toFixed(2)} BDT</b>\n📌 <b>Status:</b> ${stTxt}${customInfo}</blockquote>`;
        const kb = ikb([
          [btn("➕ Add Balance", { callback_data: `adm_user_bal|add|${tu.uid}`, style: "success" })],
          [btn("➖ Deduct Balance", { callback_data: `adm_user_bal|sub|${tu.uid}`, style: "primary" })],
          [btn("🎁 Set Custom Reward (VIP)", { callback_data: `adm_user_reward|${tu.uid}`, style: "primary" })],
          [btn("🔄 Reset Balance to ৳0", { callback_data: `adm_user_zero_confirm|${tu.uid}`, style: "danger" })],
          [btn(tu.banned ? "✅ Unban User" : "🚫 Ban User", { callback_data: `adm_user_ban_confirm|${tu.uid}`, style: tu.banned ? "success" : "danger" })],
          [btn("🔙 Back", { callback_data: "adm_menu_users", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
        ]);
        await tg.safeEditMessage(chatId, msgId, msgTxt, kb);
      } else if (data === "adm_reward_menu") {
        const kb = ikb([
          [btn("🌐 All Users Service Rates", { callback_data: "adm_rate_settings", style: "success" })],
          [btn("👤 Specific User Reward (Search)", { callback_data: "adm_search_user", style: "primary" })],
          [btn("🔙 Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
        ]);
        await tg.safeEditMessage(chatId, msgId, "🎁 <b>Reward Management</b>\n\nSet global service rewards for all users, or search a specific user to give VIP custom rates:", kb);
      } else if (data.startsWith("adm_user_reward|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (!tu) return new Response("OK");
        const rows = Object.keys(platforms).map((svc) => {
          const cur = tu.custom_rates?.[svc] ?? tu.custom_global_rate;
          const tag = tu.custom_rates?.[svc] != null ? `VIP: ৳${Number(tu.custom_rates[svc]).toFixed(2)}` : `Default: ৳${Number(walletConfig.service_rates?.[svc]?.global ?? 0.5).toFixed(2)}`;
          return [btn(`${svc} (${tag})`, { callback_data: `adm_u_rate_svc|${tUid}|${svc}` })];
        });
        rows.push([btn(`🌍 All Services Override (${tu.custom_global_rate != null ? "৳" + Number(tu.custom_global_rate).toFixed(2) : "Not Set"})`, { callback_data: `adm_u_rate_global|${tUid}`, style: "success" })]);
        rows.push([btn("🔄 Reset User to Default Rates", { callback_data: `adm_u_rate_reset|${tUid}`, style: "danger" })]);
        rows.push([btn("🔙 Back", { callback_data: `adm_view_user|${tUid}`, icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, `🎁 <b>Custom Rewards for <code>${tUid}</code> (${escapeHtml(tu.name)})</b>\n\nSelect a service to set a custom BDT rate for this user:`, ikb(rows));
      } else if (data.startsWith("adm_u_rate_svc|")) {
        const [, tUid, svc] = data.split("|"), u = await db.getUser(uid);
        if (u) { u.pending_action = { action: "adm_u_rate_svc", target_uid: tUid, service: svc }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `🎁 Enter custom <b>${escapeHtml(svc)}</b> reward rate (in BDT) for user <code>${tUid}</code> (or /cancel):`);
      } else if (data.startsWith("adm_u_rate_global|")) {
        const tUid = data.split("|")[1], u = await db.getUser(uid);
        if (u) { u.pending_action = { action: "adm_u_rate_global", target_uid: tUid }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `🌍 Enter custom global reward rate (in BDT) for ALL services for user <code>${tUid}</code> (or /cancel):`);
      } else if (data.startsWith("adm_u_rate_reset|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (tu) { delete tu.custom_rates; delete tu.custom_global_rate; await db.saveUser(tUid, tu); }
        await tg.safeEditMessage(chatId, msgId, `✅ Reset custom rewards for <code>${tUid}</code> to default global rates.`, ikb([[btn("👤 View User", { callback_data: `adm_view_user|${tUid}` })]]));
      } else if (data.startsWith("adm_user_bal|")) {
        const [, mode, tUid] = data.split("|"), u = await db.getUser(uid);
        if (u) { u.pending_action = { action: "adm_user_bal", mode, target_uid: tUid }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `💰 Enter BDT amount to ${mode === "add" ? "<b>ADD</b> to" : "<b>DEDUCT</b> from"} user <code>${tUid}</code> (or /cancel):`);
      } else if (data.startsWith("adm_user_zero_confirm|")) {
        const tUid = data.split("|")[1];
        const kb = ikb([
          [btn("✅ Yes, Set Balance to ৳0", { callback_data: `adm_user_zero|${tUid}`, style: "danger" })],
          [btn("🔙 Cancel", { callback_data: `adm_view_user|${tUid}`, style: "primary" })],
        ]);
        await tg.safeEditMessage(chatId, msgId, `⚠️ Reset balance of user <code>${tUid}</code> to <b>৳0.00 BDT</b>?`, kb);
      } else if (data.startsWith("adm_user_zero|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (tu) { tu.balance = 0; await db.saveUser(tUid, tu); }
        await tg.safeEditMessage(chatId, msgId, `✅ Balance of <code>${tUid}</code> reset to <b>৳0.00 BDT</b>.`, ikb([[btn("👤 View User", { callback_data: `adm_view_user|${tUid}` })]]));
      } else if (data.startsWith("adm_user_ban_confirm|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (!tu) return new Response("OK");
        const actLabel = tu.banned ? "Unban" : "Ban";
        const kb = ikb([
          [btn(`✅ Yes, ${actLabel} User`, { callback_data: `adm_user_ban_toggle|${tUid}`, style: tu.banned ? "success" : "danger" })],
          [btn("🔙 Cancel", { callback_data: `adm_view_user|${tUid}`, style: "primary" })],
        ]);
        await tg.safeEditMessage(chatId, msgId, `⚠️ <b>Confirm ${actLabel}</b>\n\nAre you sure you want to <b>${actLabel.toLowerCase()}</b> user <code>${tUid}</code> (${escapeHtml(tu.name)})?`, kb);
      } else if (data.startsWith("adm_user_ban_toggle|")) {
        const tUid = data.split("|")[1], tu = await db.getUser(tUid);
        if (tu) {
          tu.banned = !tu.banned;
          await db.saveUser(tUid, tu);
          await tg.safeEditMessage(chatId, msgId, `${tu.banned ? "🚫 Banned" : "✅ Unbanned"} user <code>${tUid}</code>.`, ikb([[btn("👤 View User", { callback_data: `adm_view_user|${tUid}` })]]));
        }
      } else if (data === "adm_menu_numbers") await tg.safeEditMessage(chatId, msgId, "📱 <b>Numbers Management</b>", ikb([[btn("Add Numbers", { callback_data: "adm_add", style: "success" }), btn("Remove Numbers", { callback_data: "adm_remove", style: "danger" })], [btn("🌍 Manage Countries", { callback_data: "adm_countries_menu" }), btn("Clear All Numbers", { callback_data: "adm_allremove", style: "danger" })], [btn("Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_countries_menu") {
        const saved = walletConfig.custom_countries || [];
        const rows = saved.map((c) => {
          const lbl = c.name && /[^\x00-\x7F]/.test(c.name) ? c.name : getCountryButtonLabel(c.code);
          return [btn(`❌ ${lbl} (+${c.code})`, { callback_data: `adm_del_country|${c.code}`, style: "danger" })];
        });
        rows.push([btn("➕ Add Country", { callback_data: "adm_add_country", style: "success" })]);
        rows.push([btn("Back", { callback_data: "adm_menu_numbers", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        const txt = saved.length ? `🌍 <b>Saved Countries (${saved.length})</b>\nSelect to remove or add a new country:` : "🌍 <b>Saved Countries</b>\n<i>No custom countries saved yet. Add one below!</i>";
        await tg.safeEditMessage(chatId, msgId, txt, ikb(rows));
      } else if (data === "adm_add_country") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_add_country" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🌍 Send country code (and optional name):\n\n• <code>880</code> (auto-names from map)\n• <code>880 | 🇧🇩 Bangladesh</code>\n\nSend /cancel to abort.");
      } else if (data.startsWith("adm_del_country|")) {
        const code = data.split("|")[1];
        walletConfig.custom_countries = (walletConfig.custom_countries || []).filter((c) => String(c.code) !== String(code));
        await db.saveWalletConfig(walletConfig);
        await tg.safeEditMessage(chatId, msgId, `✅ Removed country <code>+${escapeHtml(code)}</code>.`, adminPanelKb(uid, env, walletConfig));
      }
      else if (data === "adm_menu_stats") await tg.safeEditMessage(chatId, msgId, "📊 <b>Traffic & Stats</b>", ikb([[btn("📊 Stats", { callback_data: "adm_stats" }), btn("🔍 Search User", { callback_data: "adm_search_user" })], [btn("🏆 Leaderboard Settings", { callback_data: "adm_lb_settings_menu", style: "primary" })], [btn("🔙 Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_lb_settings_menu") {
        const lb = await db.getLeaderboard(), st = lb.settings || {};
        const enabled = st.enabled !== false, isWeekly = (st.cycle_type || "weekly") === "weekly";
        const rTxt = st.reward_text || DEFAULT_LEADERBOARD.settings.reward_text;
        const kb = ikb([
          [btn(enabled ? "🟢 Leaderboard: ON" : "🔴 Leaderboard: OFF", { callback_data: "adm_lb_toggle", style: enabled ? "success" : "danger" })],
          [btn(`📅 Cycle: ${isWeekly ? "Weekly (Sat–Fri)" : "Daily (24h)"}`, { callback_data: "adm_lb_cycle_toggle", style: "primary" })],
          [btn("🎁 Set Leaderboard Reward", { callback_data: "adm_lb_set_reward", style: "success" })],
          [btn("🔙 Back", { callback_data: "adm_menu_stats", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
        ]);
        await tg.safeEditMessage(chatId, msgId, `🏆 <b>Leaderboard Settings</b>\n\n• <b>Status:</b> ${enabled ? "🟢 ON" : "🔴 OFF"}\n• <b>Cycle:</b> ${isWeekly ? "Weekly (Resets every Saturday)" : "Daily (24h)"}\n• <b>Top Winners:</b> ${st.top_winners_count || 5}\n\n<b>🎁 Current Reward Display:</b>\n<code>${escapeHtml(rTxt)}</code>`, kb);
      } else if (data === "adm_lb_set_reward") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_lb_set_reward" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🎁 Write the <b>Leaderboard Reward</b> text/amounts to show users at the top of Leaderboard (e.g. <code>🥇 #1: ৳500\n🥈 #2: ৳300</code>):\nSend /cancel to abort.");
      } else if (data === "adm_lb_toggle") {
        const lb = await db.getLeaderboard(); lb.settings.enabled = lb.settings.enabled === false; await db.saveLeaderboard(lb);
        await tg.safeEditMessage(chatId, msgId, `✅ Leaderboard is now <b>${lb.settings.enabled ? "ON" : "OFF"}</b>.`, ikb([[btn("🏆 Back to Settings", { callback_data: "adm_lb_settings_menu" })]]));
      } else if (data === "adm_lb_cycle_toggle") {
        const lb = await db.getLeaderboard();
        const wasWeekly = (lb.settings.cycle_type || "weekly") === "weekly";
        lb.settings.cycle_type = wasWeekly ? "daily" : "weekly";
        lb.settings.cycle_hours = wasWeekly ? 24 : 168;
        await db.saveLeaderboard(lb);
        await tg.safeEditMessage(chatId, msgId, `✅ Leaderboard cycle switched to <b>${wasWeekly ? "Daily (24h)" : "Weekly (7 Days)"}</b>.`, ikb([[btn("🏆 Back to Settings", { callback_data: "adm_lb_settings_menu" })]]));
      }
      else if (data === "adm_menu_wallet") await tg.safeEditMessage(chatId, msgId, "💰 <b>Wallet & Withdraw</b>", ikb([[btn("Withdraw Requests", { callback_data: "adm_withdraw_requests" }), btn("Rate Settings", { callback_data: "adm_rate_settings" })], [btn("Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_menu_broadcast") await tg.safeEditMessage(chatId, msgId, "📢 <b>Broadcast & Required Channels</b>", ikb([[btn("Broadcast Message", { callback_data: "adm_broadcast", style: "success" }), btn("Required Channels", { callback_data: "adm_channels_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.channel_settings })], [btn("Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_channels_menu") {
        const chs = walletConfig.required_channels || [];
        const rows = chs.map((c, idx) => { const e = parseChannelEntry(c); return [btn(`❌ Remove: ${e.id}`, { callback_data: `adm_del_ch|${idx}`, style: "danger" })]; });
        rows.push([btn("➕ Add Channel / Group", { callback_data: "adm_add_channel", style: "success" })]);
        if (chs.length) rows.push([btn("🗑️ Clear All (Disable Force Join)", { callback_data: "adm_clear_channels", style: "danger" })]);
        rows.push([btn("Back", { callback_data: "adm_menu_broadcast", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        const listTxt = chs.length ? chs.map((c, i) => `${i + 1}. <code>${escapeHtml(parseChannelEntry(c).id)}</code>`).join("\n") : "<i>No required channels (Force Join disabled)</i>";
        await tg.safeEditMessage(chatId, msgId, `🔒 <b>Required Channels (Force Join)</b>\n\n${listTxt}`, ikb(rows));
      } else if (data === "adm_add_channel") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_add_channel" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "📢 Send the Channel/Group username or link:\n\n• Public: <code>@ROXYSMSNEWS</code> or <code>https://t.me/ROXYSMSNEWS</code>\n• Private Group/Channel: <code>-1001234567890 | https://t.me/+InviteLink</code>\n\n<i>(Note: Bot must be Admin in that channel/group!)</i>\nSend /cancel to abort.");
      } else if (data.startsWith("adm_del_ch|")) {
        const idx = parseInt(data.split("|")[1], 10);
        if (Array.isArray(walletConfig.required_channels) && idx >= 0 && idx < walletConfig.required_channels.length) {
          walletConfig.required_channels.splice(idx, 1);
          walletConfig.channels_updated_at = nowTs();
          await db.saveWalletConfig(walletConfig);
        }
        await tg.safeEditMessage(chatId, msgId, "✅ Channel removed.", adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_clear_channels") {
        walletConfig.required_channels = [];
        walletConfig.channels_updated_at = nowTs();
        await db.saveWalletConfig(walletConfig);
        await tg.safeEditMessage(chatId, msgId, "✅ All required channels cleared (Force Join disabled).", adminPanelKb(uid, env, walletConfig));
      }
      else if (data === "adm_menu_otp") await tg.safeEditMessage(chatId, msgId, "📥 <b>OTP System & Inbox</b>", ikb([[btn("➕ Add API", { callback_data: "adm_otp_api_add", style: "success" }), btn("🔄 Poll Now", { callback_data: "adm_otp_api_poll" })], [btn("👥 OTP Group Settings", { callback_data: "adm_otp_group_menu", icon_custom_emoji_id: CUSTOM_EMOJIS.otp_group })], [btn("Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]]));
      else if (data === "adm_otp_group_menu") {
        const curUrl = walletConfig?.channel_logs?.otp_group?.channel_url || "https://t.me/+Nlyujg2sScVhMzc1";
        const curSrc = walletConfig.otp_source_chat_id || env.OTP_SOURCE_CHAT_ID || "-1003888145264";
        const kb = ikb([
          [btn("🔗 Set OTP Group Link", { callback_data: "adm_set_otp_group_url", style: "success" })],
          [btn("🆔 Set OTP Source Chat ID", { callback_data: "adm_set_otp_source_id" })],
          [btn("Back", { callback_data: "adm_menu_otp", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
        ]);
        await tg.safeEditMessage(chatId, msgId, `👥 <b>OTP Group Settings</b>\n\n🔗 <b>OTP Group Link:</b> <code>${escapeHtml(curUrl)}</code>\n🆔 <b>OTP Source Chat ID:</b> <code>${escapeHtml(curSrc)}</code>`, kb);
      } else if (data === "adm_set_otp_group_url") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_set_otp_group_url" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🔗 Send the new <b>OTP Group Invite Link</b> (e.g. <code>https://t.me/+...</code> or <code>https://t.me/groupname</code>):\nSend /cancel to abort.");
      } else if (data === "adm_set_otp_source_id") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_set_otp_source_id" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🆔 Send the <b>OTP Source Group/Channel Chat ID</b> (e.g. <code>-1003888145264</code>):\nSend /cancel to abort.");
      }
      else if (data === "adm_menu_system") await tg.safeEditMessage(chatId, msgId, "⚙️ <b>System & Security</b>\n\nExport or import full bot data (Users, Balances, Wallets, Settings, Withdrawals & OTP History):", ikb([
        [btn("📦 Export Full Backup (.json)", { callback_data: "adm_backup_export", style: "primary" })],
        [btn("📥 Import Backup (.json)", { callback_data: "adm_backup_import", style: "success" })],
        [btn("🗑️ Cleanup Now", { callback_data: "adm_cleanup_now", style: "danger" })],
        [btn("🔙 Back", { callback_data: "adm_panel", icon_custom_emoji_id: CUSTOM_EMOJIS.back })],
      ]));
      else if (data === "adm_add") {
        const rows = Object.keys(platforms).map((p) => [btn(p, { callback_data: `adm_add_svc|${p}` })]);
        rows.push([btn("Back", { callback_data: "adm_menu_numbers", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, "➕ <b>Select Service:</b>", ikb(rows));
      } else if (data.startsWith("adm_add_svc|")) {
        const svc = data.split("|")[1], provs = await db.getProviders();
        const rows = provs.map((p) => [btn(p, { callback_data: `adm_add_prov|${svc}|${p}` })]);
        rows.push([btn("Default (No Provider)", { callback_data: `adm_add_prov|${svc}|` })]);
        await tg.safeEditMessage(chatId, msgId, `📦 <b>Select Provider for ${escapeHtml(svc)}:</b>`, ikb(rows));
      } else if (data.startsWith("adm_add_prov|")) {
        const [, svc, prov] = data.split("|");
        const saved = walletConfig.custom_countries || [];
        const popular = ["880", "91", "92", "977", "1", "44", "62", "84", "7", "234", "254", "60", "63", "66", "90", "55"];
        const merged = [];
        const seen = new Set();
        for (const c of saved) { if (!seen.has(String(c.code))) { seen.add(String(c.code)); merged.push({ code: String(c.code), label: c.name && /[^\x00-\x7F]/.test(c.name) ? c.name : getCountryButtonLabel(c.code) }); } }
        for (const code of popular) { if (!seen.has(code)) { seen.add(code); merged.push({ code, label: getCountryButtonLabel(code) }); } }
        const rows = [[btn("🤖 Auto-Detect from Numbers", { callback_data: `adm_add_cty|${svc}|${prov || ""}|AUTO`, style: "primary" })]];
        for (let i = 0; i < merged.length; i += 2) {
          rows.push(merged.slice(i, i + 2).map((c) => btn(`${c.label} (+${c.code})`, { callback_data: `adm_add_cty|${svc}|${prov || ""}|${c.code}` })));
        }
        rows.push([btn("✏️ Type Country Code", { callback_data: `adm_add_cty_type|${svc}|${prov || ""}`, style: "success" })]);
        rows.push([btn("Back", { callback_data: `adm_add_svc|${svc}`, icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, `🌍 <b>Select Country for ${escapeHtml(svc)}</b>${prov ? ` (${escapeHtml(prov)})` : ""}:`, ikb(rows));
      } else if (data.startsWith("adm_add_cty_type|")) {
        const [, svc, prov] = data.split("|"), u = await db.getUser(uid);
        if (u) { u.pending_action = { action: "adm_add_cty_type", service: svc, provider: prov || "" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `✏️ Type country code (e.g. <code>880</code> or <code>880 | Bangladesh</code>) for <b>${escapeHtml(svc)}</b>:\nSend /cancel to abort.`);
      } else if (data.startsWith("adm_add_cty|")) {
        const [, svc, prov, ccode] = data.split("|"), u = await db.getUser(uid);
        if (u) { u.pending_action = { action: "add_numbers_upload", service: svc, provider: prov || "", country: ccode || "AUTO" }; await db.saveUser(uid, u); }
        const cLabel = ccode && ccode !== "AUTO" ? `${getCountryDisplayName(ccode)} (+${ccode})` : "Auto-Detect";
        await tg.sendMessage(chatId, `📤 Upload <b>.xlsx / .csv / .txt</b> or paste numbers for <b>${escapeHtml(svc)}</b> [${escapeHtml(cLabel)}]:\nSend /cancel to abort.`);
      } else if (data === "adm_remove") {
        const sum = await db.getAllNumbersSummary();
        const rows = Object.keys(sum).map((s) => [btn(s, { callback_data: `adm_rem_svc|${s}` })]);
        rows.push([btn("Back", { callback_data: "adm_menu_numbers", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, "🗑️ <b>Select Service:</b>", ikb(rows));
      } else if (data.startsWith("adm_rem_svc|")) {
        const svc = data.split("|")[1], cmap = await db.getCountryCounts(svc);
        const rows = Object.entries(cmap).map(([c, cnt]) => [btn(`${getCountryButtonLabel(c)} (${cnt})`, { callback_data: `adm_rem_cty|${svc}|${c}`, style: "danger" })]);
        rows.push([btn("Back", { callback_data: "adm_remove", icon_custom_emoji_id: CUSTOM_EMOJIS.back })]);
        await tg.safeEditMessage(chatId, msgId, `🗑️ <b>Remove Country (${escapeHtml(svc)}):</b>`, ikb(rows));
      } else if (data.startsWith("adm_rem_cty|")) {
        const [, svc, c] = data.split("|"), rem = await db.removeNumbersByCountry(svc, c);
        await tg.safeEditMessage(chatId, msgId, `✅ Removed <b>${rem}</b> numbers.`, adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_allremove") {
        for (const s of Object.keys(platforms)) await db.removeNumbersByService(s);
        await tg.safeEditMessage(chatId, msgId, "✅ All numbers cleared.", adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_stats") {
        const [totU, sum, evs] = await Promise.all([db.countUsers(), db.getAllNumbersSummary(), db.getOtpEventsSince(nowTs() - 86400, 5000)]);
        let totN = 0; for (const cm of Object.values(sum)) for (const c of Object.values(cm)) totN += c;
        await tg.safeEditMessage(chatId, msgId, `<blockquote>📊 <b>Stats</b>\n👥 Users: ${totU}\n📱 Numbers: ${totN}\n🔐 OTPs (24h): ${evs.length}</blockquote>`, adminPanelKb(uid, env, walletConfig));
      } else if (data === "adm_withdraw_requests") {
        const list = await db.getWithdrawals("pending_manual", null, 10);
        if (!list.length) await tg.sendMessage(chatId, "✅ No pending withdrawals.");
        for (const w of list) await tg.sendMessage(chatId, `💳 <code>${w.id}</code>\n👤 <code>${w.user_id}</code>\n🏦 ${escapeHtml(w.method)}: <code>${escapeHtml(w.account)}</code>\n💰 <b>৳${Number(w.amount).toFixed(2)}</b>`, { reply_markup: ikb([[btn("✅ Approve", { callback_data: `wd_approve|${w.id}`, style: "success" }), btn("❌ Reject", { callback_data: `wd_reject|${w.id}`, style: "danger" })]]) });
      } else if (data.startsWith("wd_approve|")) {
        const w = await db.updateWithdrawal(data.split("|")[1], { status: "completed" });
        if (w) { await tg.sendMessage(w.user_id, `✅ Withdrawal <code>${w.id}</code> (৳${Number(w.amount).toFixed(2)}) approved!`).catch(() => {}); await tg.safeEditMessage(chatId, msgId, `✅ Approved <code>${w.id}</code>`); }
      } else if (data.startsWith("wd_reject|")) {
        const w = await db.getWithdrawal(data.split("|")[1]);
        if (w && w.status === "pending_manual") {
          await db.updateWithdrawal(w.id, { status: "rejected" });
          const u = await db.getUser(w.user_id); if (u) { u.balance = Number(((u.balance || 0) + Number(w.amount)).toFixed(2)); await db.saveUser(w.user_id, u); }
          await tg.sendMessage(w.user_id, `❌ Withdrawal <code>${w.id}</code> rejected & refunded.`).catch(() => {});
          await tg.safeEditMessage(chatId, msgId, `❌ Rejected <code>${w.id}</code>`);
        }
      } else if (data === "adm_rate_settings") {
        const rows = Object.keys(platforms).map((s) => [btn(`${s} (৳${walletConfig.service_rates?.[s]?.global ?? 0.5})`, { callback_data: `adm_rate_svc|${s}` })]);
        await tg.safeEditMessage(chatId, msgId, "💵 <b>Select Service:</b>", ikb(rows));
      } else if (data.startsWith("adm_rate_svc|")) {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_set_rate", service: data.split("|")[1] }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, `💵 Enter new BDT rate for <b>${escapeHtml(data.split("|")[1])}</b>:`);
      } else if (data === "adm_broadcast") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_broadcast" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "📢 Send message to broadcast to all users (or /cancel):");
      } else if (data === "adm_search_user") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_search_user" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "🔍 Enter User ID or @username:");
      } else if (data === "adm_otp_api_add") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_otp_api_add" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "📥 Send: <code>Name | URL | Token</code>");
      } else if (data === "adm_otp_api_poll") {
        const cnt = await pollOtpInboxApis(db, tg, walletConfig, platforms, true);
        await tg.sendMessage(chatId, `🔄 Polled APIs. Delivered: <b>${cnt}</b>`);
      } else if (data === "adm_backup_export") {
        const [allUsers, wdRes, otpRes, providers, leaderboard] = await Promise.all([
          db.getAllUsers(),
          db.d1.prepare("SELECT * FROM withdrawals").all(),
          db.d1.prepare("SELECT ts, country, service, user_id, inbox, number, code, sms, digits, lang, duplicate FROM otp_events ORDER BY id DESC LIMIT 10000").all(),
          db.getProviders(),
          db.getLeaderboard(),
        ]);
        const payload = {
          exported_at: nowTs(),
          version: 2,
          users: allUsers,
          withdrawals: wdRes?.results || [],
          otp_events: otpRes?.results || [],
          wallet_config: walletConfig,
          platforms,
          providers,
          leaderboard,
        };
        const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
        await tg.sendDocument(chatId, bytes, `bot_full_backup_${nowTs()}.json`, `📦 <b>Full D1 Backup</b>\n👥 Users: ${Object.keys(allUsers).length}\n💳 Withdrawals: ${(wdRes?.results || []).length}\n📩 OTP Events: ${(otpRes?.results || []).length}`);
      } else if (data === "adm_backup_import") {
        const u = await db.getUser(uid); if (u) { u.pending_action = { action: "adm_backup_import" }; await db.saveUser(uid, u); }
        await tg.sendMessage(chatId, "📥 <b>Import Backup</b>\n\nUpload your previously exported <code>.json</code> backup file to restore all users, balances, wallets, settings, and history.\n\nSend /cancel to abort.");
      } else if (data === "adm_cleanup_now") {
        await Promise.all([db.cleanupExpiredSold(), db.cleanupSeenApiMsgs()]);
        await tg.safeEditMessage(chatId, msgId, "✅ Expired sold numbers & API cache cleaned (OTP history preserved).", adminPanelKb(uid, env, walletConfig));
      }
    }
    return new Response("OK");
  }

  const msg = update.message || update.channel_post;
  if (!msg) return new Response("OK");
  const sourceChatId = String(walletConfig.otp_source_chat_id || env.OTP_SOURCE_CHAT_ID || "-1003888145264");
  if (String(msg.chat?.id) === sourceChatId) {
    const txt = msg.text || msg.caption || "";
    const cands = extractNumberCandidates(txt), code = extractOtpCode(txt, cands), sms = extractSmsBody(txt);
    const m = /\b(WHATSAPP|TELEGRAM|GOOGLE|FACEBOOK|TIKTOK|INSTAGRAM|IMO)\b/i.exec(txt);
    const svc = m ? normalizeServiceName(m[1]) : "Unknown";
    for (const num of cands) if (await deliverVerifiedOtp(db, tg, walletConfig, platforms, num, svc, code || "N/A", sms)) break;
    return new Response("OK");
  }

  if (msg.chat?.type !== "private") {
    if (msg.text?.startsWith("/id")) await tg.sendMessage(msg.chat.id, `🆔 Chat: <code>${msg.chat.id}</code>`);
    return new Response("OK");
  }

  const uid = String(msg.from.id), chatId = msg.chat.id, text = (msg.text || "").trim(), adminId = String(env.ADMIN_ID || "5806585314");

  // Commands
  if (text.startsWith("/")) {
    const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();
    if (cmd === "/start") {
      const arg = text.split(/\s+/)[1] || "";
      if (!(await ensureMembership(uid, chatId, null, db, tg, env, walletConfig))) return new Response("OK");
      let u = await db.getUser(uid);
      const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || msg.from.username || "User";
      if (!u) {
        u = { uid, name, username: msg.from.username || "", joined: nowTs(), last_seen: nowTs(), balance: 0, referred_by: null, referral_count: 0, referral_earnings: 0, referred_users: [], service: "Facebook", country: "", pending_action: null, wallets: {}, otps: {}, auto_withdraw_history: {} };
        if (arg.startsWith("ref_")) {
          const rId = arg.slice(4); const rU = await db.getUser(rId);
          if (rU && rId !== uid) { u.referred_by = rId; rU.referral_count = (rU.referral_count || 0) + 1; await db.saveUser(rId, rU); }
        }
        await db.saveUser(uid, u);
      } else {
        u.last_seen = nowTs(); u.name = name;
        const p = db.saveUser(uid, u);
        if (ctx?.waitUntil) ctx.waitUntil(p); else await p;
      }
      if (arg.startsWith("d_")) {
        const p = arg.slice(2), idx = p.indexOf("_");
        if (idx > 0) { await deliverNumbersToUser(db, tg, chatId, null, uid, normalizeServiceName(p.slice(0, idx)), p.slice(idx + 1), walletConfig, platforms, ctx); return new Response("OK"); }
      }
      await tg.sendMessage(chatId, `${tgEmoji("4918354603281482671", "👋")}ʜᴇʟʟᴏ &amp; ᴡᴇʟᴄᴏᴍᴇ <b>${escapeHtml(name)}</b>${tgEmoji("6192529992501437323", "💌")}\n${tgEmoji("6190485871536384315", "📞")}ɢᴇᴛ ꜰʀᴇᴇ ᴠɪʀᴛᴜᴀʟ ɴᴜᴍʙᴇʀꜱ\n${tgEmoji("6190482250878952084", "⚡️")}ꜰᴀꜱᴛ &amp; ꜱɪᴍᴘʟᴇ ꜱᴍꜱ ꜱᴇʀᴠɪᴄᴇ${tgEmoji("6190447113751504647", "✅")}`, { reply_markup: mainMenuKb(isAdminUser(uid, env, walletConfig)) });
      return new Response("OK");
    }
    if (cmd === "/admin" && isAdminUser(uid, env, walletConfig)) {
      await tg.sendMessage(chatId, "👑 <b>Admin Control Hub</b>", { reply_markup: adminPanelKb(uid, env, walletConfig) });
      return new Response("OK");
    }
    if (cmd === "/profile" || cmd === "/me") {
      if (!(await ensureMembership(uid, chatId, null, db, tg, env, walletConfig))) return new Response("OK");
      await tg.sendMessage(chatId, await formatProfileStatusMessage(db, uid, walletConfig, platforms), { reply_markup: profileViewKb() });
      return new Response("OK");
    }
    if ((cmd === "/testotp" || cmd === "/simotp") && isAdminUser(uid, env, walletConfig)) {
      const [, num, code, svc = "Facebook"] = text.split(/\s+/);
      const ok = num && code ? await deliverVerifiedOtp(db, tg, walletConfig, platforms, num, normalizeServiceName(svc), code, `Test OTP: ${code}`) : false;
      await tg.sendMessage(chatId, ok ? `✅ Delivered ${code} to ${num}` : "⚠️ Usage: /testotp <num> <code> [service]");
      return new Response("OK");
    }
    if (cmd === "/cancel") {
      const u = await db.getUser(uid); if (u) { u.pending_action = null; await db.saveUser(uid, u); }
      await tg.sendMessage(chatId, "❌ Cancelled.");
      return new Response("OK");
    }
  }

  // Reply-keyboard buttons
  if (text.includes("𝐆𝐞𝐭 𝐍𝐮𝐦𝐛𝐞𝐫") || text.toUpperCase().includes("GET NUMBER")) {
    if (!(await ensureMembership(uid, chatId, null, db, tg, env, walletConfig))) return new Response("OK");
    await tg.sendMessage(chatId, `<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.get_number, "📱")} Select a Service</b></blockquote>`, { reply_markup: servicesKbAvailable(await db.getAllNumbersSummary(), walletConfig, platforms) });
    return new Response("OK");
  }
  if (text.includes("𝐋𝐢𝐯𝐞 𝐓𝐫𝐚𝐟𝐟𝐢𝐜") || text.toUpperCase().includes("LIVE TRAFFIC")) {
    await tg.sendMessage(chatId, await getTrafficStats(db, walletConfig), { reply_markup: ikb([[btn("🔄 Refresh Traffic", { callback_data: "refresh_traffic" })]]) });
    return new Response("OK");
  }
  if (text.includes("𝐖𝐚𝐥𝐥𝐞𝐭") || text.toUpperCase().includes("WALLET")) {
    await tg.sendMessage(chatId, await formatWalletMessage(db, uid, walletConfig), { reply_markup: walletViewKb(walletConfig) });
    return new Response("OK");
  }
  if (text.includes("𝐋𝐞𝐚𝐝𝐞𝐫𝐛𝐨𝐚𝐫𝐝") || text.toUpperCase().includes("LEADERBOARD")) {
    const [t, pc] = await formatLeaderboardMessage(db, uid);
    await tg.sendMessage(chatId, t, { reply_markup: leaderboardViewKb(pc) });
    return new Response("OK");
  }
  if (text.toUpperCase().includes("PROFILE STATUS") || text === "/profile" || text === "/me") {
    if (!(await ensureMembership(uid, chatId, null, db, tg, env, walletConfig))) return new Response("OK");
    await tg.sendMessage(chatId, await formatProfileStatusMessage(db, uid, walletConfig, platforms), { reply_markup: profileViewKb() });
    return new Response("OK");
  }
  if (text.includes("𝐒𝐮𝐩𝐩𝐨𝐫𝐭") || text.toUpperCase().includes("SUPPORT")) {
    await tg.sendMessage(chatId, `<blockquote><b>${tgEmoji(CUSTOM_EMOJIS.support_pro, "❓")} Help & Support</b></blockquote>`, { reply_markup: ikb([[btn("💬 Live Support Chat", { callback_data: "start_live_support", style: "success" })], [btn("📢 Main Channel", { url: "https://t.me/ROXYSMSNEWS" })]]) });
    return new Response("OK");
  }
  if ((text.includes("𝐀𝐝𝐦𝐢𝐧 𝐏𝐚𝐧𝐞𝐥") || text.toUpperCase().includes("ADMIN PANEL")) && isAdminUser(uid, env, walletConfig)) {
    await tg.sendMessage(chatId, "👑 <b>Admin Control Hub</b>", { reply_markup: adminPanelKb(uid, env, walletConfig) });
    return new Response("OK");
  }

  // Admin live support reply
  if (isAdminUser(uid, env, walletConfig) && msg.reply_to_message) {
    const target = await db.getSupportMap(msg.reply_to_message.message_id);
    if (target) {
      if (msg.text) await tg.sendMessage(target, `💬 <b>Admin Reply:</b>\n\n${escapeHtml(msg.text)}`);
      else await tg.copyMessage(target, chatId, msg.message_id);
      await tg.sendMessage(chatId, `✅ Reply sent to <code>${target}</code>`);
      return new Response("OK");
    }
  }

  // Pending actions & file upload
  const u = await db.getUser(uid), pa = u?.pending_action;
  if (!pa) return new Response("OK");

  if (msg.document && pa.action === "adm_backup_import" && isAdminUser(uid, env, walletConfig)) {
    const f = await tg.getFile(msg.document.file_id);
    if (!f.ok) { await tg.sendMessage(chatId, "❌ Failed to fetch file from Telegram."); return new Response("OK"); }
    try {
      const bytes = await tg.downloadFile(f.result.file_path);
      const data = JSON.parse(new TextDecoder().decode(bytes));
      let uCount = 0, wCount = 0, oCount = 0;

      if (data.wallet_config) await db.saveWalletConfig(data.wallet_config);
      if (data.platforms) await db.savePlatforms(data.platforms);
      if (data.providers) await db.saveProviders(data.providers);
      if (data.leaderboard) await db.saveLeaderboard(data.leaderboard);

      if (data.users && typeof data.users === "object") {
        const entries = Object.entries(data.users);
        const known = new Set(["uid", "name", "username", "joined", "last_seen", "balance", "referred_by", "referral_count", "referral_earnings", "referred_users", "service", "country", "pending_action", "wallets", "otps", "auto_withdraw_history"]);
        const stmt = db.d1.prepare(`INSERT INTO users (uid, name, username, joined, last_seen, balance, referred_by, referral_count, referral_earnings, referred_users, service, country, pending_action, wallets, otps, auto_withdraw_history, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name, username=excluded.username, joined=excluded.joined, last_seen=excluded.last_seen, balance=excluded.balance, referred_by=excluded.referred_by, referral_count=excluded.referral_count, referral_earnings=excluded.referral_earnings, referred_users=excluded.referred_users, service=excluded.service, country=excluded.country, wallets=excluded.wallets, otps=excluded.otps, auto_withdraw_history=excluded.auto_withdraw_history, extra=excluded.extra`);
        for (let i = 0; i < entries.length; i += 40) {
          const batch = entries.slice(i, i + 40).map(([k, uObj]) => {
            const extra = {};
            for (const [ek, ev] of Object.entries(uObj || {})) if (!known.has(ek)) extra[ek] = ev;
            return stmt.bind(String(uObj.uid || k), uObj.name || "", uObj.username || "", uObj.joined || 0, uObj.last_seen || 0, Number(uObj.balance || 0), uObj.referred_by ? String(uObj.referred_by) : null, Number(uObj.referral_count || 0), Number(uObj.referral_earnings || 0), JSON.stringify(uObj.referred_users || []), uObj.service || "Facebook", uObj.country || "", null, JSON.stringify(uObj.wallets || {}), JSON.stringify(uObj.otps || {}), JSON.stringify(uObj.auto_withdraw_history || {}), JSON.stringify(extra));
          });
          await db.d1.batch(batch);
          uCount += batch.length;
        }
      }

      if (Array.isArray(data.withdrawals) && data.withdrawals.length) {
        const wStmt = db.d1.prepare("INSERT OR IGNORE INTO withdrawals (id, user_id, method, amount, account, status, ts, type, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        for (let i = 0; i < data.withdrawals.length; i += 50) {
          const batch = data.withdrawals.slice(i, i + 50).map((w) => wStmt.bind(String(w.id), String(w.user_id), w.method || "", Number(w.amount || 0), w.account || "", w.status || "completed", w.ts || 0, w.type || "manual", w.extra || "{}"));
          await db.d1.batch(batch);
          wCount += batch.length;
        }
      }

      if (Array.isArray(data.otp_events) && data.otp_events.length) {
        const existingOtp = await db.d1.prepare("SELECT COUNT(*) as cnt FROM otp_events").first();
        if (!existingOtp || Number(existingOtp.cnt) === 0) {
          const oStmt = db.d1.prepare("INSERT INTO otp_events (ts, country, service, user_id, inbox, number, code, sms, digits, lang, duplicate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          for (let i = 0; i < data.otp_events.length; i += 50) {
            const batch = data.otp_events.slice(i, i + 50).map((ev) => oStmt.bind(ev.ts || 0, ev.country || "", ev.service || "", ev.user_id ? String(ev.user_id) : null, ev.inbox ? 1 : 0, ev.number || "", ev.code || "", ev.sms || "", ev.digits || 0, ev.lang || "", ev.duplicate ? 1 : 0));
            await db.d1.batch(batch);
            oCount += batch.length;
          }
        }
      }

      u.pending_action = null; await db.saveUser(uid, u);
      await tg.sendMessage(chatId, `✅ <b>Backup Restored Successfully!</b>\n\n👥 <b>Users Restored:</b> ${uCount}\n💳 <b>Withdrawals Restored:</b> ${wCount}\n📩 <b>OTP Events Restored:</b> ${oCount}\n⚙️ <b>Settings, Services &amp; Leaderboard Restored!</b>`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
    } catch (err) {
      await tg.sendMessage(chatId, `❌ <b>Import Failed:</b> ${escapeHtml(err.message)}`);
    }
    return new Response("OK");
  }

  if (msg.document && pa.action === "add_numbers_upload" && isAdminUser(uid, env, walletConfig)) {
    const f = await tg.getFile(msg.document.file_id);
    if (f.ok) {
      const bytes = await tg.downloadFile(f.result.file_path), fname = (msg.document.file_name || "").toLowerCase();
      const parsed = fname.endsWith(".xlsx") ? await extractNumbersFromXlsx(bytes) : extractNumbersFromText(new TextDecoder().decode(bytes));
      const grouped = {}; let added = 0;
      for (const n of parsed) {
        const cl = n.replace(/[^\d]/g, "");
        if (walletConfig.number_filter?.enabled && (await db.isFilteredNumber(cl))) continue;
        const cc = pa.country && pa.country !== "AUTO" ? pa.country : extractCountryCode(n)[0];
        const ck = makeCountryProviderKey(cc, pa.provider || "");
        if (!grouped[ck]) grouped[ck] = []; grouped[ck].push(n);
      }
      for (const [ck, list] of Object.entries(grouped)) added += await db.addNumbers(pa.service, ck, list);
      u.pending_action = null; await db.saveUser(uid, u);
      await tg.sendMessage(chatId, `✅ Added <b>${added}</b> numbers to <b>${escapeHtml(pa.service)}</b>!`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
    }
    return new Response("OK");
  }

  if (pa.action === "add_numbers_upload" && text && isAdminUser(uid, env, walletConfig)) {
    const parsed = extractNumbersFromText(text), grouped = {}; let added = 0;
    for (const n of parsed) {
      const cc = pa.country && pa.country !== "AUTO" ? pa.country : extractCountryCode(n)[0];
      const ck = makeCountryProviderKey(cc, pa.provider || "");
      if (!grouped[ck]) grouped[ck] = []; grouped[ck].push(n);
    }
    for (const [ck, list] of Object.entries(grouped)) added += await db.addNumbers(pa.service, ck, list);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Added <b>${added}</b> numbers to <b>${escapeHtml(pa.service)}</b>!`);
  } else if (pa.action === "adm_add_country" && isAdminUser(uid, env, walletConfig)) {
    const [rawCode, rawName] = text.split("|").map((s) => s.trim());
    const code = rawCode.replace(/[^\d]/g, "");
    if (!code) { await tg.sendMessage(chatId, "❌ Invalid country code."); return new Response("OK"); }
    const name = rawName || getCountryDisplayName(code);
    if (!Array.isArray(walletConfig.custom_countries)) walletConfig.custom_countries = [];
    if (!walletConfig.custom_countries.some((c) => String(c.code) === code)) {
      walletConfig.custom_countries.push({ code, name });
    }
    await db.saveWalletConfig(walletConfig);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Saved country: <b>${escapeHtml(name)}</b> (<code>+${code}</code>)`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_add_cty_type" && isAdminUser(uid, env, walletConfig)) {
    const [rawCode, rawName] = text.split("|").map((s) => s.trim());
    const code = rawCode.replace(/[^\d]/g, "");
    if (!code) { await tg.sendMessage(chatId, "❌ Invalid country code. Try again or /cancel."); return new Response("OK"); }
    const name = rawName || getCountryDisplayName(code);
    if (!Array.isArray(walletConfig.custom_countries)) walletConfig.custom_countries = [];
    if (!walletConfig.custom_countries.some((c) => String(c.code) === code)) {
      walletConfig.custom_countries.push({ code, name });
      await db.saveWalletConfig(walletConfig);
    }
    u.pending_action = { action: "add_numbers_upload", service: pa.service, provider: pa.provider || "", country: code };
    await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Country set to <b>${escapeHtml(name)} (+${code})</b>.\n\n📤 Now upload <b>.xlsx / .csv / .txt</b> or paste numbers for <b>${escapeHtml(pa.service)}</b>:`);
  } else if (pa.action === "live_support") {
    const fwd = await tg.sendMessage(adminId, `📩 <b>Support</b> from ${escapeHtml(u.name)} (<code>${uid}</code>):\n\n${escapeHtml(text || "[Media]")}`);
    if (fwd.ok) await db.setSupportMap(fwd.result.message_id, uid);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, "✅ Sent to Admin!");
  } else if (pa.action === "set_wallet") {
    if (!u.wallets) u.wallets = {}; u.wallets[pa.method] = text; u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Saved <b>${escapeHtml(pa.method)}</b>: <code>${escapeHtml(text)}</code>`);
  } else if (pa.action === "withdraw_amount") {
    const amt = parseFloat(text), minW = Number(walletConfig.withdraw_methods?.[pa.method]?.min_withdraw ?? 10);
    if (isNaN(amt) || amt < minW || amt > u.balance) { await tg.sendMessage(chatId, `❌ Invalid amount (Min ৳${minW}, Balance ৳${u.balance.toFixed(2)}).`); return new Response("OK"); }
    u.balance = Number((u.balance - amt).toFixed(2)); u.pending_action = null; await db.saveUser(uid, u);
    const wId = `W${nowTs()}${Math.floor(Math.random() * 900 + 100)}`;
    await db.addWithdrawal({ id: wId, user_id: uid, method: pa.method, amount: amt, account: u.wallets[pa.method], status: "pending_manual", ts: nowTs(), type: "manual" });
    await tg.sendMessage(adminId, `💳 <b>Withdraw</b> <code>${wId}</code>\n👤 <code>${uid}</code>\n🏦 ${escapeHtml(pa.method)}: <code>${escapeHtml(u.wallets[pa.method])}</code>\n💰 ৳${amt.toFixed(2)}`, { reply_markup: ikb([[btn("✅ Approve", { callback_data: `wd_approve|${wId}`, style: "success" }), btn("❌ Reject", { callback_data: `wd_reject|${wId}`, style: "danger" })]]) });
    await tg.sendMessage(chatId, `✅ Request <code>${wId}</code> submitted!`);
  } else if (pa.action === "adm_set_rate" && isAdminUser(uid, env, walletConfig)) {
    const val = parseFloat(text);
    if (!isNaN(val) && val >= 0) {
      if (!walletConfig.service_rates[pa.service]) walletConfig.service_rates[pa.service] = { global: val, country: {} };
      else walletConfig.service_rates[pa.service].global = val;
      await db.saveWalletConfig(walletConfig);
      u.pending_action = null; await db.saveUser(uid, u);
      await tg.sendMessage(chatId, `✅ Rate for <b>${escapeHtml(pa.service)}</b> set to ৳${val.toFixed(2)}`);
    }
  } else if (pa.action === "adm_search_user" && isAdminUser(uid, env, walletConfig)) {
    const found = await db.findUsers(text); u.pending_action = null; await db.saveUser(uid, u);
    if (!found.length) await tg.sendMessage(chatId, "❌ No matching user found.");
    else {
      const tu = found[0], stTxt = tu.banned ? "🚫 <b>BANNED</b>" : "🟢 <b>Active</b>";
      const kb = ikb([
        [btn("➕ Add Balance", { callback_data: `adm_user_bal|add|${tu.uid}`, style: "success" })],
        [btn("➖ Deduct Balance", { callback_data: `adm_user_bal|sub|${tu.uid}`, style: "primary" })],
        [btn("🎁 Set Custom Reward (VIP)", { callback_data: `adm_user_reward|${tu.uid}`, style: "primary" })],
        [btn("🔄 Reset Balance to ৳0", { callback_data: `adm_user_zero_confirm|${tu.uid}`, style: "danger" })],
        [btn(tu.banned ? "✅ Unban User" : "🚫 Ban User", { callback_data: `adm_user_ban_confirm|${tu.uid}`, style: tu.banned ? "success" : "danger" })],
      ]);
      await tg.sendMessage(chatId, `<blockquote>👤 <b>User Found</b>\n\n🆔 <b>ID:</b> <code>${tu.uid}</code>\n📛 <b>Name:</b> ${escapeHtml(tu.name)}\n🔗 <b>Username:</b> ${tu.username ? "@" + escapeHtml(tu.username) : "N/A"}\n💰 <b>Balance:</b> <b>৳${Number(tu.balance || 0).toFixed(2)} BDT</b>\n📌 <b>Status:</b> ${stTxt}</blockquote>`, { reply_markup: kb });
    }
  } else if (pa.action === "adm_lb_set_reward" && isAdminUser(uid, env, walletConfig)) {
    const lb = await db.getLeaderboard();
    lb.settings.reward_text = text;
    await db.saveLeaderboard(lb);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Updated Leaderboard Reward:\n\n<blockquote>${escapeHtml(text)}</blockquote>`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_u_rate_svc" && isAdminUser(uid, env, walletConfig)) {
    const val = parseFloat(text);
    if (isNaN(val) || val < 0) { await tg.sendMessage(chatId, "❌ Invalid rate. Enter a valid number or /cancel."); return new Response("OK"); }
    const tu = await db.getUser(pa.target_uid); u.pending_action = null; await db.saveUser(uid, u);
    if (tu) {
      if (!tu.custom_rates) tu.custom_rates = {};
      tu.custom_rates[pa.service] = val;
      await db.saveUser(tu.uid, tu);
      await tg.sendMessage(chatId, `✅ VIP <b>${escapeHtml(pa.service)}</b> rate for <code>${tu.uid}</code> set to <b>৳${val.toFixed(2)} BDT</b>!`, { reply_markup: ikb([[btn("🎁 Manage User Rewards", { callback_data: `adm_user_reward|${tu.uid}` })]]) });
    }
  } else if (pa.action === "adm_u_rate_global" && isAdminUser(uid, env, walletConfig)) {
    const val = parseFloat(text);
    if (isNaN(val) || val < 0) { await tg.sendMessage(chatId, "❌ Invalid rate. Enter a valid number or /cancel."); return new Response("OK"); }
    const tu = await db.getUser(pa.target_uid); u.pending_action = null; await db.saveUser(uid, u);
    if (tu) {
      tu.custom_global_rate = val;
      await db.saveUser(tu.uid, tu);
      await tg.sendMessage(chatId, `✅ VIP global rate (all services) for <code>${tu.uid}</code> set to <b>৳${val.toFixed(2)} BDT</b>!`, { reply_markup: ikb([[btn("🎁 Manage User Rewards", { callback_data: `adm_user_reward|${tu.uid}` })]]) });
    }
  } else if (pa.action === "adm_user_bal" && isAdminUser(uid, env, walletConfig)) {
    const amt = parseFloat(text);
    if (isNaN(amt) || amt <= 0) { await tg.sendMessage(chatId, "❌ Invalid amount. Enter a positive number or /cancel."); return new Response("OK"); }
    const tu = await db.getUser(pa.target_uid); u.pending_action = null; await db.saveUser(uid, u);
    if (!tu) { await tg.sendMessage(chatId, "❌ User not found."); return new Response("OK"); }
    tu.balance = pa.mode === "add" ? Number(((tu.balance || 0) + amt).toFixed(2)) : Math.max(0, Number(((tu.balance || 0) - amt).toFixed(2)));
    await db.saveUser(tu.uid, tu);
    await tg.sendMessage(chatId, `✅ Updated balance for <code>${tu.uid}</code>: <b>৳${tu.balance.toFixed(2)} BDT</b>`, { reply_markup: ikb([[btn("👤 Manage User", { callback_data: `adm_view_user|${tu.uid}` })]]) });
  } else if (pa.action === "adm_add_platform" && isAdminUser(uid, env, walletConfig)) {
    const svc = normalizeServiceName(text.trim());
    if (!svc) { await tg.sendMessage(chatId, "❌ Invalid service name."); return new Response("OK"); }
    platforms[svc] = { name: svc, emoji_id: platforms[svc]?.emoji_id || "", short: svc.slice(0, 3).toUpperCase() };
    if (!walletConfig.service_rates) walletConfig.service_rates = {};
    if (!walletConfig.service_rates[svc]) walletConfig.service_rates[svc] = { global: 0.5, country: {} };
    await Promise.all([db.savePlatforms(platforms), db.saveWalletConfig(walletConfig)]);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Service <b>${escapeHtml(svc)}</b> added!`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_add_provider" && isAdminUser(uid, env, walletConfig)) {
    const prov = text.trim();
    const provs = await db.getProviders();
    if (prov && !provs.includes(prov)) { provs.push(prov); await db.saveProviders(provs); }
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Provider <b>${escapeHtml(prov)}</b> added!`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_otp_api_add" && isAdminUser(uid, env, walletConfig)) {
    const [name, url, token = ""] = text.split("|").map((s) => s.trim());
    if (name && url) {
      walletConfig.otp_inbox_api.apis.push({ id: `api_${nowTs()}`, name, url, token, scheme: "param_token", enabled: true });
      await db.saveWalletConfig(walletConfig); u.pending_action = null; await db.saveUser(uid, u);
      await tg.sendMessage(chatId, `✅ API <b>${escapeHtml(name)}</b> added!`);
    }
  } else if (pa.action === "adm_add_channel" && isAdminUser(uid, env, walletConfig)) {
    const entry = parseChannelEntry(text);
    if (!entry.id) { await tg.sendMessage(chatId, "❌ Invalid channel format. Try again or /cancel."); return new Response("OK"); }
    if (!Array.isArray(walletConfig.required_channels)) walletConfig.required_channels = [];
    walletConfig.required_channels.push(entry);
    walletConfig.channels_updated_at = nowTs();
    await db.saveWalletConfig(walletConfig);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ Added required channel/group: <code>${escapeHtml(entry.id)}</code>\n\nAll non-admin users must now join this to use the bot!`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_set_otp_group_url" && isAdminUser(uid, env, walletConfig)) {
    const link = text.trim();
    if (!/^https?:\/\/t\.me\//i.test(link)) { await tg.sendMessage(chatId, "❌ Invalid Telegram link. Must start with <code>https://t.me/</code>. Try again or /cancel."); return new Response("OK"); }
    if (!walletConfig.channel_logs) walletConfig.channel_logs = {};
    if (!walletConfig.channel_logs.otp_group) walletConfig.channel_logs.otp_group = { enabled: false, chat_id: "", bot_token: "", channel_url: "" };
    walletConfig.channel_logs.otp_group.channel_url = link;
    await db.saveWalletConfig(walletConfig);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ OTP Group link updated to:\n<code>${escapeHtml(link)}</code>`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_set_otp_source_id" && isAdminUser(uid, env, walletConfig)) {
    const cid = text.trim();
    if (!/^-?\d+$/.test(cid)) { await tg.sendMessage(chatId, "❌ Invalid Chat ID (e.g. <code>-1003888145264</code>). Try again or /cancel."); return new Response("OK"); }
    walletConfig.otp_source_chat_id = cid;
    await db.saveWalletConfig(walletConfig);
    u.pending_action = null; await db.saveUser(uid, u);
    await tg.sendMessage(chatId, `✅ OTP Source Chat ID updated to: <code>${escapeHtml(cid)}</code>`, { reply_markup: adminPanelKb(uid, env, walletConfig) });
  } else if (pa.action === "adm_broadcast" && isAdminUser(uid, env, walletConfig)) {
    u.pending_action = null; await db.saveUser(uid, u);
    const ids = await db.getAllUserIds(); let sent = 0;
    for (let i = 0; i < ids.length; i += 20) await Promise.all(ids.slice(i, i + 20).map(async (id) => { if ((await tg.copyMessage(id, chatId, msg.message_id)).ok) sent++; }));
    await tg.sendMessage(chatId, `📢 Broadcast sent to <b>${sent}/${ids.length}</b> users.`);
  }
  return new Response("OK");
}

// ============ 8. CLOUDFLARE PAGES ENTRY POINT (_worker.js) ============
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health") {
      return new Response(JSON.stringify({ ok: true, mode: "single-file-pages-d1" }), { headers: { "Content-Type": "application/json" } });
    }

    if (path === "/setup") {
      const secret = url.searchParams.get("secret") || "";
      if (env.CRON_SECRET && secret !== env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
      if (!env.DB) return new Response("D1 binding 'DB' not found!", { status: 500 });
      await new BotDB(env.DB).initSchema();
      return new Response(JSON.stringify({ ok: true, message: "D1 tables initialized!" }), { headers: { "Content-Type": "application/json" } });
    }

    if (path === "/cron") {
      const secret = url.searchParams.get("secret") || "";
      if (env.CRON_SECRET && secret !== env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
      const db = new BotDB(env.DB), tg = new TelegramAPI(env.BOT_TOKEN);
      const polled = await pollOtpInboxApis(db, tg, await db.getWalletConfig(), await db.getPlatforms(), false);
      await db.cleanupExpiredSold(); await db.cleanupSeenApiMsgs();
      return new Response(JSON.stringify({ ok: true, polled }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" && path === "/api/otp") {
      const secret = url.searchParams.get("secret") || request.headers.get("x-cron-secret") || "";
      if (env.CRON_SECRET && secret !== env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
      if (!env.BOT_TOKEN || !env.DB) return new Response("Missing BOT_TOKEN or DB", { status: 500 });
      try {
        const body = await request.json();
        const db = new BotDB(env.DB), tg = new TelegramAPI(env.BOT_TOKEN);
        await db.preloadCore();
        const walletConfig = await db.getWalletConfig(), platforms = await db.getPlatforms();
        const rawNum = String(body.number || "").trim();
        const rawSms = String(body.sms || body.message || "");
        const rawSvc = normalizeServiceName(body.service || "Unknown");
        const rawCode = String(body.code || extractOtpCode(rawSms, [rawNum]) || "N/A");
        const delivered = await deliverVerifiedOtp(db, tg, walletConfig, platforms, rawNum, rawSvc, rawCode, rawSms);
        return new Response(JSON.stringify({ ok: true, delivered }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    if (request.method === "POST" && (path === "/webhook" || path === "/telegram-webhook" || path === "/")) {
      if (!env.BOT_TOKEN || !env.DB) return new Response("Missing BOT_TOKEN or DB binding", { status: 500 });
      try {
        const update = await request.json();
        const work = handleTelegramUpdate(update, env, ctx).catch((e) => console.error("Webhook error:", e));
        if (ctx?.waitUntil) {
          ctx.waitUntil(work);
          return new Response("OK", { status: 200 });
        }
        await work;
        return new Response("OK", { status: 200 });
      } catch (e) {
        return new Response("Error: " + e.message, { status: 500 });
      }
    }

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SMS Bot</title></head><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="background:#1e293b;padding:2rem;border-radius:12px;text-align:center"><h2 style="color:#38bdf8;margin-top:0">Telegram SMS Bot Online</h2><p>Running on Cloudflare Pages (_worker.js) + D1</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  },
};
