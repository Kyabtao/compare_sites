// Category templates for StackCompare — web-dev tools niche.
// Fields define manual entry + scoring; `computed` fields are derived
// from specs (true-cost metrics) and scored like normal fields.

const TEMPLATES = {
  domains: {
    label: 'Domains',
    icon: '🌐',
    hint: 'Domain registrars — watch the renewal price!',
    fields: [
      { key: 'price', label: '.com 1st yr', type: 'number', better: 'lower', unit: '₹/yr' },
      { key: 'renewal', label: '.com renewal', type: 'number', better: 'lower', unit: '₹/yr' },
      { key: 'in_first', label: '.in 1st yr', type: 'number', better: 'lower', unit: '₹/yr' },
      { key: 'in_renewal', label: '.in renewal', type: 'number', better: 'lower', unit: '₹/yr' },
      { key: 'whois', label: 'Free WHOIS privacy', type: 'boolean', better: 'yes' },
      { key: 'upi', label: 'UPI payment', type: 'boolean', better: 'yes' },
      { key: 'email', label: 'Free email forwarding', type: 'boolean', better: 'yes' },
      { key: 'dnssec', label: 'DNSSEC', type: 'boolean', better: 'yes' },
      { key: 'tlds', label: 'TLDs offered', type: 'number', better: 'higher' },
      { key: 'support', label: 'Support', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'markup', label: 'Renewal markup', unit: '×', better: 'lower',
        formula: (s) => (num(s.price) && num(s.renewal) ? num(s.renewal) / num(s.price) : null)
      },
      {
        key: 'com_5yr', label: '.com 5-yr cost', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) && num(s.renewal) ? num(s.price) + 4 * num(s.renewal) : null)
      },
      {
        key: 'com_10yr', label: '.com 10-yr cost', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) && num(s.renewal) ? num(s.price) + 9 * num(s.renewal) : null)
      }
    ]
  },

  hosting: {
    label: 'Hosting',
    icon: '🖥️',
    hint: 'Shared web hosting — intro vs renewal',
    fields: [
      { key: 'price', label: 'Intro price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'renewal', label: 'Renewal price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'storage', label: 'NVMe storage', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'websites', label: 'Websites', type: 'number', better: 'higher' },
      { key: 'free_domain', label: 'Free domain', type: 'boolean', better: 'yes' },
      { key: 'free_ssl', label: 'Free SSL', type: 'boolean', better: 'yes' },
      { key: 'backups', label: 'Backups', type: 'text' },
      { key: 'support', label: 'Support', type: 'text' },
      { key: 'money_back', label: 'Money-back', type: 'number', better: 'higher', unit: 'days' },
      { key: 'india_dc', label: 'India data center', type: 'boolean', better: 'yes' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'markup', label: 'Renewal markup', unit: '×', better: 'lower',
        formula: (s) => (num(s.price) && num(s.renewal) ? num(s.renewal) / num(s.price) : null)
      },
      {
        key: 'yr3_total', label: '3-yr total', unit: '₹', better: 'lower',
        // assumes intro rate locked for a typical 36-mo term
        formula: (s) => (num(s.price) ? num(s.price) * 36 : null)
      },
      {
        key: 'yr5_avg', label: '5-yr avg (₹/mo)', unit: '₹/mo', better: 'lower',
        // 3 yrs at intro + 2 yrs at renewal, averaged — the honest monthly cost
        formula: (s) => (num(s.price) && num(s.renewal) ? (num(s.price) * 36 + num(s.renewal) * 24) / 60 : null)
      }
    ]
  },

  vps: {
    label: 'VPS',
    icon: '⚡',
    hint: 'VPS & cloud servers — entry tiers',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'vcpu', label: 'vCPU', type: 'number', better: 'higher' },
      { key: 'ram', label: 'RAM', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'storage', label: 'NVMe storage', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'bandwidth', label: 'Bandwidth', type: 'number', better: 'higher', unit: 'TB' },
      { key: 'india_dc', label: 'India data center', type: 'boolean', better: 'yes' },
      { key: 'hourly', label: 'Hourly billing', type: 'boolean', better: 'yes' },
      { key: 'snapshots', label: 'Snapshots / backups', type: 'boolean', better: 'yes' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'per_gb_ram', label: '₹ per GB RAM', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) && num(s.ram) ? num(s.price) / num(s.ram) : null)
      },
      {
        key: 'per_vcpu', label: '₹ per vCPU', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) && num(s.vcpu) ? num(s.price) / num(s.vcpu) : null)
      }
    ]
  },

  builders: {
    label: 'Builders',
    icon: '🧱',
    hint: 'Website builders & e-commerce',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'free_plan', label: 'Free plan', type: 'boolean', better: 'yes' },
      { key: 'custom_domain', label: 'Custom domain', type: 'boolean', better: 'yes' },
      { key: 'ecommerce', label: 'E-commerce', type: 'boolean', better: 'yes' },
      { key: 'ecom_fee', label: 'Transaction fee', type: 'number', better: 'lower', unit: '%' },
      { key: 'templates', label: 'Templates', type: 'number', better: 'higher' },
      { key: 'storage', label: 'Storage', type: 'text' },
      { key: 'blog', label: 'Blog', type: 'boolean', better: 'yes' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'yr3_total', label: '3-yr total', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) ? num(s.price) * 36 : null)
      }
    ]
  },

  wp_hosting: {
    label: 'WP Hosting',
    icon: '🔧',
    hint: 'Managed WordPress hosting',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'renewal', label: 'Renewal price', type: 'number', better: 'lower', unit: '₹/mo' },
      { key: 'storage', label: 'NVMe storage', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'visits', label: 'Monthly visits', type: 'number', better: 'higher', unit: 'k' },
      { key: 'staging', label: 'Staging', type: 'boolean', better: 'yes' },
      { key: 'backups', label: 'Backups', type: 'text' },
      { key: 'cdn', label: 'Free CDN', type: 'boolean', better: 'yes' },
      { key: 'phone_support', label: 'Phone support', type: 'boolean', better: 'yes' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'markup', label: 'Renewal markup', unit: '×', better: 'lower',
        formula: (s) => (num(s.price) && num(s.renewal) ? num(s.renewal) / num(s.price) : null)
      },
      {
        key: 'yr3_total', label: '3-yr total', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) ? num(s.price) * 36 : null)
      }
    ]
  },

  email: {
    label: 'Email',
    icon: '✉️',
    hint: 'Business email hosting',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹/user/mo' },
      { key: 'storage', label: 'Mailbox storage', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'free_tier', label: 'Free tier', type: 'boolean', better: 'yes' },
      { key: 'custom_domain', label: 'Custom domain', type: 'boolean', better: 'yes' },
      { key: 'imap', label: 'IMAP / POP', type: 'boolean', better: 'yes' },
      { key: 'collab', label: 'Docs / collaboration', type: 'boolean', better: 'yes' },
      { key: 'india_dc', label: 'India data center', type: 'boolean', better: 'yes' },
      { key: 'support', label: 'Support', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'team10_yr', label: '10-user yr cost', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) ? num(s.price) * 10 * 12 : null)
      }
    ]
  },

  gpu: {
    label: 'GPU Cloud',
    icon: '🎮',
    hint: 'GPU rental — H100 on-demand',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹/hr' },
      { key: 'vram', label: 'VRAM (H100)', type: 'number', better: 'higher', unit: 'GB' },
      { key: 'spot', label: 'Spot / interruptible', type: 'boolean', better: 'yes' },
      { key: 'api', label: 'API / serverless', type: 'boolean', better: 'yes' },
      { key: 'setup', label: 'Setup time', type: 'number', better: 'lower', unit: 'min' },
      { key: 'sla', label: 'Uptime SLA', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' }
    ],
    computed: [
      {
        key: 'per_gb_vram', label: '₹/hr per GB VRAM', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) && num(s.vram) ? num(s.price) / num(s.vram) : null)
      },
      {
        key: 'day_cost', label: '24-hr run cost', unit: '₹', better: 'lower',
        formula: (s) => (num(s.price) ? num(s.price) * 24 : null)
      }
    ]
  },

  generic: {
    label: 'Generic',
    icon: '⚖️',
    hint: 'Any tool — add custom fields',
    fields: [
      { key: 'price', label: 'Price', type: 'number', better: 'lower', unit: '₹' },
      { key: 'rating', label: 'Rating', type: 'number', better: 'higher', unit: '/5' },
      { key: 'pros', label: 'Pros', type: 'list', better: 'list' },
      { key: 'cons', label: 'Cons', type: 'list', better: 'list' }
    ],
    computed: []
  }
};

function num(v) {
  if (typeof v === 'number') return v;
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// Aliases: map scraped spec names (lowercased, punctuation stripped) to template field keys
const ALIASES = {
  price: ['price', 'cost', 'intro price', 'starting price', 'promo price', 'per month', 'monthly price', 'plan price'],
  renewal: ['renewal', 'renewal price', 'renewal cost', 'regular price', 'regular rate'],
  in_first: ['.in price', 'in domain price', '.in registration'],
  in_renewal: ['.in renewal'],
  storage: ['storage', 'ssd', 'nvme', 'disk space', 'storage capacity', 'web space', 'hard drive'],
  websites: ['websites', 'sites', 'number of websites', 'allowed websites'],
  vcpu: ['vcpu', 'vpus', 'cpu', 'cpu cores', 'cores', 'vcpus'],
  ram: ['ram', 'memory', 'memory size', 'system memory'],
  bandwidth: ['bandwidth', 'transfer', 'traffic', 'data transfer', 'bandwidth allowance'],
  free_domain: ['free domain', 'domain included', 'free domain name'],
  free_ssl: ['free ssl', 'ssl certificate', 'ssl included', 'free ssl certificate'],
  backups: ['backups', 'backup', 'backup frequency', 'daily backups'],
  support: ['support', 'customer support', 'customer service', 'help'],
  money_back: ['money back', 'money-back', 'refund', 'money back guarantee', 'guarantee'],
  india_dc: ['india data center', 'india datacenter', 'mumbai', 'bangalore', 'delhi', 'data center location', 'data centers'],
  hourly: ['hourly billing', 'hourly'],
  snapshots: ['snapshots', 'snapshot', 'backups included'],
  rating: ['rating', 'ratings', 'customer rating', 'average rating', 'review score'],
  whois: ['whois', 'whois privacy', 'privacy protection', 'domain privacy'],
  upi: ['upi', 'upi payment', 'unified payments'],
  email: ['email forwarding', 'email', 'email hosting', 'email accounts'],
  dnssec: ['dnssec', 'dns security'],
  tlds: ['tlds', 'tld', 'extensions', 'domain extensions'],
  free_plan: ['free plan', 'free tier', 'free version', 'free forever'],
  custom_domain: ['custom domain', 'connect domain', 'own domain'],
  ecommerce: ['ecommerce', 'e-commerce', 'online store', 'store', 'selling'],
  ecom_fee: ['transaction fee', 'transaction fees', 'fees', 'commission'],
  templates: ['templates', 'template library', 'designs'],
  blog: ['blog', 'blogging'],
  visits: ['visits', 'monthly visits', 'traffic', 'views', 'visitors'],
  staging: ['staging', 'staging environment', 'staging sites'],
  cdn: ['cdn', 'content delivery network'],
  phone_support: ['phone support', 'phone', 'call support'],
  imap: ['imap', 'pop', 'imap pop'],
  collab: ['collaboration', 'docs', 'office suite', 'document collaboration', 'sheets'],
  vram: ['vram', 'gpu memory', 'video memory', 'memory'],
  spot: ['spot', 'spot instances', 'interruptible', 'preemptible'],
  api: ['api', 'serverless', 'api access'],
  setup: ['setup', 'setup time', 'deploy time', 'spin up'],
  sla: ['sla', 'uptime', 'uptime sla', 'availability']
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

  for (const f of tpl.fields) {
    const label = normalizeName(f.label);
    if (!label) continue;
    if (norm === label) return f.key;
    if (containsWord(norm, label)) return f.key;
  }
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(norm)) return key;
    for (const a of aliases) {
      if (containsWord(norm, a)) return key;
      const wordCount = norm.split(' ').length;
      if ((wordCount >= 2 || norm.length >= 12) && containsWord(a, norm)) return key;
    }
  }
  return null;
}

// Contains check that respects word boundaries for short needles
function containsWord(haystack, needle) {
  if (!needle) return false;
  if (needle.length < 4) {
    const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
    return re.test(haystack);
  }
  return haystack.includes(needle);
}

module.exports = { TEMPLATES, getTemplate, normalizeName, matchField };
