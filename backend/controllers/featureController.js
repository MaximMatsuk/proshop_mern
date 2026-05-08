import asyncHandler from 'express-async-handler'
import {
  getAllFeatures,
  getFeatureResolved,
} from '../utils/featureFlags.js'

// @desc    Get all feature flags with resolved enabled state
// @route   GET /api/features
// @access  Public
const getFeatures = asyncHandler(async (req, res) => {
  const features = await getAllFeatures()
  res.json(features)
})

// @desc    Get single feature flag by name
// @route   GET /api/features/:name
// @access  Public
const getFeatureByName = asyncHandler(async (req, res) => {
  const feature = await getFeatureResolved(req.params.name)
  if (!feature) {
    res.status(404)
    throw new Error('Feature not found')
  }
  res.json(feature)
})

export { getFeatures, getFeatureByName }
