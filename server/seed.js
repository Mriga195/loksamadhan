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

  // ── 2. Create Users across all roles & departments ──
  const admin = await User.create({
    name: 'Admin Bora',
    email: 'admin@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'admin',
    department: 'General Administration',
  });

  const officerRoads = await User.create({
    name: 'Rina Das',
    email: 'officer.roads@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Roads & Infrastructure',
  });

  const officerWater = await User.create({
    name: 'Bhaskar Nath',
    email: 'officer.water@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Water Supply & Sewage',
  });

  const officerSanitation = await User.create({
    name: 'Mira Hazarika',
    email: 'officer.sanitation@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Solid Waste Management',
  });

  const officerElectricity = await User.create({
    name: 'Kalyan Saikia',
    email: 'officer.electricity@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Electricity & Lighting',
  });

  const officerDrainage = await User.create({
    name: 'Jatin Baruah',
    email: 'officer.drainage@loksamadhan.gov.in',
    passwordHash: hash,
    role: 'officer',
    department: 'Public Health & Drainage',
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

  console.log('✓ Created 9 users (1 Admin, 5 Department Officers, 3 Citizens)');

  // ── 3. Seed Realistic Issues ──
  // Location coordinates: Tezpur, Assam [longitude, latitude]

  // ── CLUSTER 1: Kolia Bhomora Setu (Roads) — Root + 2 Similar Reports ──
  // Showcases: Similar reports group with >1 item, demonstrating the "Show more" button!
  const roadRoot = await Issue.create({
    title: 'Deep pothole on NH-15 near Kolia Bhomora Setu approach',
    description:
      'Large pothole on the main highway approaching Kolia Bhomora Setu bridge. Very dangerous for two-wheelers especially at night. Multiple accidents reported.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7845, 26.6310] },
    address: 'NH-15, Kolia Bhomora Setu Approach Road, Tezpur',
    area: 'Kolia Bhomora',
    reporter: citizen1._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    supporters: [citizen2._id, citizen3._id],
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(4) },
      { status: 'Acknowledged', note: 'Assigned to Roads & Infrastructure team', by: admin._id, at: daysAgo(3, 18) },
      { status: 'In Progress', note: 'Road repair team mobilized with bitumen hot-mix batch', by: officerRoads._id, at: daysAgo(2) },
    ],
    createdAt: daysAgo(4),
  });

  const roadYear = new Date(roadRoot.createdAt).getFullYear();
  const roadHex = String(roadRoot._id).slice(-6).toUpperCase();

  // Similar report 1 under Kolia Bhomora Setu
  await Issue.create({
    title: 'Dangerous road crater near Kolia Bhomora bridge junction',
    description:
      'Big crater-like pothole near the bridge junction. Rainwater fills it up making it invisible. Urgent repair needed before monsoon worsens it.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7849, 26.6313] }, // ~50m away
    address: 'Kolia Bhomora Bridge Junction, NH-15, Tezpur',
    area: 'Kolia Bhomora',
    reporter: citizen2._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    duplicateOf: roadRoot._id,
    photos: [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id, at: daysAgo(3) },
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
    title: 'Huge road cave-in right before Kolia Bhomora toll gate',
    description:
      'Vehicles are swerving dangerously into oncoming traffic to avoid this sunken asphalt patch. Please patch it ASAP.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7842, 26.6308] }, // ~40m away
    address: 'NH-15 Toll Plaza approach, Tezpur',
    area: 'Kolia Bhomora',
    reporter: citizen3._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'high',
    status: 'In Progress',
    duplicateOf: roadRoot._id,
    photos: [
      'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen3._id, at: daysAgo(2) },
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
    title: 'Burst water pipe leaking continuously near Hazara Pukhuri',
    description:
      'Drinking water main pipe has burst and is leaking continuously for 3 days near Hazara Pukhuri. Heavy water wastage and lane flooding.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7920, 26.6340] },
    address: 'Near Hazara Pukhuri, Tezpur',
    area: 'Hazara Pukhuri',
    reporter: citizen1._id,
    department: 'Water Supply & Sewage',
    assignedOfficer: officerWater._id,
    priority: 'high',
    status: 'Acknowledged',
    supporters: [citizen2._id],
    photos: [
      'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(2) },
      { status: 'Acknowledged', note: 'Assigned to Water Supply team for valve shutoff and pipe joint replacement', by: officerWater._id, at: daysAgo(1, 12) },
    ],
    createdAt: daysAgo(2),
  });

  const waterYear = new Date(waterRoot.createdAt).getFullYear();
  const waterHex = String(waterRoot._id).slice(-6).toUpperCase();

  await Issue.create({
    title: 'Water supply pipe broken and flooding Hazara Pukhuri road',
    description:
      'Main water pipe ruptured. Road is covered in potable drinking water and pressure has dropped in neighboring homes.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7925, 26.6344] }, // ~65m away
    address: 'Hazara Pukhuri Road, Tezpur',
    area: 'Hazara Pukhuri',
    reporter: citizen2._id,
    department: 'Water Supply & Sewage',
    assignedOfficer: officerWater._id,
    priority: 'high',
    status: 'Acknowledged',
    duplicateOf: waterRoot._id,
    photos: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id, at: daysAgo(1) },
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
      'Large storm manhole cover is completely missing on the main road near Bamuni Maidan. Extremely hazardous for pedestrians and vehicles.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.7905, 26.6300] },
    address: 'Bamuni Maidan Road, Tezpur',
    area: 'Bamuni Maidan',
    reporter: citizen1._id,
    department: 'Public Health & Drainage',
    assignedOfficer: officerDrainage._id,
    priority: 'high',
    status: 'Pending Verification',
    photos: [
      'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&auto=format&fit=crop&q=80',
    ],
    resolution: {
      note: 'Installed new heavy-duty reinforced ductile iron manhole frame and cover with anti-theft locking hinge.',
      evidence: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
      ],
      submittedBy: officerDrainage._id,
      submittedAt: daysAgo(1),
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(4) },
      { status: 'Acknowledged', note: 'Prioritized as urgent road hazard', by: admin._id, at: daysAgo(3) },
      { status: 'In Progress', note: 'Procured cast iron replacement lid from central depot', by: officerDrainage._id, at: daysAgo(2) },
      {
        status: 'Pending Verification',
        note: 'Installed new heavy-duty reinforced ductile iron manhole frame and cover. Submitted proof photos for admin review.',
        evidence: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
        by: officerDrainage._id,
        at: daysAgo(1),
      },
    ],
    createdAt: daysAgo(4),
  });

  // [STATUS: RESOLVED]
  // Admin reviewed and approved officer resolution evidence
  await Issue.create({
    title: 'Commercial garbage dump overflowing at Chowkidingi Market',
    description:
      'The secondary waste collection point at Chowkidingi market area has been overflowing for 5 days. Severe stench and stray animals spreading refuse.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.7888, 26.6360] },
    address: 'Chowkidingi Market, Tezpur',
    area: 'Chowkidingi',
    reporter: citizen2._id,
    department: 'Solid Waste Management',
    assignedOfficer: officerSanitation._id,
    priority: 'high',
    status: 'Resolved',
    supporters: [citizen1._id],
    photos: [
      'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
    ],
    resolution: {
      note: 'Cleared accumulated municipal waste with compactor truck and sanitized ground with bleaching powder. Placed two new 1100-liter wheeled bins.',
      evidence: [
        'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80',
      ],
      submittedBy: officerSanitation._id,
      submittedAt: daysAgo(2),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(1),
      adminNotes: 'Resolution photographic proof verified by municipal administration. Sanitation cleared.',
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id, at: daysAgo(5) },
      { status: 'Acknowledged', note: 'Assigned to Solid Waste Management division', by: admin._id, at: daysAgo(4) },
      { status: 'In Progress', note: 'Compactor vehicle scheduled for evening dispatch', by: officerSanitation._id, at: daysAgo(3) },
      {
        status: 'Pending Verification',
        note: 'Waste cleared and bins installed. Photographic proof uploaded.',
        evidence: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80',
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
      'Broken concrete median dividers at Cardboard Factory Chariali junction. Vehicles make illegal U-turns through the gap causing near-miss accidents daily.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7810, 26.6328] },
    address: 'Cardboard Factory Chariali, Tezpur',
    area: 'Cardboard Factory',
    reporter: citizen1._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'medium',
    status: 'Unsatisfied',
    photos: [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80',
    ],
    resolution: {
      note: 'Placed temporary plastic barricades to block unauthorized crossing.',
      evidence: [
        'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=800&auto=format&fit=crop&q=80',
      ],
      submittedBy: officerRoads._id,
      submittedAt: daysAgo(3),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(2),
    },
    citizenFeedback: {
      satisfied: false,
      notes: 'Temporary plastic barricades blew away in the rainstorm yesterday. The gap is wide open again and rubble is scattered on the driving lane.',
      submittedAt: daysAgo(1),
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(6) },
      { status: 'Acknowledged', note: 'Assigned to Roads team', by: admin._id, at: daysAgo(5) },
      { status: 'In Progress', note: 'Barricades deployed', by: officerRoads._id, at: daysAgo(4) },
      {
        status: 'Resolved',
        note: 'Temporary barricades placed at median break.',
        evidence: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=800&auto=format&fit=crop&q=80',
        by: officerRoads._id,
        at: daysAgo(2),
      },
      {
        status: 'Unsatisfied',
        note: 'Citizen reported resolution was ineffective: temporary barricades blew away.',
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
      'Streetlight pole #42 near Mahabhairab temple gate has been dark for over a week. Narrow road becomes unsafe for walkers and scooterists after dusk.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7968, 26.6321] },
    address: 'Mahabhairab Temple Road, Tezpur',
    area: 'Mahabhairab',
    reporter: citizen1._id,
    department: 'Electricity & Lighting',
    assignedOfficer: officerElectricity._id,
    priority: 'medium',
    status: 'Closed',
    photos: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
    ],
    resolution: {
      note: 'Replaced failed sodium lamp with new high-efficiency 70W LED fixture and replaced tripped MCB breaker in control panel.',
      evidence: [
        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
      ],
      submittedBy: officerElectricity._id,
      submittedAt: daysAgo(3),
      verifiedBy: admin._id,
      verifiedAt: daysAgo(2),
      adminNotes: 'Confirmed luminaire installation and lux meter readings.',
    },
    citizenFeedback: {
      satisfied: true,
      notes: 'Light is working perfectly now! The road is bright and safe again. Thank you for the swift response.',
      submittedAt: daysAgo(1),
    },
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(7) },
      { status: 'Acknowledged', note: 'Assigned to Electricity division', by: admin._id, at: daysAgo(6) },
      { status: 'In Progress', note: 'Linesman dispatched with cherry picker truck', by: officerElectricity._id, at: daysAgo(4) },
      {
        status: 'Pending Verification',
        note: 'LED fixture replaced and tested. Proof photos submitted.',
        evidence: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
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
    title: 'Broken streetlight sparking near Agnigarh Hill entrance',
    description:
      'The overhead lighting bracket at Agnigarh Hill parking entrance is dangling with exposed wires. Sparking observed during light drizzle.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7980, 26.6265] },
    address: 'Agnigarh Hill Entrance, Tezpur',
    area: 'Agnigarh',
    reporter: citizen2._id,
    department: null,
    assignedOfficer: null,
    priority: null,
    status: 'Submitted',
    photos: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(1),
  });

  // [STATUS: SUBMITTED — UNASSIGNED TRIAGE QUEUE]
  await Issue.create({
    title: 'Dead animal carcass on bypass road near Dekargaon',
    description:
      'Stray cow carcass lying near the bypass road divider for 24 hours. Creating sanitation hazard and health risk for nearby residences.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.8030, 26.6290] },
    address: 'Bypass Road, Dekargaon, Tezpur',
    area: 'Dekargaon',
    reporter: citizen3._id,
    department: null,
    assignedOfficer: null,
    priority: null,
    status: 'Submitted',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen3._id, at: daysAgo(0, 8) },
    ],
    createdAt: daysAgo(0, 8),
  });

  // [STATUS: ACKNOWLEDGED]
  // Assigned to officer, priority set, inspection scheduled
  await Issue.create({
    title: 'Storm drain clogged causing severe waterlogging at Dekargaon',
    description:
      'Main roadside storm drain in Dekargaon Lane 3 is clogged with plastic bags and silt. Street gets flooded knee-deep even during mild showers.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.8045, 26.6280] },
    address: 'Dekargaon Lane 3, Tezpur',
    area: 'Dekargaon',
    reporter: citizen1._id,
    department: 'Public Health & Drainage',
    assignedOfficer: officerDrainage._id,
    priority: 'high',
    status: 'Acknowledged',
    photos: [
      'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id, at: daysAgo(2) },
      { status: 'Acknowledged', note: 'Assigned to Public Health & Drainage; excavation crew alerted.', by: admin._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(2),
  });

  // [STATUS: IN PROGRESS]
  // Officer actively working on physical repair
  await Issue.create({
    title: 'Road surface crumbling on Mission Chariali road stretch',
    description:
      'Bitumen layer has completely eroded on the 200m stretch connecting Mission Chariali to Tezpur Medical College. Heavy dust and loose gravel causing skidding.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7950, 26.6370] },
    address: 'Mission Chariali Road, Tezpur',
    area: 'Mission Chariali',
    reporter: citizen2._id,
    department: 'Roads & Infrastructure',
    assignedOfficer: officerRoads._id,
    priority: 'medium',
    status: 'In Progress',
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    ],
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id, at: daysAgo(3) },
      { status: 'Acknowledged', note: 'Surveyed by engineering division', by: officerRoads._id, at: daysAgo(2) },
      { status: 'In Progress', note: 'Road grader and leveling equipment deployed on site', by: officerRoads._id, at: daysAgo(1) },
    ],
    createdAt: daysAgo(3),
  });

  const totalIssues = await Issue.countDocuments();
  const rootIssues = await Issue.countDocuments({ duplicateOf: null });
  const similarIssues = await Issue.countDocuments({ duplicateOf: { $ne: null } });

  console.log(`✓ Seeded ${totalIssues} issues total (${rootIssues} root issues + ${similarIssues} linked similar reports)`);

  // ── Print Credentials & Demo Map ──
  console.log('\n===============================================================');
  console.log('LokSamadhan Database Seed Complete! (Password: password123)');
  console.log('===============================================================');
  console.log('Roles & Demo Logins:');
  console.log('  👑 Admin:        admin@loksamadhan.gov.in       (General Administration)');
  console.log('  👷 Officer Roads: officer.roads@loksamadhan.gov.in   (Roads & Infrastructure)');
  console.log('  💧 Officer Water: officer.water@loksamadhan.gov.in   (Water Supply & Sewage)');
  console.log('  🗑️ Officer SWM:   officer.sanitation@loksamadhan.gov.in (Solid Waste Management)');
  console.log('  ⚡ Officer Power: officer.electricity@loksamadhan.gov.in (Electricity & Lighting)');
  console.log('  🚧 Officer Drain: officer.drainage@loksamadhan.gov.in (Public Health & Drainage)');
  console.log('  👤 Citizen 1:     citizen1@example.com');
  console.log('  👤 Citizen 2:     citizen2@example.com');
  console.log('  👤 Citizen 3:     citizen3@example.com');
  console.log('---------------------------------------------------------------');
  console.log('Featured Scenarios in Data:');
  console.log('  • Similar reports cluster: #NH-15 Kolia Bhomora (1 Root + 2 Similar Reports)');
  console.log('    -> Tests "1 shown by default + Show more (+1 more)" UI controls');
  console.log('  • Pending Verification: Bamuni Maidan open manhole (ready for Admin verify)');
  console.log('  • Resolved: Chowkidingi Market garbage (Admin verified proof attached)');
  console.log('  • Unsatisfied / Disputed: Cardboard Factory Chariali divider');
  console.log('  • Closed: Mahabhairab Streetlight #42 (Citizen confirmed satisfied)');
  console.log('  • Unassigned Triage: Agnigarh Hill & Dekargaon bypass');
  console.log('===============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
