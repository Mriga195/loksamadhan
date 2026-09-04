// Photo uploads — multer parses multipart into memory, then we push to Cloudinary.
// Routes keep calling `upload.array()`, `upload.single()`, `uploadErrors`, and `photoPath`
// exactly as before; only the storage backend changed.

const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary config ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || 'loksamadhan';

// Whitelist — only these MIME types are accepted.
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;

// ── Multer: memory storage (buffer, no disk) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIMES.has(file.mimetype)
      ? cb(null, true)
      : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)),
});

// ── Multer error handler (mount right after upload middleware) ──
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each photo must be under ${MAX_BYTES / 1024 / 1024}MB.`,
  LIMIT_FILE_COUNT: `Upload at most ${MAX_FILES} photos.`,
  LIMIT_UNEXPECTED_FILE: 'Photos must be JPEG, PNG, WebP, or HEIC/HEIF.',
};

function uploadErrors(err, _req, res, next) {
  if (!(err instanceof multer.MulterError)) return next(err);
  return res.status(400).json({ error: MULTER_MESSAGES[err.code] || 'Photo upload failed.' });
}

// ── Cloudinary uploader: push buffer → Cloudinary, attach URL to file object ──
function uploadToCloud(req, _res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return next();

  const uploads = files.map(
    (file) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: FOLDER,
            resource_type: 'image',
            format: 'webp',              // auto-convert to webp for smaller size
            transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
          },
          (err, result) => {
            if (err) return reject(err);
            file.cloudinaryUrl = result.secure_url;
            resolve();
          }
        );
        stream.end(file.buffer);
      })
  );

  Promise.all(uploads).then(() => next()).catch(next);
}

// Returns the Cloudinary URL stored on the file by uploadToCloud.
const photoPath = (file) => file.cloudinaryUrl;

module.exports = { upload, uploadErrors, uploadToCloud, photoPath, MAX_BYTES, MAX_FILES };
