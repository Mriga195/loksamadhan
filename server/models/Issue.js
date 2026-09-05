const mongoose = require('mongoose');
const { CATEGORIES, STATUSES, PRIORITIES } = require('../constants');

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, required: true },

    // GeoJSON Point — enables $geoNear for duplicate detection (Lane 4)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    address: { type: String, default: '' },
    area: { type: String, default: '' }, // neighbourhood name for easy filtering (Challenge Card)
    region: { type: String, default: 'Tezpur', trim: true },

    photos: [{ type: String }], // relative paths under /uploads

    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    department: { type: String, default: null },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },
    status: { type: String, enum: STATUSES, default: 'Submitted' },

    // Officer resolution details
    resolution: {
      note: { type: String, default: '' },
      evidence: [{ type: String }],
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      submittedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      adminNotes: { type: String, default: '' },
    },

    // AI Resolution Verification (Before vs After photo analysis)
    aiVerification: {
      verified: { type: Boolean, default: null },
      matchScore: { type: Number, default: null }, // 0 - 100
      summary: { type: String, default: '' },
      confidence: { type: String, default: null }, // 'High' | 'Medium' | 'Low'
      verifiedAt: { type: Date, default: null },
      provider: { type: String, default: null }, // 'groq' | 'heuristic'
    },

    // Citizen satisfaction & final closure feedback
    citizenFeedback: {
      satisfied: { type: Boolean, default: null },
      notes: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
    },

    // Duplicate linking — Hard Rule #1: linked, never deleted
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },

    // Citizens who "+1 / support" an existing issue
    supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Full audit trail — Hard Rule #2: resolution requires a note or evidence
    statusHistory: [
      {
        status: { type: String, enum: STATUSES, required: true },
        note: { type: String, default: '' },
        evidence: { type: String, default: '' }, // photo path
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ── Indexes ──
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ area: 1, status: 1 });
issueSchema.index({ region: 1, status: 1 });
issueSchema.index({ department: 1, status: 1 });
issueSchema.index({ title: 'text', description: 'text' });

/**
 * Public-safe projection — Hard Rule #3:
 * Reporter personal info never appears in a public response.
 * Returns supporterCount instead of the full supporters array.
 */
issueSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    title: this.title,
    description: this.description,
    category: this.category,
    location: this.location,
    address: this.address,
    area: this.area,
    region: this.region,
    photos: this.photos,
    department: this.department,
    assignedOfficer: this.assignedOfficer
      ? (this.assignedOfficer.name
          ? {
              _id: this.assignedOfficer._id,
              name: this.assignedOfficer.name,
              region: this.assignedOfficer.region || null,
              department: this.assignedOfficer.department || null,
            }
          : this.assignedOfficer)
      : null,
    priority: this.priority,
    status: this.status,
    resolution: this.resolution || null,
    aiVerification: this.aiVerification || null,
    citizenFeedback: this.citizenFeedback || null,
    duplicateOf: this.duplicateOf,
    supporterCount: this.supporters ? this.supporters.length : 0,
    statusHistory: (this.statusHistory || []).map((h) => ({
      status: h.status,
      note: h.note,
      evidence: h.evidence,
      at: h.at,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Issue', issueSchema);
