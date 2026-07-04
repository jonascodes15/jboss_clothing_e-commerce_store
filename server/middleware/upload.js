const multer  = require('multer');
const sharp   = require('sharp');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

exports.compressAndSave = async (req, _res, next) => {
  if (!req.files?.length && !req.file) return next();
  const files = req.files || [req.file];
  const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
  fs.mkdirSync(uploadDir, { recursive: true });
  req.savedImages = [];
  try {
    for (const file of files) {
      const filename = `${uuidv4()}.webp`;
      const destPath = path.join(uploadDir, filename);
      let quality = 82;
      let outputBuffer;
      do {
        outputBuffer = await sharp(file.buffer)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        quality -= 5;
      } while (outputBuffer.length > 100 * 1024 && quality > 10);
      fs.writeFileSync(destPath, outputBuffer);
      req.savedImages.push({ url: `/uploads/products/${filename}`, fileSize: outputBuffer.length });
    }
    next();
  } catch (err) { next(err); }
};
