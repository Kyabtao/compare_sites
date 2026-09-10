// Category templates: define the spec fields used for manual entry,
// scoring ("higher"/"lower"/"yes" = better), and mapping of scraped specs.

const TEMPLATES = {
  generic: {
    label: 'Generic',
    icon: '⚖️',
    hint: 'Any topic — add custom fields',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' },
      { key: 'pros', label: 'Pros', type: 'list', better: 'list' },
      { key: 'cons', label: 'Cons', type: 'list', better: 'list' }
    ]
  },

  phones: {
    label: 'Phones',
    icon: '📱',
    hint: 'Smartphones & tablets',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'display', label: 'Display', type: 'text' },
      { key: 'refresh_rate', label: 'Refresh rate', type: 'number', better: 'higher', unit: 'Hz' },
      { key: 'processor', label: 'Processor', type: 'text' },
      { key: 'ram', label: 'RAM', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'storage', label: 'Storage', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'battery', label: 'Battery', type: 'number', better: 'higher', unit: 'mAh' },
      { key: 'charging', label: 'Fast charging', type: 'number', better: 'higher', unit: 'W' },
      { key: 'camera', label: 'Main camera', type: 'number', better: 'higher', unit: 'MP' },
      { key: 'front_camera', label: 'Selfie camera', type: 'number', better: 'higher', unit: 'MP' },
      { key: 'os', label: 'OS', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'number', better: 'lower', unit: 'g' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' },
      { key: 'waterproof', label: 'Water resistance', type: 'text' }
    ]
  },

  laptops: {
    label: 'Laptops',
    icon: '💻',
    hint: 'Laptops & computers',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'display', label: 'Display', type: 'text' },
      { key: 'processor', label: 'Processor', type: 'text' },
      { key: 'ram', label: 'RAM', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'storage', label: 'Storage', type: 'text' },
      { key: 'gpu', label: 'Graphics', type: 'text' },
      { key: 'battery', label: 'Battery life', type: 'number', better: 'higher', unit: 'hrs' },
      { key: 'weight', label: 'Weight', type: 'number', better: 'lower', unit: 'kg' },
      { key: 'os', label: 'OS', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  tvs: {
    label: 'TVs',
    icon: '📺',
    hint: 'Televisions & displays',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'size', label: 'Screen size', type: 'number', better: 'higher', unit: 'inch' },
      { key: 'resolution', label: 'Resolution', type: 'text' },
      { key: 'panel', label: 'Panel type', type: 'text' },
      { key: 'refresh_rate', label: 'Refresh rate', type: 'number', better: 'higher', unit: 'Hz' },
      { key: 'hdr', label: 'HDR', type: 'text' },
      { key: 'smart', label: 'Smart OS', type: 'text' },
      { key: 'hdmi', label: 'HDMI ports', type: 'number', better: 'higher' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  cameras: {
    label: 'Cameras',
    icon: '📷',
    hint: 'Cameras & lenses',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'megapixels', label: 'Megapixels', type: 'number', better: 'higher', unit: 'MP' },
      { key: 'sensor', label: 'Sensor', type: 'text' },
      { key: 'video', label: 'Max video', type: 'text' },
      { key: 'iso', label: 'Max ISO', type: 'number', better: 'higher' },
      { key: 'burst', label: 'Burst speed', type: 'number', better: 'higher', unit: 'fps' },
      { key: 'weight', label: 'Weight', type: 'number', better: 'lower', unit: 'g' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  headphones: {
    label: 'Audio',
    icon: '🎧',
    hint: 'Headphones, earbuds, speakers',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'battery', label: 'Battery life', type: 'number', better: 'higher', unit: 'hrs' },
      { key: 'anc', label: 'Noise cancelling', type: 'boolean', better: 'yes' },
      { key: 'driver', label: 'Driver size', type: 'number', better: 'higher', unit: 'mm' },
      { key: 'bluetooth', label: 'Bluetooth', type: 'text' },
      { key: 'waterproof', label: 'Water resistance', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'number', better: 'lower', unit: 'g' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  watches: {
    label: 'Watches',
    icon: '⌚',
    hint: 'Smartwatches & wearables',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'display', label: 'Display', type: 'text' },
      { key: 'battery', label: 'Battery life', type: 'number', better: 'higher', unit: 'days' },
      { key: 'gps', label: 'GPS', type: 'boolean', better: 'yes' },
      { key: 'heart_rate', label: 'Heart rate', type: 'boolean', better: 'yes' },
      { key: 'waterproof', label: 'Water resistance', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'number', better: 'lower', unit: 'g' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  streaming: {
    label: 'Streaming',
    icon: '🎬',
    hint: 'Streaming & subscription services',
    fields: [
      { key: 'price', label: 'Monthly price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'video_quality', label: 'Video quality', type: 'text' },
      { key: 'screens', label: 'Simultaneous screens', type: 'number', better: 'higher' },
      { key: 'ads', label: 'Ad-free', type: 'boolean', better: 'yes' },
      { key: 'offline', label: 'Offline downloads', type: 'boolean', better: 'yes' },
      { key: 'family_plan', label: 'Family plan', type: 'boolean', better: 'yes' },
      { key: 'originals', label: 'Originals library', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  saas: {
    label: 'Software',
    icon: '🧩',
    hint: 'SaaS tools, apps & plans',
    fields: [
      { key: 'price', label: 'Monthly price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'free_tier', label: 'Free tier', type: 'boolean', better: 'yes' },
      { key: 'trial', label: 'Free trial', type: 'text' },
      { key: 'users', label: 'Included users', type: 'number', better: 'higher' },
      { key: 'storage', label: 'Storage', type: 'text' },
      { key: 'integrations', label: 'Integrations', type: 'number', better: 'higher' },
      { key: 'support', label: 'Support', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  credit_cards: {
    label: 'Credit cards',
    icon: '💳',
    hint: 'Cards, banking & finance',
    fields: [
      { key: 'price', label: 'Annual fee', type: 'number', better: 'lower', unit: '₹' },
      { key: 'joining_bonus', label: 'Joining bonus', type: 'number', better: 'higher', unit: '₹' },
      { key: 'cashback', label: 'Cashback / rewards', type: 'text' },
      { key: 'interest', label: 'Interest rate', type: 'number', better: 'lower', unit: '%' },
      { key: 'lounge', label: 'Airport lounge', type: 'boolean', better: 'yes' },
      { key: 'forex', label: 'Forex markup', type: 'number', better: 'lower', unit: '%' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  },

  insurance: {
    label: 'Insurance',
    icon: '🛡️',
    hint: 'Insurance & protection plans',
    fields: [
      { key: 'price', label: 'Monthly premium', type: 'number', better: 'lower', unit: '₹' },
      { key: 'coverage', label: 'Coverage amount', type: 'number', better: 'higher', unit: '₹' },
      { key: 'deductible', label: 'Deductible', type: 'number', better: 'lower', unit: '₹' },
      { key: 'claim_ratio', label: 'Claim settlement ratio', type: 'number', better: 'higher', unit: '%' },
      { key: 'cashless', label: 'Cashless hospitals', type: 'number', better: 'higher' },
      { key: 'waiting', label: 'Waiting period', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ]
  }
};

// Aliases: map scraped spec names (lowercased, punctuation stripped) to template field keys
const ALIASES = {
  // phones / general hardware
  display: ['display', 'screen', 'screen size', 'display size', 'display type', 'panel', 'display resolution', 'resolution'],
  refresh_rate: ['refresh rate', 'refresh', 'frame rate', 'hz'],
  processor: ['processor', 'cpu', 'chipset', 'soc', 'chip', 'processor brand', 'cpu model'],
  ram: ['ram', 'memory', 'ram memory', 'installed ram', 'memory size', 'system memory'],
  storage: ['storage', 'internal', 'internal storage', 'internal memory', 'rom', 'hard drive', 'ssd', 'storage capacity', 'flash memory'],
  battery: ['battery', 'battery capacity', 'battery life', 'battery type', 'playback time', 'battery power', 'battery backup'],
  charging: ['charging', 'fast charging', 'charging speed', 'charge time', 'wattage'],
  camera: ['camera', 'main camera', 'rear camera', 'primary camera', 'camera resolution', 'back camera', 'megapixel', 'megapixels', 'camera type'],
  front_camera: ['front camera', 'selfie camera', 'secondary camera', 'front facing'],
  os: ['os', 'operating system', 'software', 'platform'],
  weight: ['weight', 'item weight', 'product weight'],
  rating: ['rating', 'ratings', 'customer rating', 'average rating', 'review score'],
  waterproof: ['water resistant', 'water resistance', 'waterproof', 'ip rating', 'ip code', 'dust resistance'],
  gpu: ['gpu', 'graphics', 'graphics card', 'gpu model', 'dedicated graphics', 'graphics memory'],
  size: ['size', 'screen size', 'diagonal', 'diagonal size', 'tv size', 'inches'],
  resolution: ['resolution', 'display resolution', 'screen resolution', 'pixels', 'max resolution'],
  panel: ['panel', 'panel type', 'display technology', 'screen type'],
  hdr: ['hdr', 'hdr support', 'high dynamic range'],
  smart: ['smart', 'smart tv', 'operating system', 'smart os', 'platform'],
  hdmi: ['hdmi', 'hdmi ports', 'ports'],
  megapixels: ['megapixels', 'megapixel', 'effective pixels', 'sensor resolution', 'camera resolution'],
  sensor: ['sensor', 'sensor type', 'image sensor', 'sensor size'],
  video: ['video', 'video resolution', 'max video', 'video quality', 'video recording'],
  iso: ['iso', 'max iso', 'iso range'],
  burst: ['burst', 'burst speed', 'continuous shooting', 'fps'],
  type: ['type', 'form factor', 'style', 'design', 'category'],
  anc: ['anc', 'noise cancelling', 'noise cancellation', 'active noise'],
  driver: ['driver', 'driver size', 'driver unit'],
  bluetooth: ['bluetooth', 'bluetooth version', 'connectivity', 'wireless'],
  gps: ['gps', 'location', 'navigation'],
  heart_rate: ['heart rate', 'hr sensor', 'health sensor'],
  price: ['price', 'cost', 'sale price', 'deal price', 'amount', 'premium', 'annual fee', 'fee'],
  screens: ['screens', 'simultaneous screens', 'devices', 'simultaneous streams'],
  ads: ['ads', 'ad free', 'advertisements', 'commercials'],
  offline: ['offline', 'downloads', 'offline viewing', 'offline downloads'],
  family_plan: ['family', 'family plan', 'sharing'],
  originals: ['originals', 'exclusive content', 'library', 'content'],
  free_tier: ['free tier', 'free plan', 'free version'],
  trial: ['trial', 'free trial', 'trial period'],
  users: ['users', 'seats', 'team members', 'included users'],
  integrations: ['integrations', 'apps', 'connectors', 'add ons', 'addons'],
  support: ['support', 'customer support', 'service', 'assistance'],
  joining_bonus: ['joining bonus', 'welcome bonus', 'welcome benefit', 'joining benefit'],
  cashback: ['cashback', 'cash back', 'rewards', 'reward rate', 'points'],
  interest: ['interest', 'interest rate', 'apr', 'annual percentage rate'],
  lounge: ['lounge', 'airport lounge', 'lounge access'],
  forex: ['forex', 'foreign exchange', 'forex markup', 'markup'],
  coverage: ['coverage', 'coverage amount', 'sum assured', 'sum insured', 'cover'],
  deductible: ['deductible', 'excess', 'deduction'],
  claim_ratio: ['claim ratio', 'claim settlement', 'settlement ratio', 'incurred claim'],
  cashless: ['cashless', 'network hospitals', 'hospitals'],
  waiting: ['waiting period', 'waiting', 'pre existing'],
  video_quality: ['video quality', 'resolution', 'quality', 'streaming quality'],
  pros: ['pros', 'advantages', 'strengths'],
  cons: ['cons', 'disadvantages', 'weaknesses']
};

function getTemplate(key) {
  return TEMPLATES[key] || TEMPLATES.generic;
}

// Normalize a spec name for alias matching
function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^a-z0-9\s/.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Map a scraped spec name to a template field key
function matchField(specName, templateKey) {
  const tpl = getTemplate(templateKey);
  const norm = normalizeName(specName);
  if (!norm) return null;

  // exact / contains match against each field's own label
  for (const f of tpl.fields) {
    const label = normalizeName(f.label);
    if (!label) continue;
    if (norm === label) return f.key;
    if (containsWord(norm, label)) return f.key;
  }
  // alias table
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(norm)) return key;
    for (const a of aliases) {
      if (containsWord(norm, a)) return key;
      // reverse-contains (alias contains the name) is only reliable for
      // multi-word or long names — prevents "sim" matching "simultaneous
      // screens" or "speed" matching "charging speed".
      const wordCount = norm.split(' ').length;
      if ((wordCount >= 2 || norm.length >= 12) && containsWord(a, norm)) return key;
    }
  }
  return null;
}

// Contains check that respects word boundaries for short needles,
// so "os" doesn't match inside "positioning" but "os version" matches.
function containsWord(haystack, needle) {
  if (!needle) return false;
  if (needle.length < 4) {
    const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
    return re.test(haystack);
  }
  return haystack.includes(needle);
}

module.exports = { TEMPLATES, getTemplate, normalizeName, matchField };
