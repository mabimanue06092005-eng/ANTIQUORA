/**
 * Demo catalogue for ANTIQUORA.
 *
 * IMPORTANT — what is real and what is illustrative:
 *  • Photographs: public-domain (CC0) reference images of objects in The Metropolitan Museum
 *    of Art collection (Open Access). The pictured objects belong to The Met and are NOT for sale.
 *  • `period`, `origin`, `materials` describe the pictured reference object, taken from
 *    The Met's catalogue record (linked via imageCredit).
 *  • Prices, stock, condition reports, dimensions marked "approx." and provenance notes are
 *    ILLUSTRATIVE marketplace data invented for this demo and are labelled as such in the UI.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  imageKey: string;
}

export const categories: SeedCategory[] = [
  { slug: 'ancient-coins', name: 'Ancient Coins', description: 'Silver drachms, Roman denarii and gold staters — history you can hold in the palm of your hand.', imageKey: 'athenian-owl-tetradrachm' },
  { slug: 'sculptures-statues', name: 'Sculptures & Statues', description: 'Marble heads, bronze statuettes and devotional figures shaped by master carvers and casters.', imageKey: 'marble-youth-head' },
  { slug: 'vintage-furniture', name: 'Vintage Furniture', description: 'Cabinetmaking of the eighteenth and nineteenth centuries — mahogany, walnut and gilded wood.', imageKey: 'mahogany-chest-on-chest' },
  { slug: 'pottery-ceramics', name: 'Pottery & Ceramics', description: 'Painted amphorae, Iznik stonepaste and celadon glazes from three continents.', imageKey: 'iznik-dish' },
  { slug: 'manuscripts-prints', name: 'Manuscripts & Prints', description: 'Illuminated leaves, early maps and woodblock prints for the library and the wall.', imageKey: 'book-of-hours' },
  { slug: 'decorative-collectibles', name: 'Decorative Collectibles', description: 'Astrolabes, snuff bottles, clocks and silver — small objects with outsized stories.', imageKey: 'persian-astrolabe' },
];

export interface SeedProduct {
  key: string; // image manifest key
  sku: string;
  name: string;
  category: string;
  price: number; // INR
  compareAt?: number; // INR
  stock: number;
  featured?: boolean;
  curator?: boolean;
  popularity: number;
  daysAgo: number; // listing age, for "newest"
  shortDescription: string;
  description: string;
  materials: string;
  dimensions: string;
  period: string;
  origin: string;
  provenance: string;
  condition: string;
}

const P = 'Illustrative listing note: ';

export const products: SeedProduct[] = [
  // ── Ancient Coins ──────────────────────────────────────────────
  {
    key: 'athenian-owl-tetradrachm', sku: 'AQ-CN-001', name: 'Athenian Owl Tetradrachm', category: 'ancient-coins',
    price: 185000, stock: 1, featured: true, curator: true, popularity: 96, daysAgo: 40,
    shortDescription: 'The emblem of classical Athens — Athena in profile, her owl on the reverse.',
    description:
      'Few coins carry the weight of an entire civilisation the way the Athenian "owl" does. Struck in silver during the city\'s golden age, the tetradrachm shows the helmeted head of Athena on the obverse and her watchful owl, olive sprig and the letters ΑΘΕ on the reverse. These coins financed temples, fleets and trade routes across the Mediterranean.\n\nThis listing pairs a reference photograph of a classical owl tetradrachm with illustrative marketplace details for demonstration.',
    materials: 'Silver', dimensions: 'Approx. 24 mm diameter, approx. 17 g (illustrative)', period: 'ca. 440–404 BCE', origin: 'Greek, Attica',
    provenance: `${P}presented as from a long-held private coin cabinet. No documentation is held for this demo item.`,
    condition: 'Illustrative condition report: well-centred strike, crisp owl feathers, light even toning; small test cut not visible in photographs.',
  },
  {
    key: 'octavian-denarius', sku: 'AQ-CN-002', name: 'Silver Denarius of Octavian', category: 'ancient-coins',
    price: 64000, compareAt: 72000, stock: 2, featured: true, popularity: 71, daysAgo: 12,
    shortDescription: 'Struck in the years when Octavian became Augustus, first emperor of Rome.',
    description:
      'A small silver denarius from the turbulent transition between the Roman Republic and the Empire. Coins like this were propaganda in the hand: portraits, titles and symbols declared who held power as news travelled across the Roman world.\n\nA handsome first piece for a Roman collection, presented here with illustrative listing data.',
    materials: 'Silver', dimensions: 'Approx. 19 mm diameter (illustrative)', period: '29–27 BCE', origin: 'Roman',
    provenance: `${P}said to come from a European collection formed in the 1970s.`,
    condition: 'Illustrative condition report: good portrait detail, minor surface wear on high points, attractive grey patina.',
  },
  {
    key: 'cypriot-gold-stater', sku: 'AQ-CN-003', name: 'Cypriot Gold Coin', category: 'ancient-coins',
    price: 142000, stock: 1, popularity: 58, daysAgo: 70,
    shortDescription: 'A small, luminous gold coin from the city-kingdoms of ancient Cyprus.',
    description:
      'Gold never tarnishes, which is why this small coin still glows more than two thousand years after it was struck. Cyprus was a crossroads of Greek, Phoenician and Persian influence, and its city-kingdoms issued coinage that reflected that layered identity.',
    materials: 'Gold', dimensions: 'Approx. 10 mm diameter (illustrative)', period: 'ca. 320–309 BCE', origin: 'Cypriot',
    provenance: `${P}offered from a private collection; no export documentation is represented by this demo listing.`,
    condition: 'Illustrative condition report: bright lustre, slightly off-centre flan, no visible scratches.',
  },
  {
    key: 'parthian-tetradrachm', sku: 'AQ-CN-004', name: 'Parthian Silver Tetradrachm', category: 'ancient-coins',
    price: 38500, compareAt: 46000, stock: 3, popularity: 44, daysAgo: 5,
    shortDescription: 'A coin from the empire that rivalled Rome across the Euphrates.',
    description:
      'The Parthians ruled a vast territory from Mesopotamia to the borders of India and minted silver tetradrachms in their Greek-speaking cities. The enthroned king and the Greek legend speak to a dynasty that blended Iranian kingship with Hellenistic tradition.',
    materials: 'Silver', dimensions: 'Approx. 27 mm diameter (illustrative)', period: 'ca. 212–213 CE', origin: 'Parthian',
    provenance: `${P}presented as part of a collector's duplicate set.`,
    condition: 'Illustrative condition report: full legend legible, flat strike on reverse, light cabinet toning.',
  },
  {
    key: 'severan-denarius', sku: 'AQ-CN-005', name: 'Denarius of Septimius Severus', category: 'ancient-coins',
    price: 18500, stock: 6, popularity: 52, daysAgo: 2,
    shortDescription: 'An accessible Roman imperial denarius from the Severan dynasty.',
    description:
      'Septimius Severus, born in North Africa, rose to rule Rome at the end of the second century. His denarii circulated widely and remain an accessible way to own a portrait of a Roman emperor — ideal for a first purchase or a gift.',
    materials: 'Silver', dimensions: 'Approx. 18 mm diameter (illustrative)', period: '200–201 CE', origin: 'Roman',
    provenance: `${P}sourced from a dealer's general stock.`,
    condition: 'Illustrative condition report: clear portrait, legend partly worn, honest circulated condition.',
  },

  // ── Sculptures & Statues ───────────────────────────────────────
  {
    key: 'bronze-cupid-statuette', sku: 'AQ-SC-001', name: 'Bronze Statuette of Cupid', category: 'sculptures-statues',
    price: 245000, compareAt: 275000, stock: 1, featured: true, popularity: 83, daysAgo: 25,
    shortDescription: 'A playful Roman bronze of the winged god of desire.',
    description:
      'Small bronzes like this graced household shrines and villa interiors across the Roman world. The sculptor captured Cupid mid-movement — chubby, winged and full of mischief — in a form that still reads instantly two millennia later.\n\nReference photograph shown; listing details are illustrative.',
    materials: 'Bronze', dimensions: 'Approx. 14 cm high (illustrative)', period: 'ca. 1st–2nd century CE', origin: 'Roman',
    provenance: `${P}presented as from a private collection in Pune.`,
    condition: 'Illustrative condition report: stable green patina, minor losses to the wing tips, no modern restoration noted.',
  },
  {
    key: 'bronze-bull-statuette', sku: 'AQ-SC-002', name: 'Roman Bronze Bull', category: 'sculptures-statues',
    price: 168000, stock: 2, popularity: 61, daysAgo: 33,
    shortDescription: 'A compact, powerful bronze bull — a symbol of strength and sacrifice.',
    description:
      'The bull held a central place in Roman religion, as the noblest sacrificial animal and as an emblem of vigour. This compact statuette, with its lowered head and muscular shoulders, makes a striking object on a desk or bookshelf.',
    materials: 'Bronze', dimensions: 'Approx. 9 cm long (illustrative)', period: '1st–2nd century CE', origin: 'Roman',
    provenance: `${P}said to have been acquired at auction in the 1980s.`,
    condition: 'Illustrative condition report: smooth dark patina, one horn tip worn, stands securely.',
  },
  {
    key: 'marble-herakles-head', sku: 'AQ-SC-003', name: 'Marble Head of Herakles', category: 'sculptures-statues',
    price: 650000, stock: 1, featured: true, curator: true, popularity: 90, daysAgo: 55,
    shortDescription: 'The bearded hero, carved in marble with deep, expressive drill-work.',
    description:
      'Herakles — Hercules to the Romans — was the most celebrated hero of the ancient world. Roman workshops reproduced famous Greek portraits of him for wealthy patrons, and the tousled curls and furrowed brow of this head show the carver\'s skill with chisel and drill.\n\nThe photograph is a museum reference image; this listing is illustrative demo data.',
    materials: 'Marble', dimensions: 'Approx. 32 cm high (illustrative)', period: '1st or 2nd century CE', origin: 'Roman',
    provenance: `${P}presented as from an old English country-house collection. No documentation is held for this demo item.`,
    condition: 'Illustrative condition report: nose and part of the beard lost, weathered surface consistent with age, mounted on a later stand.',
  },
  {
    key: 'marble-youth-head', sku: 'AQ-SC-004', name: 'Parian Marble Head of a Youth', category: 'sculptures-statues',
    price: 520000, compareAt: 580000, stock: 1, popularity: 78, daysAgo: 18,
    shortDescription: 'Serene and idealised — the classical Greek vision of youth in luminous Parian marble.',
    description:
      'Parian marble, quarried on the island of Paros, was prized for its translucency: light seems to enter the stone and glow from within. This idealised head of a youth reflects the calm, balanced beauty of Greek sculpture in the fourth century BCE.',
    materials: 'Marble, Parian', dimensions: 'Approx. 28 cm high (illustrative)', period: '4th century BCE', origin: 'Greek',
    provenance: `${P}presented as from a Swiss private collection.`,
    condition: 'Illustrative condition report: losses to the nose and chin, soft weathering, fine crystalline surface.',
  },
  {
    key: 'gandhara-buddha', sku: 'AQ-SC-005', name: 'Gandhāra Buddha in Schist', category: 'sculptures-statues',
    price: 480000, stock: 1, featured: true, popularity: 88, daysAgo: 21,
    shortDescription: 'Where Greek and Indian art met — a Buddha in grey schist from ancient Gandhāra.',
    description:
      'The art of Gandhāra, in what is now north-western Pakistan and eastern Afghanistan, fused Buddhist devotion with Hellenistic techniques of drapery and portraiture. The deep folds of the robe and the calm face of the Buddha are hallmarks of this extraordinary tradition.\n\nNote for buyers: antiquities from South Asia are subject to strict export and import laws. This demo listing does not represent any export permission.',
    materials: 'Schist', dimensions: 'Approx. 60 cm high (illustrative)', period: '3rd century', origin: 'Gandhāra (present-day Pakistan)',
    provenance: `${P}no provenance documentation is represented. A real listing would require documented legal provenance.`,
    condition: 'Illustrative condition report: halo and hands lost, surface abrasion consistent with age.',
  },

  // ── Vintage Furniture ──────────────────────────────────────────
  {
    key: 'mahogany-chest-on-chest', sku: 'AQ-FN-001', name: 'Georgian-Era Mahogany Chest-on-Chest', category: 'vintage-furniture',
    price: 475000, compareAt: 540000, stock: 1, featured: true, curator: true, popularity: 85, daysAgo: 30,
    shortDescription: 'A towering eighteenth-century case piece in rich, figured mahogany.',
    description:
      'The chest-on-chest — two stacked chests of drawers — was the grandest storage piece of the eighteenth-century home. Fine proportions, a carved pediment and deep, warm mahogany make this a statement piece for a study or entrance hall.\n\nReference photograph shown; listing details are illustrative.',
    materials: 'Mahogany, mahogany veneer, white cedar', dimensions: 'Approx. 230 × 115 × 60 cm (illustrative)', period: '1770–75', origin: 'American',
    provenance: `${P}presented as from a family estate.`,
    condition: 'Illustrative condition report: old refinish, some replaced brasses, drawers run smoothly, minor veneer repairs.',
  },
  {
    key: 'mechanical-table', sku: 'AQ-FN-002', name: 'French Marquetry Mechanical Table', category: 'vintage-furniture',
    price: 395000, stock: 1, popularity: 69, daysAgo: 48,
    shortDescription: 'An ingenious Louis XVI-period table with hidden compartments and fine marquetry.',
    description:
      'Parisian cabinetmakers of the 1770s delighted their clients with "mechanical" furniture: tops that slide, lift or fold to reveal writing surfaces, mirrors and hidden storage. Exquisite marquetry of exotic woods turns the surface into a picture.',
    materials: 'Oak veneered with marquetry of exotic woods, gilt bronze', dimensions: 'Approx. 72 × 80 × 46 cm (illustrative)', period: '1778', origin: 'French',
    provenance: `${P}presented as from a private collection in Kolkata.`,
    condition: 'Illustrative condition report: mechanism functional, small marquetry losses, mounts rubbed.',
  },
  {
    key: 'walnut-folding-armchair', sku: 'AQ-FN-003', name: 'Victorian Walnut Folding Armchair', category: 'vintage-furniture',
    price: 86000, compareAt: 98000, stock: 2, popularity: 47, daysAgo: 9,
    shortDescription: 'A clever late-Victorian folding chair in walnut with metal fittings.',
    description:
      'Patent folding furniture was a nineteenth-century obsession, combining engineering with comfort. This walnut armchair folds flat for travel or storage and opens into a surprisingly comfortable reading chair.',
    materials: 'Walnut, metal', dimensions: 'Approx. 95 × 60 × 70 cm (illustrative)', period: 'ca. 1877–97', origin: 'American',
    provenance: `${P}sourced from a Bengaluru dealer's stock.`,
    condition: 'Illustrative condition report: structurally sound, upholstery replaced, light wear to arms.',
  },
  {
    key: 'gilded-pier-mirror', sku: 'AQ-FN-004', name: 'Gilded Pine Pier Mirror, 1769', category: 'vintage-furniture',
    price: 228000, stock: 1, popularity: 56, daysAgo: 60,
    shortDescription: 'Carved and gilded rococo frame with original-style mirror glass.',
    description:
      'Tall pier mirrors hung between windows to multiply candlelight in eighteenth-century rooms. This frame\'s carved scrolls and foliage, finished in gold leaf, make it as much sculpture as furniture.',
    materials: 'Gilded pine, mirror glass', dimensions: 'Approx. 160 × 80 cm (illustrative)', period: '1769', origin: 'European',
    provenance: `${P}presented as from a heritage hotel refurbishment.`,
    condition: 'Illustrative condition report: regilding to the crest, some flaking, plate with light foxing.',
  },
  {
    key: 'walnut-centre-table', sku: 'AQ-FN-005', name: 'Renaissance Revival Walnut Centre Table', category: 'vintage-furniture',
    price: 142000, compareAt: 165000, stock: 1, popularity: 39, daysAgo: 3,
    shortDescription: 'A richly carved Victorian centre table in walnut and burl veneers.',
    description:
      'Renaissance Revival furniture of the 1860s and 1870s borrowed architectural motifs — columns, cartouches and medallions — to create confident, sculptural pieces for the parlour. This centre table anchors a room beautifully.',
    materials: 'Walnut, amboina, pine, maple, poplar, ash', dimensions: 'Approx. 76 × 110 × 72 cm (illustrative)', period: '1860–72', origin: 'American',
    provenance: `${P}presented as from a private residence in Chennai.`,
    condition: 'Illustrative condition report: original finish with age-appropriate wear, top with minor ring marks.',
  },

  // ── Pottery & Ceramics ─────────────────────────────────────────
  {
    key: 'attic-neck-amphora', sku: 'AQ-PC-001', name: 'Attic Terracotta Neck-Amphora', category: 'pottery-ceramics',
    price: 395000, stock: 1, featured: true, curator: false, popularity: 80, daysAgo: 44,
    shortDescription: 'A black-figure amphora from Athens, painted around 510 BCE.',
    description:
      'Athenian potters and painters turned everyday storage vessels into masterpieces. Black-figure decoration — silhouettes painted in a glossy slip and incised to reveal details — tells stories of gods and heroes around the body of the vessel.',
    materials: 'Terracotta', dimensions: 'Approx. 30 cm high (illustrative)', period: 'ca. 510 BCE', origin: 'Greek, Attic',
    provenance: `${P}no documentation is represented for this demo item.`,
    condition: 'Illustrative condition report: reassembled from fragments with minor infill, slip loss on the foot.',
  },
  {
    key: 'iznik-dish', sku: 'AQ-PC-002', name: 'Iznik Stonepaste Dish', category: 'pottery-ceramics',
    price: 235000, compareAt: 260000, stock: 1, featured: true, popularity: 87, daysAgo: 15,
    shortDescription: 'Ottoman turquoise and cobalt on brilliant white — the glory of Iznik.',
    description:
      'In the sixteenth century, the potters of Iznik in north-western Anatolia produced ceramics for the Ottoman court that rivalled Chinese porcelain. Their dishes, painted with tulips, carnations and saz leaves, remain among the most coveted ceramics in the world.',
    materials: 'Stonepaste; painted in turquoise and blue under transparent glaze', dimensions: 'Approx. 30 cm diameter (illustrative)', period: 'mid-16th century', origin: 'Turkey (Iznik)',
    provenance: `${P}presented as from a private collection in Hyderabad.`,
    condition: 'Illustrative condition report: glaze bright, small rim chips, old restoration to one area of the rim.',
  },
  {
    key: 'nishapur-ewer', sku: 'AQ-PC-003', name: 'Persian Earthenware Ewer', category: 'pottery-ceramics',
    price: 98000, stock: 2, popularity: 41, daysAgo: 27,
    shortDescription: 'An elegant ninth-century ewer with incised and applied decoration.',
    description:
      'Early Islamic potters of Iran experimented boldly with form and decoration. This ewer\'s tall neck, strap handle and incised surface show the period\'s taste for elegant, metal-inspired shapes in clay.',
    materials: 'Earthenware; incised and applied decoration', dimensions: 'Approx. 26 cm high (illustrative)', period: '9th century', origin: 'Iran',
    provenance: `${P}said to come from a collection formed in the 1960s.`,
    condition: 'Illustrative condition report: spout repaired, surface encrustation, stable.',
  },
  {
    key: 'celadon-hanaire', sku: 'AQ-PC-004', name: 'Japanese Celadon Flower Vase (Hanaire)', category: 'pottery-ceramics',
    price: 76000, compareAt: 89000, stock: 2, popularity: 54, daysAgo: 7,
    shortDescription: 'Hizen porcelain with a soft, jade-like celadon glaze.',
    description:
      'Celadon glazes were admired across Asia for their resemblance to jade. Made in the Hizen region of Japan, this hanaire (flower vase) was intended to hold a single, carefully chosen branch — perfect for a contemporary minimalist interior.',
    materials: 'Porcelain with celadon glaze; Hizen ware', dimensions: 'Approx. 22 cm high (illustrative)', period: 'mid-17th century', origin: 'Japan',
    provenance: `${P}presented as from a tea-ceremony collection.`,
    condition: 'Illustrative condition report: even glaze, firing flaws as made, no cracks.',
  },
  {
    key: 'korean-porcelain-jar', sku: 'AQ-PC-005', name: 'Korean Porcelain Jar with Lid', category: 'pottery-ceramics',
    price: 54000, stock: 3, popularity: 36, daysAgo: 1,
    shortDescription: 'A quietly beautiful Joseon-era porcelain jar with its original lid.',
    description:
      'Korean porcelain of the Joseon dynasty is celebrated for its restraint: soft white bodies, gentle asymmetry and understated decoration. This lidded jar brings a sense of calm to any shelf.',
    materials: 'Porcelain', dimensions: 'Approx. 15 cm high (illustrative)', period: '19th century', origin: 'Korea',
    provenance: `${P}presented as from a private collection in Delhi.`,
    condition: 'Illustrative condition report: kiln grit on the foot, small glaze skips, lid fits well.',
  },

  // ── Manuscripts & Prints ───────────────────────────────────────
  {
    key: 'book-of-hours', sku: 'AQ-MP-001', name: 'Illuminated Book of Hours', category: 'manuscripts-prints',
    price: 320000, stock: 1, featured: true, curator: true, popularity: 92, daysAgo: 50,
    shortDescription: 'Tempera, ink and gold on parchment — a private prayer book of the French Renaissance.',
    description:
      'Books of Hours were the bestsellers of the late Middle Ages: personal prayer books, often lavishly illuminated, commissioned by families who wanted beauty as well as devotion. Burnished gold and jewel-like pigments still glow on the parchment pages.\n\nReference photograph shown; listing details are illustrative.',
    materials: 'Tempera, ink and gold on parchment; leather binding', dimensions: 'Approx. 17 × 11 cm (illustrative)', period: '1518–21', origin: 'French',
    provenance: `${P}presented as from a European private library.`,
    condition: 'Illustrative condition report: some leaves trimmed, light thumbing, binding rebacked.',
  },
  {
    key: 'italian-manuscript-leaf', sku: 'AQ-MP-002', name: 'Italian Illuminated Manuscript Leaf', category: 'manuscripts-prints',
    price: 68000, compareAt: 78000, stock: 2, popularity: 49, daysAgo: 22,
    shortDescription: 'A fourteenth-century leaf with painted initial and gold — ready to frame.',
    description:
      'Single leaves allow collectors to own a fragment of medieval book art. This Italian leaf features a painted and gilded initial and finely written text, and looks superb in a museum-quality frame.',
    materials: 'Tempera, ink and gold on parchment', dimensions: 'Approx. 35 × 25 cm (illustrative)', period: '14th century', origin: 'Italian',
    provenance: `${P}presented as from a dispersed choir book.`,
    condition: 'Illustrative condition report: margins trimmed, flaking to gold in one area.',
  },
  {
    key: 'celestial-map-1515', sku: 'AQ-MP-003', name: 'Celestial Map of the Northern Sky, 1515', category: 'manuscripts-prints',
    price: 145000, stock: 1, popularity: 66, daysAgo: 35,
    shortDescription: 'A Renaissance woodcut star chart of the northern constellations.',
    description:
      'Printed in 1515, this woodcut was among the first printed star charts of the northern hemisphere, mapping the constellations as figures from classical myth. It is a meeting point of art, science and early printing.',
    materials: 'Woodcut', dimensions: 'Approx. 43 × 43 cm (illustrative)', period: '1515', origin: 'German',
    provenance: `${P}presented as from a private print collection.`,
    condition: 'Illustrative condition report: good impression, small marginal tears repaired, light toning.',
  },
  {
    key: 'map-of-alexandria', sku: 'AQ-MP-004', name: 'Hand-Coloured Map of Alexandria, 1575', category: 'manuscripts-prints',
    price: 58000, compareAt: 64000, stock: 2, popularity: 45, daysAgo: 11,
    shortDescription: 'A bird\'s-eye view of the legendary harbour city, coloured by hand.',
    description:
      'Sixteenth-century city views combined geography with storytelling. This hand-coloured etching shows Alexandria\'s harbour, walls and landmarks as Renaissance Europe imagined them.',
    materials: 'Etching, hand coloured', dimensions: 'Approx. 33 × 48 cm (illustrative)', period: '1575', origin: 'European',
    provenance: `${P}presented as from an atlas break.`,
    condition: 'Illustrative condition report: centrefold as issued, fresh colour, minor marginal soiling.',
  },
  {
    key: 'great-wave-print', sku: 'AQ-MP-005', name: 'Under the Wave off Kanagawa — Woodblock Print', category: 'manuscripts-prints',
    price: 275000, stock: 1, featured: true, popularity: 98, daysAgo: 6,
    shortDescription: 'Katsushika Hokusai\'s great wave, from Thirty-six Views of Mount Fuji.',
    description:
      'Perhaps the most recognisable image in Japanese art, Hokusai\'s great wave towers over fishing boats while Mount Fuji sits small and calm in the distance. Created around 1830–32 as a polychrome woodblock print, it has inspired artists for nearly two centuries.\n\nReference photograph shown; listing details are illustrative.',
    materials: 'Polychrome woodblock print; ink and colour on paper', dimensions: 'Approx. 26 × 38 cm (illustrative)', period: 'ca. 1830–32', origin: 'Japan',
    provenance: `${P}presented as from a private collection in Mumbai.`,
    condition: 'Illustrative condition report: good colour, light fading to the sky, small wormholes restored.',
  },

  // ── Decorative Collectibles ────────────────────────────────────
  {
    key: 'persian-astrolabe', sku: 'AQ-DC-001', name: 'Persian Planispheric Astrolabe', category: 'decorative-collectibles',
    price: 365000, compareAt: 410000, stock: 1, featured: true, curator: false, popularity: 89, daysAgo: 28,
    shortDescription: 'A brass instrument for reading the heavens, dated 1065 AH / 1654–55 CE.',
    description:
      'The astrolabe was the smartphone of the pre-modern world: a single instrument that could tell the time, find the direction of prayer and map the stars. Pierced and engraved brass plates rotate against one another in a work of art and science.',
    materials: 'Brass and steel; cast, hammered, pierced and engraved', dimensions: 'Approx. 18 cm diameter (illustrative)', period: '1654–55 CE (1065 AH)', origin: 'Iran',
    provenance: `${P}presented as from a scientific-instruments collection.`,
    condition: 'Illustrative condition report: complete with plates and rete, pin replaced, rich patina.',
  },
  {
    key: 'agate-snuff-bottle', sku: 'AQ-DC-002', name: 'Chinese Agate Snuff Bottle', category: 'decorative-collectibles',
    price: 24500, stock: 4, popularity: 51, daysAgo: 14,
    shortDescription: 'Banded murrhina agate with a coral stopper — a jewel for the hand.',
    description:
      'Snuff bottles were the miniature masterpieces of Qing China, carried and exchanged by scholars and officials. Carved from banded agate and fitted with a coral stopper, this bottle is a pleasure to hold.',
    materials: 'Murrhina agate with coral stopper', dimensions: 'Approx. 6 cm high (illustrative)', period: 'Qing dynasty', origin: 'China',
    provenance: `${P}presented as from a snuff-bottle society member's collection.`,
    condition: 'Illustrative condition report: well hollowed, tiny chip to the lip, spoon missing.',
  },
  {
    key: 'aventurine-snuff-bottle', sku: 'AQ-DC-003', name: 'Aventurine Glass Snuff Bottle', category: 'decorative-collectibles',
    price: 19500, compareAt: 23000, stock: 5, popularity: 37, daysAgo: 4,
    shortDescription: 'Glittering aventurine glass with a tourmaline stopper.',
    description:
      'Aventurine glass is shot through with copper crystals that sparkle like gold dust. Combined with a pink tourmaline stopper, this nineteenth-century bottle makes an exquisite cabinet object or gift.',
    materials: 'Aventurine glass with tourmaline stopper', dimensions: 'Approx. 6.5 cm high (illustrative)', period: '19th century', origin: 'China',
    provenance: `${P}presented as from a private collection in Singapore.`,
    condition: 'Illustrative condition report: excellent, minor wear to the foot rim.',
  },
  {
    key: 'carriage-clock', sku: 'AQ-DC-004', name: 'Brass Carriage Clock with Enamel Dial', category: 'decorative-collectibles',
    price: 48000, compareAt: 56000, stock: 0, popularity: 63, daysAgo: 19,
    shortDescription: 'A late-Victorian travelling clock in brass and bevelled glass.',
    description:
      'Carriage clocks were designed for travel, with a handle on top and glass panels to show off the movement. This brass example with an enamel dial would sit perfectly on a mantelpiece or writing desk.',
    materials: 'Brass, glass, enamel', dimensions: 'Approx. 15 cm high (illustrative)', period: 'ca. 1890', origin: 'American',
    provenance: `${P}presented as from a clock collector's estate.`,
    condition: 'Illustrative condition report: running when last checked (demo), light scratches to the case, key included.',
  },
  {
    key: 'silver-ewer-1745', sku: 'AQ-DC-005', name: 'Georgian Silver Ewer, 1745', category: 'decorative-collectibles',
    price: 158000, stock: 1, popularity: 59, daysAgo: 38,
    shortDescription: 'A graceful helmet-shaped silver ewer from the mid-eighteenth century.',
    description:
      'Silver ewers were made to pour water for hand-washing at grand dining tables, and were as much about display as function. Crisp casting and a sweeping handle give this piece real presence on a sideboard.',
    materials: 'Silver', dimensions: 'Approx. 30 cm high (illustrative)', period: '1745–46', origin: 'European',
    provenance: `${P}presented as from a private collection; hallmarks not independently verified for this demo.`,
    condition: 'Illustrative condition report: light surface scratches, no repairs noted, polished.',
  },
];

export const coupons = [
  { code: 'WELCOME10', description: '10% off your first artifact (max ₹5,000)', type: 'PERCENT' as const, value: 10, minSubtotal: 0, maxDiscount: 5_000_00 },
  { code: 'HERITAGE2000', description: '₹2,000 off orders above ₹20,000', type: 'FIXED' as const, value: 2_000_00, minSubtotal: 20_000_00 },
  { code: 'COLLECTOR15', description: '15% off orders above ₹1,00,000 (max ₹25,000)', type: 'PERCENT' as const, value: 15, minSubtotal: 1_00_000_00, maxDiscount: 25_000_00 },
  { code: 'EXPIRED50', description: 'Expired demo code (shows expiry validation)', type: 'PERCENT' as const, value: 50, minSubtotal: 0, expired: true },
];

export const demoCustomers = [
  { name: 'Aarav Mehta (Demo)', email: 'aarav.demo@example.com', phone: '+919800000001', city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
  { name: 'Diya Raman (Demo)', email: 'diya.demo@example.com', phone: '+919800000002', city: 'Chennai', state: 'Tamil Nadu', pin: '600004' },
  { name: 'Kabir Sethi (Demo)', email: 'kabir.demo@example.com', phone: '+919800000003', city: 'New Delhi', state: 'Delhi', pin: '110001' },
  { name: 'Meera Iyer (Demo)', email: 'meera.demo@example.com', phone: '+919800000004', city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
  { name: 'Rohan Das (Demo)', email: 'rohan.demo@example.com', phone: '+919800000005', city: 'Kolkata', state: 'West Bengal', pin: '700016' },
];
