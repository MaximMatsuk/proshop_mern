import { useEffect, useState } from 'react'

const STORAGE_KEY = 'recentlyViewed'
const MAX_ITEMS = 6

const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* storage may be full or disabled — ignore */
  }
}

export const useRecentlyViewed = () => {
  const [items, setItems] = useState(readStorage)

  // Sync between tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(readStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const trackView = (product) => {
    if (!product || !product._id) return
    const next = [
      { _id: product._id, name: product.name, image: product.image, price: product.price },
      ...readStorage().filter((p) => p._id !== product._id),
    ].slice(0, MAX_ITEMS)
    writeStorage(next)
    setItems(next)
  }

  return { items, trackView }
}
