import express from 'express'
const router = express.Router()
import {
  getFeatures,
  getFeatureByName,
} from '../controllers/featureController.js'

router.get('/', getFeatures)
router.get('/:name', getFeatureByName)

export default router
