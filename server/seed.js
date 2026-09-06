/**
 * seed.js — Comprehensive database seeder for LokSamadhan
 *
 * Populates a fresh database with demo users across all roles/departments
 * and realistic municipal issues demonstrating every workflow:
 *   - Unassigned / Triage pool (Submitted)
 *   - Officer assigned & triaged (Acknowledged)
 *   - Field work ongoing (In Progress)
 *   - Officer submitted proof photo (Pending Verification for Admin review)
 *   - Admin approved resolution (Resolved)
 *   - Citizen disputed resolution (Unsatisfied)
 *   - Citizen satisfied and issue finalized (Closed)
 *   - Grouped similar citizen reports (Clusters with 1 or multiple linked reports)
 *
 * Usage:  npm run seed   (or: cd server && node seed.js)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Issue = require('./models/Issue');

const SEED_PASSWORD = 'password123';

const now = new Date();
const daysAgo = (d, h = 0) => new Date(now.getTime() - (d * 24 + h) * 3600 * 1000);

async function seed() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI is not set in environment or server/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB — resetting and seeding database…\n');

  // ── 1. Clear existing data ──
  await User.deleteMany({});
  await Issue.deleteMany({});
  console.log('✓ Cleared existing users and issues collection');

  const hash = await User.hashPassword(SEED_PASSWORD);

  // ── 2. Create Users across all roles & departments with Regional Coverage ──
  const admin = await User.create({
    name: 'Admin Bora',
    email: 'admin@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'admin',
    department: 'General Administration',
  });

  // --- TEZPUR OFFICERS ---
  const officerRoads = await User.create({
    name: 'Rina Das',
    email: 'officer.roads@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Roads & Infrastructure',
    region: 'Tezpur',
  });

  const officerWater = await User.create({
    name: 'Bhaskar Nath',
    email: 'officer.water@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Water Supply & Sewage',
    region: 'Tezpur',
  });

  const officerSanitation = await User.create({
    name: 'Mira Hazarika',
    email: 'officer.sanitation@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Solid Waste Management',
    region: 'Tezpur',
  });

  // Second officer in Tezpur SWM to demonstrate load-balancing split
  const officerSanitation2 = await User.create({
    name: 'Amit Baruah',
    email: 'officer.sanitation2@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Solid Waste Management',
    region: 'Tezpur',
  });

  const officerElectricity = await User.create({
    name: 'Kalyan Saikia',
    email: 'officer.electricity@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Electricity & Lighting',
    region: 'Tezpur',
  });

  const officerDrainage = await User.create({
    name: 'Jatin Baruah',
    email: 'officer.drainage@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Public Health & Drainage',
    region: 'Tezpur',
  });

  // --- JORHAT OFFICERS ---
  const officerRoadsJorhat = await User.create({
    name: 'Pranjal Bora',
    email: 'officer.roads.jorhat@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Roads & Infrastructure',
    region: 'Jorhat',
  });

  const officerWaterJorhat = await User.create({
    name: 'Rupjyoti Sarma',
    email: 'officer.water.jorhat@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Water Supply & Sewage',
    region: 'Jorhat',
  });

  const officerSanitationJorhat = await User.create({
    name: 'Gitashree Mahanta',
    email: 'officer.sanitation.jorhat@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Solid Waste Management',
    region: 'Jorhat',
  });

  const officerElectricityJorhat = await User.create({
    name: 'Dipak Medhi',
    email: 'officer.electricity.jorhat@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Electricity & Lighting',
    region: 'Jorhat',
  });

  // --- JORHAT WEST OFFICER ---
  const officerRoadsJorhatWest = await User.create({
    name: 'Biman Saikia',
    email: 'officer.roads.jorhatwest@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Roads & Infrastructure',
    region: 'Jorhat West',
  });

  // --- SIVASAGAR OFFICERS ---
  const officerRoadsSivasagar = await User.create({
    name: 'Debojit Chutia',
    email: 'officer.roads.sivasagar@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Roads & Infrastructure',
    region: 'Sivasagar',
  });

  const officerWaterSivasagar = await User.create({
    name: 'Monoj Gogoi',
    email: 'officer.water.sivasagar@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Water Supply & Sewage',
    region: 'Sivasagar',
  });

  const officerDrainageSivasagar = await User.create({
    name: 'Ananta Dutta',
    email: 'officer.drainage.sivasagar@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Public Health & Drainage',
    region: 'Sivasagar',
  });

  const citizen1 = await User.create({
    name: 'Ankur Sharma',
    email: 'citizen1@example.com',
    passwordHash: hash,
    role: 'citizen',
  });

  const citizen2 = await User.create({
    name: 'Priya Gogoi',
    email: 'citizen2@example.com',
    passwordHash: hash,
    role: 'citizen',
  });

  const citizen3 = await User.create({
    name: 'Rahul Kalita',
    email: 'citizen3@example.com',
    passwordHash: hash,
    role: 'citizen',
  });

  console.log('✓ Created users (1 Admin, 14 Regional Officers across Tezpur, Jorhat, Jorhat West & Sivasagar, 3 Citizens)');

  // ── 3. Seed Realistic Issues ──
  // Location coordinates: Tezpur, Assam [longitude, latitude]

  // ── CLUSTER 1: Kolia Bhomora Setu (Roads) — Root + 2 Similar Reports ──
  // Showcases: Similar reports group with >1 item, demonstrating the "Show more" button!
  const roadRoot = await Issue.create({
    title: 'Deep hazardous pothole on NH-15 near Kolia Bhomora Setu approach',
    description:
      'Severe 4-foot wide pothole on the NH-15 highway approaching Kolia Bhomora Setu bridge. Deep asphalt crater with exposed ballast gravel causing heavy vehicular swerving and high accident risk for night commuters and two-wheelers.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7845, 26.6310] },
    address: 'NH-15, Kolia Bhomora Setu Approach Road, Tezpur',
    area: 'Kolia Bhomora',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    supporters: [citizen2._id, citizen3._id],
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788666904/loksamadhan/seed/pothole_nh15_root.webp',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with road hazard photographic proof', by: citizen1._id, at: daysAgo(4) },
      { status: 'Acknowledged', note: 'Assigned to Roads & Infrastructure team. Field engineer notified for bitumen hot-mix dispatch.', by: admin._id, at: daysAgo(3, 18) },
      { status: 'In Progress', note: 'Road repair team mobilized with bitumen hot-mix batch and vibratory roller compactor', by: officerRoads._id, at: daysAgo(2) },
    ],
    createdAt: daysAgo(4),
  });

  const roadYear = new Date(roadRoot.createdAt).getFullYear();
  const roadHex = String(roadRoot._id).slice(-6).toUpperCase();

  // Similar report 1 under Kolia Bhomora Setu
  await Issue.create({
    title: 'Dangerous road crater near Kolia Bhomora bridge junction',
    description:
      'Big crater-like pothole near the bridge junction. Rainwater fills it up making it invisible to passing traffic. Urgent repair needed before monsoon rains worsen it.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7849, 26.6313] }, // ~50m away
    address: 'Kolia Bhomora Bridge Junction, NH-15, Tezpur',
    area: 'Kolia Bhomora',
    region: 'Tezpur',
    reporter: citizen2._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    duplicateOf: roadRoot._id,
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667694/loksamadhan/seed/road_crater_junction.webp',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with junction crater photo', by: citizen2._id, at: daysAgo(3) },
      {
        status: 'In Progress',
        note: `Linked as similar report to #LS-${roadYear}-${roadHex}. Handled under original report by assigned officer.`,
        by: citizen2._id,
        at: daysAgo(3),
      },
    ],
    createdAt: daysAgo(3),
  });

  // Similar report 2 under Kolia Bhomora Setu
  await Issue.create({
    title: 'Huge sunken asphalt cave-in before Kolia Bhomora toll gate',
    description:
      'Vehicles are swerving dangerously into oncoming traffic to avoid this sunken asphalt patch. Heavy trucks grinding loose gravel and debris onto highway lanes.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7842, 26.6308] }, // ~40m away
    address: 'NH-15 Toll Plaza approach, Tezpur',
    area: 'Kolia Bhomora',
    region: 'Tezpur',
    reporter: citizen3._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    duplicateOf: roadRoot._id,
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667699/loksamadhan/seed/road_cavein_toll.webp',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with toll plaza approach photo', by: citizen3._id, at: daysAgo(2) },
      {
        status: 'In Progress',
        note: `Linked as similar report to #LS-${roadYear}-${roadHex}. Handled under original report by assigned officer.`,
        by: citizen3._id,
        at: daysAgo(2),
      },
    ],
    createdAt: daysAgo(2),
  });

  // ── CLUSTER 2: Hazara Pukhuri (Water) — Root + 1 Similar Report ──
  const waterRoot = await Issue.create({
    title: 'Ruptured municipal water main leaking continuously near Hazara Pukhuri',
    description:
      'Main drinking water supply pipeline has ruptured and is gushing continuously onto the pond approach road for 3 days. Severe potable water wastage, flooded lane, and pressure drop in neighboring wards.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7920, 26.6340] },
    address: 'Near Hazara Pukhuri, Tezpur',
    area: 'Hazara Pukhuri',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Water Supply & Sewage',
    assignedOfficer: officerWater._id,
    priority: 'high',
    status: 'Acknowledged',
    supporters: [citizen2._id],
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667738/loksamadhan/seed/water_burst_hazara.webp',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with burst pipe photo', by: citizen1._id, at: daysAgo(2) },
      { status: 'Acknowledged', note: 'Assigned to Water Supply team for sluice valve shutoff and cast-iron pipe joint sleeve replacement', by: officerWater._id, at: daysAgo(1, 12) },
    ],
    createdAt: daysAgo(2),
  });

  const waterYear = new Date(waterRoot.createdAt).getFullYear();
  const waterHex = String(waterRoot._id).slice(-6).toUpperCase();

  await Issue.create({
    title: 'Water supply pipe broken and flooding market lane near Hazara Pukhuri',
    description:
      'Underground main water pipe ruptured in front of commercial shops. Street is covered in drinking water, forcing pedestrians to wade through flooded asphalt.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7925, 26.6344] }, // ~65m away
    address: 'Hazara Pukhuri Road, Tezpur',
    area: 'Hazara Pukhuri',
    region: 'Tezpur',
    reporter: citizen2._id,
    department: 'Water Supply & Sewage',
    assignedOfficer: officerWater._id,
    priority: 'high',
    status: 'Acknowledged',
    duplicateOf: waterRoot._id,
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667750/loksamadhan/seed/water_leak_lane.webp',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with lane flooding photo', by: citizen2._id, at: daysAgo(1) },
      {
        status: 'Acknowledged',
        note: `Linked as similar report to #LS-${waterYear}-${waterHex}. Handled under original report by assigned officer.`,
        by: citizen2._id,
        at: daysAgo(1),
      },
    ],
    createdAt: daysAgo(1),
  });

  // ── 4. Workflow Demonstration Issues ──

  // [STATUS: PENDING VERIFICATION]
  // Officer uploaded proof photo; waiting for Admin review!
  await Issue.create({
    title: 'Hazardous open manhole missing cover on Bamuni Maidan road',
    description:
      'Large storm sewer manhole cover is completely missing on the main asphalt road near Bamuni Maidan. Extremely hazardous deep hole for pedestrians and school children. Tree branch with warning cloth inserted as a makeshift warning.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.7905, 26.6300] },
    address: 'Bamuni Maidan Road, Tezpur',
    area: 'Bamuni Maidan',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Public Health & Drainage',
    assignedOfficer: officerDrainage._id,
    priority: 'high',
    status: 'Pending Verification',
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667772/loksamadhan/seed/open_manhole_before.webp',
    ],
    resolution: {
      note: 'Procured and installed new heavy-duty reinforced ductile iron manhole frame and circular cover embossed with municipal sewerage insignia. Anchored flush with fresh bituminous asphalt paving.',
      evidence: [
        'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667775/loksamadhan/seed/open_manhole_after.webp',
      ],
      submittedBy: officerDrainage._id,
      submittedAt: daysAgo(1),
    },
    aiVerification: {
      verified: true,
      matchScore: 94,
      summary: 'AI Vision verified: The missing manhole cover has been replaced with a newly installed heavy ductile iron cover flush with asphalt. The hazard marker tree branch has been cleared.',
      confidence: 'High',
      verifiedAt: daysAgo(1),
      provider: 'groq',
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with photo of open manhole and marker branch', by: citizen1._id, at: daysAgo(3) },
      { status: 'Acknowledged', note: 'Prioritized as urgent street fall hazard', by: admin._id, at: daysAgo(2, 12) },
      { status: 'In Progress', note: 'Procured ductile iron replacement lid from central municipal depot', by: officerDrainage._id, at: daysAgo(2) },
      {
        status: 'Pending Verification',
        note: 'Installed new heavy-duty reinforced ductile iron manhole frame and cover flush with road. Submitted photographic proof for admin verification.',
        evidence: 'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667775/loksamadhan/seed/open_manhole_after.webp',
        by: officerDrainage._id,
        at: daysAgo(1),
      },
    ],
    createdAt: daysAgo(3),
  });

  // [STATUS: RESOLVED]
  // Admin reviewed and approved officer resolution evidence
  await Issue.create({
    title: 'Commercial garbage dump overflowing at Chowkidingi Market',
    description:
      'The secondary waste collection point at Chowkidingi market area has been overflowing for 5 days. Rotten vegetable refuse, plastic sacks, and cardboard attracting stray animals and creating severe stench.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.7888, 26.6360] },
    address: 'Chowkidingi Market, Tezpur',
    area: 'Chowkidingi',
    region: 'Tezpur',
    reporter: citizen2._id,
    department: 'Solid Waste Management',
    assignedOfficer: officerSanitation._id,
    priority: 'high',
    status: 'Resolved',
    supporters: [citizen1._id],
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667781/loksamadhan/seed/garbage_dump_before.webp',
    ],
    resolution: {
      note: 'Cleared all accumulated municipal waste with hydraulic compactor truck. Ground thoroughly swept and sanitized with bleaching powder. Placed two new 1100-liter wheeled bins for wet and dry segregation.',
      evidence: [
        'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667820/loksamadhan/seed/garbage_dump_after.webp',
      ],
      submittedBy: officerSanitation._id,
      submittedAt: daysAgo(2),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(1),
      adminNotes: 'Photographic resolution evidence verified by municipal administration. Sanitation cleared and bins installed.',
    },
    aiVerification: {
      verified: true,
      matchScore: 96,
      summary: 'AI Vision verified: Complete clearance of municipal waste heap. Ground sanitized with bleaching powder and two 1100L waste collection bins installed.',
      confidence: 'High',
      verifiedAt: daysAgo(2),
      provider: 'groq',
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with market dump photo', by: citizen2._id, at: daysAgo(5) },
      { status: 'Acknowledged', note: 'Assigned to Solid Waste Management division', by: admin._id, at: daysAgo(4) },
      { status: 'In Progress', note: 'Sanitation compactor vehicle scheduled for evening dispatch', by: officerSanitation._id, at: daysAgo(3) },
      {
        status: 'Pending Verification',
        note: 'Waste cleared, ground disinfected with bleaching powder, and new 1100L bins installed. Proof photo uploaded.',
        evidence: 'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667820/loksamadhan/seed/garbage_dump_after.webp',
        by: officerSanitation._id,
        at: daysAgo(2),
      },
      {
        status: 'Resolved',
        note: 'Resolution verified and approved by municipal administration.',
        by: admin._id,
        at: daysAgo(1),
      },
    ],
    createdAt: daysAgo(5),
  });

  // [STATUS: UNSATISFIED / DISPUTED]
  // Citizen reviewed resolution and flagged unsatisfactory work
  await Issue.create({
    title: 'Concrete road divider damaged at Cardboard Factory Chariali',
    description:
      'Smashed concrete median dividers at Cardboard Factory Chariali junction. Concrete rubble scattered on lane and two-wheelers making unauthorized illegal U-turns through the broken gap.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7810, 26.6328] },
    address: 'Cardboard Factory Chariali, Tezpur',
    area: 'Cardboard Factory',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'medium',
    status: 'Unsatisfied',
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667842/loksamadhan/seed/divider_damaged_before.webp',
    ],
    resolution: {
      note: 'Placed temporary water-ballast plastic barricades to block unauthorized U-turn crossing.',
      evidence: [
        'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667853/loksamadhan/seed/divider_temporary_after.webp',
      ],
      submittedBy: officerRoads._id,
      submittedAt: daysAgo(3),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(2),
    },
    citizenFeedback: {
      satisfied: false,
      notes: 'Temporary plastic barricades blew away and toppled in the thunderstorm yesterday. The gap is wide open again and concrete rubble is scattered on the driving lane. Permanent concrete casting is required.',
      submittedAt: daysAgo(1),
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with photo of smashed median', by: citizen1._id, at: daysAgo(6) },
      { status: 'Acknowledged', note: 'Assigned to Roads division', by: admin._id, at: daysAgo(5) },
      { status: 'In Progress', note: 'Field team dispatched with barricades', by: officerRoads._id, at: daysAgo(4) },
      {
        status: 'Resolved',
        note: 'Temporary plastic traffic barricades placed across median gap.',
        evidence: 'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667853/loksamadhan/seed/divider_temporary_after.webp',
        by: officerRoads._id,
        at: daysAgo(2),
      },
      {
        status: 'Unsatisfied',
        note: 'Citizen disputed resolution: temporary plastic barricades toppled; permanent concrete structure needed.',
        by: citizen1._id,
        at: daysAgo(1),
      },
    ],
    createdAt: daysAgo(6),
  });

  // [STATUS: CLOSED]
  // Citizen confirmed satisfactory resolution
  await Issue.create({
    title: 'Streetlight pole #42 dark on Mahabhairab Temple Road',
    description:
      'Streetlight pole #42 near Mahabhairab temple gate has been dark for over a week. Narrow road becomes completely pitch dark and unsafe for walkers and scooters after dusk.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7968, 26.6321] },
    address: 'Mahabhairab Temple Road, Tezpur',
    area: 'Mahabhairab',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Electricity & Lighting',
    assignedOfficer: officerElectricity._id,
    priority: 'medium',
    status: 'Closed',
    photos: [
      'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667860/loksamadhan/seed/streetlight_dark_before.webp',
    ],
    resolution: {
      note: 'Replaced failed sodium lamp with new high-efficiency 70W IP66 LED streetlight fixture and replaced tripped MCB breaker in control panel.',
      evidence: [
        'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667872/loksamadhan/seed/streetlight_bright_after.webp',
      ],
      submittedBy: officerElectricity._id,
      submittedAt: daysAgo(3),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(2),
      adminNotes: 'Confirmed LED luminaire installation and lux meter readings on roadway.',
    },
    aiVerification: {
      verified: true,
      matchScore: 98,
      summary: 'AI Vision verified: Streetlight pole #42 is fully operational with new LED luminaire brightly illuminating the residential roadway.',
      confidence: 'High',
      verifiedAt: daysAgo(3),
      provider: 'groq',
    },
    citizenFeedback: {
      satisfied: true,
      notes: 'Light is working perfectly now! The road is bright, safe, and clearly visible at night. Thank you for the swift action.',
      submittedAt: daysAgo(1),
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with photo of dark street', by: citizen1._id, at: daysAgo(7) },
      { status: 'Acknowledged', note: 'Assigned to Electricity division', by: admin._id, at: daysAgo(6) },
      { status: 'In Progress', note: 'Linesman dispatched with cherry picker truck', by: officerElectricity._id, at: daysAgo(4) },
      {
        status: 'Pending Verification',
        note: 'LED fixture replaced and tested. Proof photos submitted.',
        evidence: 'https://res.cloudinary.com/de3mpiotu/image/upload/v1788667872/loksamadhan/seed/streetlight_bright_after.webp',
        by: officerElectricity._id,
        at: daysAgo(3),
      },
      { status: 'Resolved', note: 'Verified by administration.', by: admin._id, at: daysAgo(2) },
      { status: 'Closed', note: 'Citizen confirmed satisfaction with resolution.', by: citizen1._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(7),
  });

  // [STATUS: SUBMITTED — UNASSIGNED TRIAGE QUEUE]
  // Shows up in Admin triage queue / unassigned tab
  await Issue.create({
    title: 'Broken streetlight bracket with exposed wires near Agnigarh Hill entrance',
    description:
      'The overhead lighting bracket at Agnigarh Hill parking entrance is dangling with exposed electrical wires over the pedestrian path. Sparking observed during light drizzle.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7980, 26.6265] },
    address: 'Agnigarh Hill Entrance, Tezpur',
    area: 'Agnigarh',
    region: 'Tezpur',
    reporter: citizen2._id,
    department: null,
    assignedOfficer: null,
    priority: null,
    status: 'Submitted',
    photos: [
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with photo of hanging overhead wire hazard', by: citizen2._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(1),
  });

  // [STATUS: SUBMITTED — UNASSIGNED TRIAGE QUEUE]
  await Issue.create({
    title: 'Illegal bio-waste and tree debris blocking Dekargaon bypass shoulder',
    description:
      'Large pile of decomposing organic refuse, tree cuttings, and construction debris dumped along Dekargaon bypass road shoulder. Creating sanitation hazard and obstructing vehicular lane.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.8030, 26.6290] },
    address: 'Bypass Road, Dekargaon, Tezpur',
    area: 'Dekargaon',
    region: 'Tezpur',
    reporter: citizen3._id,
    department: null,
    assignedOfficer: null,
    priority: null,
    status: 'Submitted',
    photos: [
      'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with roadside waste photo', by: citizen3._id, at: daysAgo(0, 8) },
    ],
    createdAt: daysAgo(0, 8),
  });

  // [STATUS: ACKNOWLEDGED]
  // Assigned to officer, priority set, inspection scheduled
  await Issue.create({
    title: 'Storm drain clogged with plastic waste causing street waterlogging in Dekargaon Lane 3',
    description:
      'Main roadside concrete storm drain in Dekargaon Lane 3 is clogged with plastic bottles and silt. Road gets flooded knee-deep even during mild showers.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.8045, 26.6280] },
    address: 'Dekargaon Lane 3, Tezpur',
    area: 'Dekargaon',
    region: 'Tezpur',
    reporter: citizen1._id,
    department: 'Public Health & Drainage',
    assignedOfficer: officerDrainage._id,
    priority: 'high',
    status: 'Acknowledged',
    photos: [
      'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with drainage waterlogging photo', by: citizen1._id, at: daysAgo(2) },
      { status: 'Acknowledged', note: 'Assigned to Public Health & Drainage; desilting crew alerted.', by: admin._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(2),
  });

  // [STATUS: IN PROGRESS]
  // Officer actively working on physical repair
  await Issue.create({
    title: 'Eroded bitumen and loose gravel hazard on Mission Chariali road stretch',
    description:
      'Bitumen surface layer has completely eroded on the 200m stretch connecting Mission Chariali toward Tezpur Medical College. Heavy dust and loose gravel causing skidding.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7950, 26.6370] },
    address: 'Mission Chariali Road, Tezpur',
    area: 'Mission Chariali',
    region: 'Tezpur',
    reporter: citizen2._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'medium',
    status: 'In Progress',
    photos: [
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen with road surface erosion photo', by: citizen2._id, at: daysAgo(9) },
      { status: 'Acknowledged', note: 'Surveyed by engineering division', by: officerRoads._id, at: daysAgo(6) },
      { status: 'In Progress', note: 'Road grader and leveling equipment deployed on site', by: officerRoads._id, at: daysAgo(3) },
    ],
    createdAt: daysAgo(9),
  });

  // ── JORHAT REGIONAL DEMO ISSUE ──
  await Issue.create({
    title: 'Monsoon waterlogging and blocked drainage culvert near Gar-Ali market',
    description:
      'Commercial drainage culvert on Gar-Ali road is clogged with silt and cracked. Incessant rainwater floods the commercial market street and enters shop basements.',
    category: 'Road',
    location: { type: 'Point', coordinates: [94.2167, 26.7509] },
    address: 'Gar-Ali Market Road, Jorhat',
    area: 'Gar-Ali',
    region: 'Jorhat',
    reporter: citizen1._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoadsJorhat._id,
    priority: 'high',
    status: 'In Progress',
    photos: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen in Jorhat with flooded street photo', by: citizen1._id, at: daysAgo(2) },
      { status: 'Acknowledged', note: 'Assigned to Roads & Infrastructure (Jorhat Division). A local field officer has been allotted to take action.', by: citizen1._id, at: daysAgo(2) },
      { status: 'In Progress', note: 'Jorhat Municipal engineering division initiated desilting.', by: officerRoadsJorhat._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(2),
  });

  // ── SIVASAGAR REGIONAL DEMO ISSUE ──
  await Issue.create({
    title: 'High-pressure water distribution pipe leak near historic Joysagar tank',
    description:
      'Main supply pipeline has sprung a high pressure leak. Clean water overflowing onto the public path while nearby wards face low water pressure.',
    category: 'Water',
    location: { type: 'Point', coordinates: [94.6300, 26.9800] },
    address: 'Joysagar Tank Road, Sivasagar',
    area: 'Joysagar',
    region: 'Sivasagar',
    reporter: citizen3._id,
    department: 'Water Supply & Sewage',
    assignedOfficer: officerWaterSivasagar._id,
    priority: 'medium',
    status: 'Acknowledged',
    photos: [
      'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen in Sivasagar with pipeline leak photo', by: citizen3._id, at: daysAgo(1) },
      { status: 'Acknowledged', note: 'Assigned to Water Supply & Sewage (Sivasagar Division). A local field officer has been allotted to take action.', by: citizen3._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(1),
  });

  const totalIssues = await Issue.countDocuments();
  const rootIssues = await Issue.countDocuments({ duplicateOf: null });
  const similarIssues = await Issue.countDocuments({ duplicateOf: { $ne: null } });

  console.log(`✓ Seeded ${totalIssues} issues total (${rootIssues} root issues + ${similarIssues} linked similar reports across Tezpur, Jorhat & Sivasagar)`);

  // ── Print Credentials & Demo Map ──
  console.log('\n===============================================================');
  console.log('LokSamadhan Database Seed Complete! (Password: password123)');
  console.log('===============================================================');
  console.log('Roles & Demo Logins:');
  console.log('  👑 Admin:                admin@loksamadhan.gov.in                 (General Administration)');
  console.log('  👷 Officer Roads (Tezpur): officer.roads@loksamadhan.gov.in       (Tezpur - Roads)');
  console.log('  👷 Officer Roads (Jorhat): officer.roads.jorhat@loksamadhan.gov.in (Jorhat - Roads)');
  console.log('  👷 Officer Roads (Jorhat W): officer.roads.jorhatwest@loksamadhan.gov.in (Jorhat West - Roads)');
  console.log('  👷 Officer Roads (Sivasagar): officer.roads.sivasagar@loksamadhan.gov.in (Sivasagar - Roads)');
  console.log('  💧 Officer Water (Tezpur): officer.water@loksamadhan.gov.in       (Tezpur - Water)');
  console.log('  💧 Officer Water (Jorhat): officer.water.jorhat@loksamadhan.gov.in (Jorhat - Water)');
  console.log('  💧 Officer Water (Sivasagar): officer.water.sivasagar@loksamadhan.gov.in (Sivasagar - Water)');
  console.log('  🗑️ Officer SWM 1 (Tezpur): officer.sanitation@loksamadhan.gov.in (Tezpur - SWM)');
  console.log('  🗑️ Officer SWM 2 (Tezpur): officer.sanitation2@loksamadhan.gov.in (Tezpur - SWM, Load-balance)');
  console.log('  🗑️ Officer SWM (Jorhat):   officer.sanitation.jorhat@loksamadhan.gov.in (Jorhat - SWM)');
  console.log('  ⚡ Officer Power (Tezpur): officer.electricity@loksamadhan.gov.in (Tezpur - Lighting)');
  console.log('  ⚡ Officer Power (Jorhat): officer.electricity.jorhat@loksamadhan.gov.in (Jorhat - Lighting)');
  console.log('  🚧 Officer Drain (Tezpur): officer.drainage@loksamadhan.gov.in    (Tezpur - Drainage)');
  console.log('  🚧 Officer Drain (Sivasagar): officer.drainage.sivasagar@loksamadhan.gov.in (Sivasagar - Drainage)');
  console.log('  👤 Citizen 1:             citizen1@example.com');
  console.log('  👤 Citizen 2:             citizen2@example.com');
  console.log('  👤 Citizen 3:             citizen3@example.com');
  console.log('---------------------------------------------------------------');
  console.log('Regional Auto-Assignment Features:');
  console.log('  • Region-based routing: Jorhat reports -> Jorhat Officers; Tezpur reports -> Tezpur Officers');
  console.log('  • Same Dept + Same Region Load Balancing: e.g. Tezpur SWM officers (Mira vs Amit) split work evenly');
  console.log('  • Admin Office Users Manager: Create/edit officers with district/region field');
  console.log('===============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
