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

    photos: [{ type: String }], // relative paths under /uploads

    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    department: { type: String, default: null },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },
    status: { type: String, enum: STATUSES, default: 'Submitted' },

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
    photos: this.photos,
    department: this.department,
    priority: this.priority,
    status: this.status,
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
