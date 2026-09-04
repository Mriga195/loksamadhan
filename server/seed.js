/**
 * seed.js — Populates a fresh database with demo users and realistic issues.
 *
 * Usage:  cd server && node seed.js
 * Requires MONGO_URI in .env
 *
 * Creates:
 *   1 Admin, 3 Officers, 2 Citizens
 *   ~15 Issues across categories/statuses with 2 duplicate clusters
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Issue = require('./models/Issue');

const SEED_PASSWORD = 'password123';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB — seeding…');

  // ── Clear existing data ──
  await User.deleteMany({});
  await Issue.deleteMany({});
  console.log('cleared users & issues');

  const hash = await User.hashPassword(SEED_PASSWORD);

  // ── Users ──
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

  console.log('  ✓ Created 6 users (password for all: password123)');

  // ── Issues ──
  // Tezpur, Assam landmarks & coordinates
  // All coordinates: [longitude, latitude]

  const issues = [];

  // ─── CLUSTER 1: Pothole near Kolia Bhomora Setu (duplicate pair ~50m apart) ───
  issues.push({
    title: 'Deep pothole on NH-15 near Kolia Bhomora Setu approach',
    description:
      'Large pothole on the main highway approaching Kolia Bhomora Setu bridge. Very dangerous for two-wheelers especially at night. Multiple accidents reported.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7845, 26.6310] },
    address: 'NH-15, Kolia Bhomora Setu Approach Road, Tezpur',
    area: 'Kolia Bhomora',
    reporter: citizen1._id,
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen1._id }],
  });

  issues.push({
    title: 'Dangerous road crater near Kolia Bhomora bridge junction',
    description:
      'Big crater-like pothole near the bridge junction. Rainwater fills it up making it invisible. Urgent repair needed before monsoon worsens it.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7849, 26.6313] }, // ~50m away
    address: 'Kolia Bhomora Bridge Junction, NH-15, Tezpur',
    area: 'Kolia Bhomora',
    reporter: citizen2._id,
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen2._id }],
  });

  // ─── CLUSTER 2: Water pipe burst near Hazara Pukhuri (duplicate pair ~70m apart) ───
  issues.push({
    title: 'Burst water pipe leaking continuously near Hazara Pukhuri',
    description:
      'Drinking water pipe has burst and is leaking continuously for the last 3 days near Hazara Pukhuri. Water wastage and road flooding.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7920, 26.6340] },
    address: 'Near Hazara Pukhuri, Tezpur',
    area: 'Hazara Pukhuri',
    reporter: citizen1._id,
    status: 'Acknowledged',
    department: 'Water Supply & Sewage',
    priority: 'high',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id },
      { status: 'Acknowledged', note: 'Assigned to Water Supply team', by: officerWater._id },
    ],
  });

  issues.push({
    title: 'Water supply pipe broken near Hazara Pukhuri road',
    description:
      'Main water supply pipe is broken and leaking on the road. Causing waterlogging and wasting drinking water. Please fix urgently.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7925, 26.6344] }, // ~70m away
    address: 'Hazara Pukhuri Road, Tezpur',
    area: 'Hazara Pukhuri',
    reporter: citizen2._id,
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen2._id }],
  });

  // ─── Individual issues across categories/statuses/areas ───

  issues.push({
    title: 'Streetlight not working on Mahabhairab Road',
    description:
      'Streetlight pole #42 on Mahabhairab Temple Road has not been working for a week. Very dark and unsafe for pedestrians at night.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7968, 26.6321] },
    address: 'Mahabhairab Road, Tezpur',
    area: 'Mahabhairab',
    reporter: citizen1._id,
    status: 'In Progress',
    department: 'Electricity & Lighting',
    priority: 'medium',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id },
      { status: 'Acknowledged', note: 'Assigned to Electricity dept', by: admin._id },
      { status: 'In Progress', note: 'Electrician dispatched to fix pole #42', by: admin._id },
    ],
  });

  issues.push({
    title: 'Garbage dump overflowing at Chowkidingi Market',
    description:
      'The community dustbin at Chowkidingi market area has been overflowing for 5 days. Terrible smell and flies everywhere. Health hazard.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.7888, 26.6360] },
    address: 'Chowkidingi Market, Tezpur',
    area: 'Chowkidingi',
    reporter: citizen2._id,
    status: 'Resolved',
    department: 'Solid Waste Management',
    priority: 'high',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id },
      { status: 'Acknowledged', note: 'Forwarded to SWM team', by: admin._id },
      { status: 'In Progress', note: 'Cleaning crew dispatched', by: officerSanitation._id },
      {
        status: 'Resolved',
        note: 'Area cleaned and extra dustbin installed. Regular pickup scheduled.',
        by: officerSanitation._id,
      },
    ],
  });

  issues.push({
    title: 'Drainage blocked causing waterlogging at Dekargaon',
    description:
      'Storm drain near Dekargaon residential area is completely blocked with debris. During rain the entire lane gets flooded knee-deep.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.8030, 26.6290] },
    address: 'Dekargaon Lane 3, Tezpur',
    area: 'Dekargaon',
    reporter: citizen1._id,
    status: 'Acknowledged',
    department: 'Public Health & Drainage',
    priority: 'medium',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id },
      { status: 'Acknowledged', note: 'Inspection scheduled', by: admin._id },
    ],
  });

  issues.push({
    title: 'Road surface damaged on Mission Chariali road',
    description:
      'The entire stretch of Mission Chariali to Tezpur Medical College road has badly damaged surface with multiple potholes. Very bumpy ride.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7950, 26.6370] },
    address: 'Mission Chariali Road, Tezpur',
    area: 'Mission Chariali',
    reporter: citizen2._id,
    status: 'In Progress',
    department: 'Roads & Infrastructure',
    priority: 'high',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id },
      { status: 'Acknowledged', note: 'Survey team sent', by: officerRoads._id },
      { status: 'In Progress', note: 'Patching work started on worst sections', by: officerRoads._id },
    ],
  });

  issues.push({
    title: 'No water supply for 2 days in Bhairabi area',
    description:
      'Our entire Bhairabi neighbourhood has had no tap water for 2 days. Multiple families affected. No prior notice was given.',
    category: 'Water',
    location: { type: 'Point', coordinates: [92.7870, 26.6385] },
    address: 'Bhairabi Residential Area, Tezpur',
    area: 'Bhairabi',
    reporter: citizen1._id,
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen1._id }],
  });

  issues.push({
    title: 'Broken streetlight near Agnigarh Hill entrance',
    description:
      'The main streetlight at the Agnigarh Hill parking area entrance is broken and hanging dangerously. Risk of electric shock.',
    category: 'Streetlight',
    location: { type: 'Point', coordinates: [92.7980, 26.6265] },
    address: 'Agnigarh Hill Entrance, Tezpur',
    area: 'Agnigarh',
    reporter: citizen2._id,
    status: 'Submitted',
    department: 'Electricity & Lighting',
    priority: 'high',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen2._id }],
  });

  issues.push({
    title: 'Open manhole cover missing on Bamuni Maidan road',
    description:
      'Manhole cover is missing on the main road near Bamuni Maidan. Extremely dangerous — a child almost fell in yesterday. Needs immediate barricade.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.7905, 26.6300] },
    address: 'Bamuni Maidan Road, Tezpur',
    area: 'Bamuni Maidan',
    reporter: citizen1._id,
    status: 'Acknowledged',
    department: 'Public Health & Drainage',
    priority: 'high',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id },
      { status: 'Acknowledged', note: 'Emergency barricade requested', by: admin._id },
    ],
  });

  issues.push({
    title: 'Garbage not collected for a week in Ketekibari',
    description:
      'Household garbage has not been collected for over a week in Ketekibari Lane 2. Stray dogs are scattering the waste everywhere.',
    category: 'Sanitation',
    location: { type: 'Point', coordinates: [92.7835, 26.6355] },
    address: 'Ketekibari Lane 2, Tezpur',
    area: 'Ketekibari',
    reporter: citizen2._id,
    status: 'In Progress',
    department: 'Solid Waste Management',
    priority: 'medium',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen2._id },
      { status: 'Acknowledged', note: 'Notified SWM department', by: admin._id },
      { status: 'In Progress', note: 'Collection truck scheduled for tomorrow', by: officerSanitation._id },
    ],
  });

  issues.push({
    title: 'Road divider broken at Cardboard Factory Chariali',
    description:
      'Concrete road divider is broken at Cardboard Factory Chariali junction. Vehicles are crossing from wrong side causing near-miss accidents daily.',
    category: 'Road',
    location: { type: 'Point', coordinates: [92.7810, 26.6328] },
    address: 'Cardboard Factory Chariali, Tezpur',
    area: 'Cardboard Factory',
    reporter: citizen1._id,
    status: 'Resolved',
    department: 'Roads & Infrastructure',
    priority: 'medium',
    statusHistory: [
      { status: 'Submitted', note: 'Reported by citizen', by: citizen1._id },
      { status: 'Acknowledged', note: 'Forwarded to Roads dept', by: admin._id },
      { status: 'In Progress', note: 'Repair crew assigned', by: officerRoads._id },
      {
        status: 'Resolved',
        note: 'Divider repaired and reflectors installed for night visibility.',
        by: officerRoads._id,
      },
    ],
  });

  issues.push({
    title: 'Overflowing drain at Panitola area after heavy rain',
    description:
      'The main drain near Panitola market overflows every time there is heavy rain. Dirty water enters nearby houses. Needs widening or cleaning.',
    category: 'Drainage',
    location: { type: 'Point', coordinates: [92.7960, 26.6400] },
    address: 'Panitola Market Area, Tezpur',
    area: 'Panitola',
    reporter: citizen2._id,
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', note: 'Reported by citizen', by: citizen2._id }],
  });

  await Issue.insertMany(issues);
  console.log(`  ✓ Created ${issues.length} issues (2 duplicate clusters included)`);

  // ── Summary ──
  console.log('\nSeed complete! Login credentials (all use password: password123):');
  console.log('   Admin:    admin@loksamadhan.gov.in');
  console.log('   Officer:  officer.roads@loksamadhan.gov.in');
  console.log('   Officer:  officer.water@loksamadhan.gov.in');
  console.log('   Officer:  officer.sanitation@loksamadhan.gov.in');
  console.log('   Citizen:  citizen1@example.com');
  console.log('   Citizen:  citizen2@example.com');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
