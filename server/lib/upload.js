// Photo uploads for POST /api/issues. Disk storage into server/uploads/, served static by app.js.
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Whitelist, never a blacklist. The extension comes from THIS map, never from the client's
// filename: path.extname('evil.jpg.js') is '.js', and the file lands in a statically served
// directory. Untrusted input decides nothing about the name on disk.
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) =>
    EXT_BY_MIME[file.mimetype]
      ? cb(null, true)
      : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)),
});

// Multer throws for oversized/too many/wrong-type files. Left alone those reach the global
// handler as a 500; lanes 3 and 4 render `error` verbatim, so give the user something readable.
// Mount this immediately after the upload middleware on any route that accepts files.
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each photo must be under ${MAX_BYTES / 1024 / 1024}MB.`,
  LIMIT_FILE_COUNT: `Upload at most ${MAX_FILES} photos.`,
  LIMIT_UNEXPECTED_FILE: 'Photos must be JPEG, PNG, or WebP.',
};

function uploadErrors(err, _req, res, next) {
  if (!(err instanceof multer.MulterError)) return next(err);
  return res.status(400).json({ error: MULTER_MESSAGES[err.code] || 'Photo upload failed.' });
}

// Path stored in the document — never an absolute filesystem path.
const photoPath = file => `/uploads/${file.filename}`;

module.exports = { upload, uploadErrors, photoPath, MAX_BYTES, MAX_FILES };
