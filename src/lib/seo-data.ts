// SEO data for programmatic service+city landing pages

export interface SeoCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  shortDescription: string;
  faqs: { question: string; answer: string }[];
}

export interface SeoCity {
  slug: string;
  name: string;
  state: string;
  stateAbbr: string;
}

export const SEO_CATEGORIES: SeoCategory[] = [
  {
    slug: "plumbing",
    name: "Plumbing",
    icon: "🔧",
    shortDescription: "Licensed plumbers for repairs, installations, and emergencies",
    description:
      "From leaky faucets and clogged drains to full bathroom remodels and water heater replacements, our verified plumbing professionals handle every job with skill and transparency. Post your plumbing project and receive competitive bids from local pros.",
    faqs: [
      { question: "How much does a plumber cost on average?", answer: "Plumbing costs vary by project. Minor repairs like fixing a leaky faucet typically range from $100-$300, while larger projects like water heater replacement can run $800-$2,500. Post your job on Trovaar to get competitive bids from local plumbers and find the best price." },
      { question: "How quickly can I get a plumber?", answer: "Many plumbers on Trovaar respond to job postings within hours. For emergencies like burst pipes or sewage backups, mark your job as urgent and you can often get same-day service from available pros in your area." },
      { question: "Do I need a licensed plumber?", answer: "For major plumbing work like new pipe installations, gas line work, or sewer connections, a licensed plumber is typically required by local building codes. Trovaar helps you find verified, licensed professionals for any plumbing project." },
      { question: "What plumbing services can I find on Trovaar?", answer: "Trovaar connects you with plumbers for drain cleaning, pipe repair, water heater installation, garbage disposal replacement, toilet repair, sump pump installation, bathroom and kitchen plumbing, and much more." },
      { question: "How does Trovaar protect me when hiring a plumber?", answer: "Trovaar offers escrow payment protection, verified contractor profiles with reviews, and a satisfaction guarantee. Your payment is held securely until the work is completed to your satisfaction." },
    ],
  },
  {
    slug: "electrical",
    name: "Electrical",
    icon: "⚡",
    shortDescription: "Certified electricians for wiring, panels, and installations",
    description:
      "Whether you need a ceiling fan installed, an electrical panel upgraded, or whole-home rewiring, our network of certified electricians delivers safe, code-compliant work. Get multiple bids and hire with confidence through Trovaar.",
    faqs: [
      { question: "How much does an electrician charge per hour?", answer: "Electrician rates vary by region and complexity. Most charge between $50-$100 per hour for standard work, with master electricians charging more for complex jobs. Post on Trovaar to get flat-rate bids from multiple electricians." },
      { question: "When should I call an electrician?", answer: "Call an electrician for flickering lights, tripping breakers, warm outlets, buzzing sounds from switches, or any time you need new wiring or outlets installed. Electrical work can be dangerous and should be handled by a professional." },
      { question: "What electrical work requires a permit?", answer: "Most jurisdictions require permits for new circuits, panel upgrades, major rewiring, and outdoor electrical work. Your Trovaar electrician can advise you on local permit requirements." },
      { question: "Can I find an emergency electrician on Trovaar?", answer: "Yes. Mark your posting as emergency priority and available electricians in your area will be notified immediately. Many pros on Trovaar offer after-hours and weekend availability." },
    ],
  },
  {
    slug: "hvac",
    name: "HVAC",
    icon: "❄️",
    shortDescription: "Heating, ventilation, and air conditioning experts",
    description:
      "Keep your home comfortable year-round with trusted HVAC technicians. From AC repairs and furnace installations to duct cleaning and smart thermostat setup, Trovaar connects you with experienced heating and cooling professionals at competitive prices.",
    faqs: [
      { question: "How much does HVAC repair cost?", answer: "Simple HVAC repairs like capacitor replacement cost $150-$400, while major repairs like compressor replacement can run $1,000-$2,500. New system installations range from $3,500-$12,000. Get exact quotes by posting your HVAC job on Trovaar." },
      { question: "How often should I service my HVAC system?", answer: "HVAC systems should be serviced at least once a year, ideally before summer for AC and before winter for heating. Regular maintenance prevents breakdowns and extends equipment life." },
      { question: "Should I repair or replace my HVAC system?", answer: "If your system is over 10-15 years old, requires frequent repairs, or your energy bills are rising, replacement may be more cost-effective. Post on Trovaar to get opinions and quotes from multiple HVAC pros." },
      { question: "What is included in an HVAC tune-up?", answer: "A standard tune-up includes inspecting electrical connections, cleaning coils, checking refrigerant levels, lubricating moving parts, testing thermostat calibration, and inspecting ductwork for leaks." },
    ],
  },
  {
    slug: "painting",
    name: "Painting",
    icon: "🎨",
    shortDescription: "Interior and exterior painters for homes and businesses",
    description:
      "Transform your space with professional painters who deliver flawless results. Whether it's a single room refresh, a full exterior repaint, or specialty finishes, Trovaar helps you find skilled painters at great prices with escrow protection.",
    faqs: [
      { question: "How much does it cost to paint a room?", answer: "Painting a standard room costs $200-$800 depending on size, prep work needed, and paint quality. Whole-house interior painting typically runs $2,000-$6,000. Get accurate bids from local painters on Trovaar." },
      { question: "How long does it take to paint a house?", answer: "Interior painting of a typical home takes 2-5 days, while exterior painting takes 3-7 days depending on size, surface condition, and weather. Your Trovaar painter will provide a timeline with their bid." },
      { question: "Should I paint the interior or exterior first?", answer: "Either order works, but many contractors recommend exterior first since weather can limit painting windows. Interior painting can be done year-round regardless of weather conditions." },
      { question: "Do painters on Trovaar provide paint?", answer: "Most painters include paint and materials in their bids. Some may offer discounts if you supply the paint. When posting your job, specify your preferences and painters will adjust their bids accordingly." },
    ],
  },
  {
    slug: "carpentry",
    name: "Carpentry",
    icon: "🪚",
    shortDescription: "Skilled carpenters for custom builds, repairs, and renovations",
    description:
      "From custom cabinetry and trim work to structural framing and deck building, Trovaar connects you with talented carpenters who bring craftsmanship to every project. Post your carpentry job and compare bids from verified professionals.",
    faqs: [
      { question: "What does a carpenter charge per hour?", answer: "Carpenter rates typically range from $40-$90 per hour depending on skill level and project complexity. Custom furniture and fine woodworking specialists may charge more. Post on Trovaar for competitive flat-rate bids." },
      { question: "What types of carpentry work can I hire for?", answer: "Trovaar carpenters handle trim and molding, custom shelving, cabinet installation, door and window framing, deck building, stair construction, structural repairs, furniture building, and more." },
      { question: "How do I choose between a carpenter and a handyman?", answer: "For specialized woodworking, structural modifications, or custom builds, hire a carpenter. For small fixes like tightening loose railings or patching trim, a handyman may be more cost-effective." },
      { question: "Do carpenters need a license?", answer: "Licensing requirements vary by state and scope of work. Structural work typically requires a licensed contractor. Trovaar shows each contractor's credentials and license status on their profile." },
    ],
  },
  {
    slug: "roofing",
    name: "Roofing",
    icon: "🏠",
    shortDescription: "Professional roofers for repairs, replacements, and inspections",
    description:
      "Protect your biggest investment with expert roofing services. Whether you need a minor leak repair, storm damage restoration, or a complete roof replacement, Trovaar connects you with insured roofing professionals who deliver quality work.",
    faqs: [
      { question: "How much does a new roof cost?", answer: "A new asphalt shingle roof for a typical home costs $5,000-$15,000 depending on size and materials. Metal roofing runs $10,000-$25,000. Tile and slate are premium options costing $15,000-$45,000. Get accurate quotes on Trovaar." },
      { question: "How do I know if I need a new roof?", answer: "Signs you need a new roof include missing or curling shingles, granules in gutters, daylight through the attic, sagging roof deck, and a roof older than 20-25 years. Post a roof inspection job on Trovaar for a professional assessment." },
      { question: "Does insurance cover roof replacement?", answer: "Homeowner's insurance typically covers roof damage from storms, hail, and fallen trees. Normal wear and tear is usually not covered. Your Trovaar roofer can help document damage for insurance claims." },
      { question: "How long does a roof replacement take?", answer: "Most residential roof replacements take 1-3 days depending on size, complexity, and weather. Your Trovaar roofer will provide a specific timeline when bidding on your project." },
    ],
  },
  {
    slug: "landscaping",
    name: "Landscaping",
    icon: "🌿",
    shortDescription: "Landscape design, lawn care, and outdoor transformations",
    description:
      "Create the outdoor space of your dreams with professional landscapers. From regular lawn maintenance and garden design to hardscaping and irrigation systems, Trovaar helps you find skilled landscaping professionals who deliver beautiful results.",
    faqs: [
      { question: "How much does landscaping cost?", answer: "Basic lawn care starts at $30-$80 per visit. Landscape design and installation projects range from $1,500-$15,000+ depending on scope. Post your project on Trovaar to receive competitive bids from local landscapers." },
      { question: "What is the best time to start a landscaping project?", answer: "Spring and fall are ideal for most landscaping projects. Spring is great for planting and new installations, while fall is perfect for tree planting and lawn renovation. Some projects can be planned during winter for spring execution." },
      { question: "Do landscapers handle hardscaping?", answer: "Many landscapers offer both softscaping (plants, grass, mulch) and hardscaping (patios, retaining walls, walkways). Specify your needs when posting on Trovaar and you'll receive bids from qualified pros." },
      { question: "How often should I schedule lawn maintenance?", answer: "During the growing season, lawns typically need weekly mowing, monthly fertilization, and seasonal aeration. Your Trovaar landscaper can create a custom maintenance plan for your property." },
    ],
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    icon: "✨",
    shortDescription: "Residential and commercial cleaning professionals",
    description:
      "Find reliable, thorough cleaning professionals for your home or business. From regular housekeeping and deep cleaning to move-in/move-out cleaning and post-construction cleanup, Trovaar connects you with trusted cleaners at competitive rates.",
    faqs: [
      { question: "How much does house cleaning cost?", answer: "Standard house cleaning costs $100-$250 per visit for an average home. Deep cleaning runs $200-$500. Prices vary by home size, condition, and frequency. Post on Trovaar to get exact quotes from local cleaners." },
      { question: "What is included in a deep cleaning?", answer: "Deep cleaning goes beyond regular cleaning to include baseboards, inside appliances, window sills, light fixtures, behind furniture, grout scrubbing, and detailed bathroom and kitchen sanitization." },
      { question: "How often should I have my house professionally cleaned?", answer: "Most homeowners benefit from weekly or bi-weekly cleaning. Busy families or pet owners may prefer weekly, while couples or small households often find bi-weekly sufficient." },
      { question: "Are cleaning products included?", answer: "Most professional cleaners on Trovaar bring their own supplies and cleaning products. Some offer eco-friendly or allergen-free options. Check the cleaner's profile or ask when reviewing bids." },
    ],
  },
  {
    slug: "handyman",
    name: "Handyman",
    icon: "🛠️",
    shortDescription: "Versatile handymen for repairs, installations, and odd jobs",
    description:
      "Need a jack-of-all-trades? Trovaar handymen tackle a wide range of home repairs and improvements, from mounting TVs and assembling furniture to fixing drywall, installing fixtures, and completing your honey-do list efficiently and affordably.",
    faqs: [
      { question: "How much does a handyman cost?", answer: "Handyman services typically cost $50-$100 per hour, with many jobs quoted at a flat rate. Small tasks like hanging shelves may cost $75-$150, while larger projects like fence repairs can run $200-$500. Get bids on Trovaar." },
      { question: "What jobs can a handyman do?", answer: "Handymen handle a wide range of tasks: furniture assembly, TV mounting, drywall patching, minor plumbing and electrical, painting touch-ups, door adjustments, weather stripping, caulking, shelf installation, and general home repairs." },
      { question: "When should I hire a handyman vs. a specialist?", answer: "Hire a handyman for small to medium general repairs and installations. For specialized work like major electrical, plumbing, or structural projects, a licensed specialist is recommended for safety and code compliance." },
      { question: "Can I hire a handyman for multiple tasks at once?", answer: "Absolutely! Many homeowners create a list of small jobs and hire a handyman for a half or full day to knock them all out. This is often more cost-effective than separate service calls." },
    ],
  },
  {
    slug: "fencing",
    name: "Fencing",
    icon: "🏗️",
    shortDescription: "Fence installation, repair, and replacement services",
    description:
      "Enhance your property's privacy, security, and curb appeal with professional fencing services. From wood and vinyl privacy fences to chain link, aluminum, and ornamental iron, Trovaar connects you with experienced fence builders for any project.",
    faqs: [
      { question: "How much does a new fence cost?", answer: "Fence costs vary by material and length. Wood privacy fencing runs $15-$35 per linear foot installed. Vinyl costs $20-$40, chain link $10-$20, and aluminum $25-$55 per foot. Post your project on Trovaar for accurate bids." },
      { question: "What type of fence is best for privacy?", answer: "Wood and vinyl fences at 6 feet tall provide the best privacy. Board-on-board and shadowbox styles are popular choices. Your Trovaar fencing professional can recommend the best option for your property and budget." },
      { question: "Do I need a permit to build a fence?", answer: "Most municipalities require a fence permit, especially for fences over 4 feet tall. Your Trovaar contractor can help you understand local requirements and HOA restrictions before starting work." },
      { question: "How long does a fence last?", answer: "Treated wood fences last 10-15 years, vinyl 20-30 years, aluminum 20+ years, and wrought iron 50+ years with proper maintenance. Material choice depends on your budget, aesthetic preferences, and maintenance willingness." },
    ],
  },
  {
    slug: "appliance-repair",
    name: "Appliance Repair",
    icon: "🔌",
    shortDescription: "Expert repair for all major household appliances",
    description:
      "Don't replace what you can repair. Trovaar connects you with skilled appliance repair technicians who can fix refrigerators, washers, dryers, dishwashers, ovens, and more. Save money with competitive bids and get your appliances running again fast.",
    faqs: [
      { question: "How much does appliance repair cost?", answer: "Most appliance repairs cost $100-$400 including parts and labor. Refrigerator repairs average $200-$400, washer/dryer repairs $150-$350, and dishwasher repairs $100-$300. Get exact quotes by posting on Trovaar." },
      { question: "Is it worth repairing an old appliance?", answer: "As a general rule, if the repair costs less than 50% of replacement and the appliance is less than 75% through its expected lifespan, repair is worthwhile. Your Trovaar technician can advise on the best option." },
      { question: "How quickly can I get an appliance repaired?", answer: "Many appliance repair technicians on Trovaar offer same-day or next-day service. Mark your posting as urgent for faster responses. Common repairs can often be completed in a single visit." },
      { question: "What brands do Trovaar technicians repair?", answer: "Our network includes technicians experienced with all major brands including Samsung, LG, Whirlpool, GE, Maytag, Bosch, KitchenAid, Frigidaire, and more. Mention your brand when posting for the best match." },
    ],
  },
  {
    slug: "flooring",
    name: "Flooring",
    icon: "🪵",
    shortDescription: "Flooring installation, refinishing, and repair services",
    description:
      "Upgrade your floors with professional installation and finishing services. From hardwood and laminate to tile, vinyl, and carpet, Trovaar connects you with skilled flooring installers who deliver beautiful, durable results at competitive prices.",
    faqs: [
      { question: "How much does flooring installation cost?", answer: "Flooring costs vary by material: laminate $3-$8/sq ft installed, hardwood $6-$18/sq ft, tile $7-$15/sq ft, vinyl plank $4-$10/sq ft, and carpet $3-$11/sq ft. Post your project on Trovaar for exact quotes." },
      { question: "What type of flooring is best for my home?", answer: "The best flooring depends on the room, traffic level, and your budget. Tile is great for bathrooms and kitchens, hardwood for living areas, carpet for bedrooms, and luxury vinyl plank for versatile whole-home use." },
      { question: "How long does flooring installation take?", answer: "A single room can be completed in 1-2 days. Whole-house flooring typically takes 3-7 days depending on the material and subfloor preparation needed. Your Trovaar installer will provide a timeline with their bid." },
      { question: "Should I refinish or replace my hardwood floors?", answer: "If your hardwood floors have surface scratches and wear but are structurally sound, refinishing ($3-$8/sq ft) is much cheaper than replacement. Deep damage, warping, or water damage may require replacement." },
    ],
  },
];

export const SEO_CITIES: SeoCity[] = [
  { slug: "new-york", name: "New York", state: "New York", stateAbbr: "NY" },
  { slug: "los-angeles", name: "Los Angeles", state: "California", stateAbbr: "CA" },
  { slug: "chicago", name: "Chicago", state: "Illinois", stateAbbr: "IL" },
  { slug: "houston", name: "Houston", state: "Texas", stateAbbr: "TX" },
  { slug: "phoenix", name: "Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { slug: "philadelphia", name: "Philadelphia", state: "Pennsylvania", stateAbbr: "PA" },
  { slug: "san-antonio", name: "San Antonio", state: "Texas", stateAbbr: "TX" },
  { slug: "san-diego", name: "San Diego", state: "California", stateAbbr: "CA" },
  { slug: "dallas", name: "Dallas", state: "Texas", stateAbbr: "TX" },
  { slug: "austin", name: "Austin", state: "Texas", stateAbbr: "TX" },
  { slug: "jacksonville", name: "Jacksonville", state: "Florida", stateAbbr: "FL" },
  { slug: "san-jose", name: "San Jose", state: "California", stateAbbr: "CA" },
  { slug: "fort-worth", name: "Fort Worth", state: "Texas", stateAbbr: "TX" },
  { slug: "columbus", name: "Columbus", state: "Ohio", stateAbbr: "OH" },
  { slug: "charlotte", name: "Charlotte", state: "North Carolina", stateAbbr: "NC" },
  { slug: "indianapolis", name: "Indianapolis", state: "Indiana", stateAbbr: "IN" },
  { slug: "san-francisco", name: "San Francisco", state: "California", stateAbbr: "CA" },
  { slug: "seattle", name: "Seattle", state: "Washington", stateAbbr: "WA" },
  { slug: "denver", name: "Denver", state: "Colorado", stateAbbr: "CO" },
  { slug: "nashville", name: "Nashville", state: "Tennessee", stateAbbr: "TN" },
  { slug: "oklahoma-city", name: "Oklahoma City", state: "Oklahoma", stateAbbr: "OK" },
  { slug: "portland", name: "Portland", state: "Oregon", stateAbbr: "OR" },
  { slug: "las-vegas", name: "Las Vegas", state: "Nevada", stateAbbr: "NV" },
  { slug: "memphis", name: "Memphis", state: "Tennessee", stateAbbr: "TN" },
  { slug: "louisville", name: "Louisville", state: "Kentucky", stateAbbr: "KY" },
  { slug: "baltimore", name: "Baltimore", state: "Maryland", stateAbbr: "MD" },
  { slug: "milwaukee", name: "Milwaukee", state: "Wisconsin", stateAbbr: "WI" },
  { slug: "albuquerque", name: "Albuquerque", state: "New Mexico", stateAbbr: "NM" },
  { slug: "tucson", name: "Tucson", state: "Arizona", stateAbbr: "AZ" },
  { slug: "sacramento", name: "Sacramento", state: "California", stateAbbr: "CA" },
];

export function getCategoryBySlug(slug: string): SeoCategory | undefined {
  return SEO_CATEGORIES.find((c) => c.slug === slug);
}

export function getCityBySlug(slug: string): SeoCity | undefined {
  return SEO_CITIES.find((c) => c.slug === slug);
}
