const fs = require('fs');
const products = JSON.parse(fs.readFileSync('products.json', 'utf-8'));

// Define hierarchical categories
const categoryHierarchy = {
  'ub-conjugation': {
    title: 'UB Conjugation',
    slug: 'ub-conjugation',
    subcategories: [
      { id: 'e1s-e2s', title: 'E1s / E2s', slug: 'e1s-e2s' },
      { id: 'ubiquitin-ubls', title: 'Ubiquitin/UBLs', slug: 'ubiquitin-ubls' },
    ],
  },
  'e3-ligases': {
    title: 'E3 Ligases',
    slug: 'e3-ligases',
    subcategories: [
      { id: 'e3-proteins', title: 'E3 Ligase Proteins', slug: 'e3-ligase-proteins' },
    ],
  },
  'ub-deconjugation': {
    title: 'UB Deconjugation',
    slug: 'ub-deconjugation',
    subcategories: [
      { id: 'ubiquitinated-substrates', title: 'Ubiquitinated Substrates', slug: 'ubiquitinated-substrates' },
      { id: 'dubs', title: 'DUBs (Deubiquitinating Enzymes)', slug: 'dubs' },
    ],
  },
  'c-terminal-derivatives': {
    title: 'C-Terminal Derivatives',
    slug: 'c-terminal-derivatives',
    subcategories: [
      { id: 'ubl-derivatives', title: 'UBL Derivatives', slug: 'ubl-derivatives' },
      { id: 'dub-inhibitors', title: 'DUB Inhibitors', slug: 'dub-inhibitors' },
    ],
  },
  proteasome: {
    title: 'Proteasome',
    slug: 'proteasome',
    subcategories: [
      { id: '26s-proteasome', title: '26S Proteasome', slug: '26s-proteasome' },
      { id: '20s-proteasome', title: '20S Proteasome', slug: '20s-proteasome' },
      { id: '20s-immunoproteasomes', title: '20S Immunoproteasomes', slug: '20s-immunoproteasomes' },
      { id: 'proteasome-substrates', title: 'Substrates', slug: 'proteasome-substrates' },
      { id: 'proteasome-kits', title: 'Proteasome Kits', slug: 'proteasome-kits' },
    ],
  },
  'tr-fret': {
    title: 'TR-FRET',
    slug: 'tr-fret',
    subcategories: [
      { id: 'tr-fret-kits', title: 'Kits', slug: 'tr-fret-kits' },
      { id: 'acceptors', title: 'Acceptors', slug: 'acceptors' },
      { id: 'cryptate-donors', title: 'Cryptate Donors', slug: 'cryptate-donors' },
    ],
  },
  chains: {
    title: 'Chains',
    slug: 'chains',
    subcategories: [
      { id: 'di-ubiquitin', title: 'Di-Ubiquitin', slug: 'di-ubiquitin' },
      { id: 'tri-ubiquitin', title: 'Tri-Ubiquitin', slug: 'tri-ubiquitin' },
      { id: 'tetra-ubiquitin', title: 'Tetra-Ubiquitin', slug: 'tetra-ubiquitin' },
      { id: 'penta-ubiquitin', title: 'Penta-Ubiquitin', slug: 'penta-ubiquitin' },
    ],
  },
  neurodegenerative: {
    title: 'Neurodegenerative Diseases',
    slug: 'neurodegenerative-diseases',
    subcategories: [
      { id: 'neuro-related', title: 'Neurodegeneration Research', slug: 'neurodegeneration-research' },
    ],
  },
};

const categoryKeywords = {
  'ub-conjugation': {
    'e1s-e2s': ['e1', 'e2', 'ube2', 'uba1', 'activating enzyme'],
    'ubiquitin-ubls': ['ubiquitin', 'nedd8', 'sumo', 'ubl'],
  },
  'e3-ligases': {
    'e3-proteins': ['e3', 'ligase', 'parkin', 'ube3a', 'mdm2', 'itch', 'nedd4', 'xiap', 'crbn', 'ddb1'],
  },
  'ub-deconjugation': {
    'ubiquitinated-substrates': ['ubiquitinated', 'poly-ubiquitin', 'substrate'],
    'dubs': ['dub', 'deubiquitin', 'uchl', 'usp', 'senp', 'nedp'],
  },
  'c-terminal-derivatives': {
    'ubl-derivatives': ['derivative', 'c-terminal', 'cterminal', 'sumo', 'nedd8'],
    'dub-inhibitors': ['inhibitor', 'aldehyde', 'vinyl', 'propargylamide', 'vinyl methyl ester', 'vinyl sulfone'],
  },
  proteasome: {
    '26s-proteasome': ['26s', 'pa28'],
    '20s-proteasome': ['20s', 'proteasome', 'chymotrypsin', 'caspase'],
    '20s-immunoproteasomes': ['immunoproteasome'],
    'proteasome-substrates': ['substrate', 'suc-llvy', 'lle-amc'],
    'proteasome-kits': ['kit', 'proteasome kit'],
  },
  'tr-fret': {
    'tr-fret-kits': ['kit', 'tr-fret', 'fret kit'],
    acceptors: ['acceptor', 'cy5', 'fluorescein'],
    'cryptate-donors': ['europium', 'cryptate', 'donor', 'terbium'],
  },
  chains: {
    'di-ubiquitin': ['di-ubiquitin', '2x', 'k48', 'k63', 'm1', 'k6', 'k11', 'k29', 'k33'],
    'tri-ubiquitin': ['tri-ubiquitin', '3x'],
    'tetra-ubiquitin': ['tetra-ubiquitin', '4x'],
    'penta-ubiquitin': ['penta-ubiquitin', '5x'],
  },
  neurodegenerative: {
    'neuro-related': ['neurodegeneration', 'parkinson', 'alzheimer', 'tau', 'disease'],
  },
};

// Create NDJSON output
let ndjson = '';

// Create main categories
Object.entries(categoryHierarchy).forEach(([catId, catData]) => {
  const categoryDoc = {
    _type: 'category',
    _id: 'category-' + catId,
    name: catData.title,
    slug: { _type: 'slug', current: catData.slug },
    description: catData.title + ' products from South Bay Bio catalog',
  };
  ndjson += JSON.stringify(categoryDoc) + '\n';
  
  // Create subcategories
  catData.subcategories.forEach(subcat => {
    const subcategoryDoc = {
      _type: 'subcategory',
      _id: 'subcategory-' + subcat.id,
      name: subcat.title,
      slug: { _type: 'slug', current: subcat.slug },
      parentCategory: {
        _type: 'reference',
        _ref: 'category-' + catId,
      },
      description: subcat.title + ' - ' + catData.title,
    };
    ndjson += JSON.stringify(subcategoryDoc) + '\n';
  });
});

// Create products
products.forEach((product, index) => {
  const text = (product.title || '') + ' ' + (product.description || '');
  const textLower = text.toLowerCase();
  
  let mainCategoryId = 'ub-conjugation';
  let subcategoryId = 'e1s-e2s';
  
  // Find best matching category
  for (const [mainCatId, mainCatData] of Object.entries(categoryKeywords)) {
    for (const [subCatId, keywords] of Object.entries(mainCatData)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        mainCategoryId = mainCatId;
        subcategoryId = subCatId;
        break;
      }
    }
    if (mainCategoryId !== 'ub-conjugation') break;
  }
  
  const slug = (product.title || 'product-' + index)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Feature every 8th product to get a diverse featured carousel (about 9-10 products)
  const isFeatured = index % 8 === 0;
  
  const productDoc = {
    _type: 'product',
    name: product.title || 'Untitled Product',
    slug: { _type: 'slug', current: slug },
    description: product.description || '',
    price: product.currentPrice || product.averagePrice || 0,
    category: { _type: 'reference', _ref: 'category-' + mainCategoryId },
    subcategory: { _type: 'reference', _ref: 'subcategory-' + subcategoryId },
    material: 'Biotech',
    color: 'natural',
    dimensions: 'Standard',
    stock: product.isOutOfStock ? 0 : 100,
    featured: isFeatured,
    // Store original image URL in a text field for later upload
    imageUrl: product.image || '',
  };
  ndjson += JSON.stringify(productDoc) + '\n';
});

fs.writeFileSync('import-data.ndjson', ndjson);
console.log('✅ Created import-data.ndjson with categories and products');
