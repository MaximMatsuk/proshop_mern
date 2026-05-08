import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FEATURES_PATH = path.resolve(__dirname, '../../config/features.json')
const TTL_MS = 5000

let cache = { data: null, loadedAt: 0 }

const readFromDisk = async () => {
  try {
    const raw = await readFile(FEATURES_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error(
      `[featureFlags] failed to read ${FEATURES_PATH}: ${err.message}`
    )
    return null
  }
}

const ensureCache = async () => {
  const now = Date.now()
  if (cache.data && now - cache.loadedAt < TTL_MS) {
    return cache.data
  }
  const fresh = await readFromDisk()
  if (fresh) {
    cache = { data: fresh, loadedAt: now }
    return fresh
  }
  // Fail closed: если данных нет вовсе — пустой объект
  if (!cache.data) {
    cache = { data: {}, loadedAt: now }
  }
  return cache.data
}

export const getFeature = async (name) => {
  const features = await ensureCache()
  return features[name] ?? null
}

const resolveEnabled = (name, features, visited) => {
  if (visited.has(name)) {
    console.warn(`[featureFlags] cycle detected at '${name}'`)
    return false
  }
  visited.add(name)

  const feature = features[name]
  if (!feature) return false
  if (feature.status === 'Disabled') return false

  const deps = feature.dependencies ?? []
  for (const dep of deps) {
    if (!resolveEnabled(dep, features, visited)) return false
  }
  // status ∈ {Testing, Enabled} → on
  // traffic_percentage и targeted_segments игнорируются (стаб)
  // TODO Phase X: implement traffic rollout / segment targeting
  return true
}

export const isFeatureEnabled = async (name) => {
  const features = await ensureCache()
  return resolveEnabled(name, features, new Set())
}

export const getAllFeatures = async () => {
  const features = await ensureCache()
  return Object.entries(features).map(([name, feature]) => ({
    name,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }))
}

export const getFeatureResolved = async (name) => {
  const features = await ensureCache()
  const feature = features[name]
  if (!feature) return null
  return {
    name,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }
}
