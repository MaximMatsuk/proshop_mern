import fs from 'fs'
import express from 'express'
import multer from 'multer'
import asyncHandler from 'express-async-handler'
import { fileTypeFromBuffer } from 'file-type'
import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_EXT = /\.(jpe?g|png)$/i
const MAX_FILE_SIZE = 5 * 1024 * 1024

function checkFileType(file, cb) {
  if (ALLOWED_EXT.test(file.originalname) && ALLOWED_MIMES.has(file.mimetype)) {
    return cb(null, true)
  }
  cb(new Error('Images only!'))
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => checkFileType(file, cb),
})

router.post(
  '/',
  protect,
  admin,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400)
      throw new Error('No file uploaded')
    }

    const detected = await fileTypeFromBuffer(req.file.buffer)
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      res.status(400)
      throw new Error('Invalid image content')
    }

    const filename = `${req.file.fieldname}-${Date.now()}.${detected.ext}`
    const destination = `uploads/${filename}`
    await fs.promises.writeFile(destination, req.file.buffer)

    res.send(`/${destination}`)
  })
)

export default router
