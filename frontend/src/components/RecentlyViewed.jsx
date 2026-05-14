import React from 'react'
import { ProductRail } from './ProductRail'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'

const RecentlyViewed = ({ excludeId }) => {
  const enabled = useFeatureFlag('recently_viewed')
  const { items } = useRecentlyViewed()

  if (!enabled) return null
  const visible = items.filter((p) => p._id !== excludeId)
  if (visible.length === 0) return null

  return (
    <ProductRail
      id='recently-viewed'
      eyebrow='For you'
      heading='Recently viewed'
      products={visible}
      showMeta={false}
      className='pt-8'
    />
  )
}

export default RecentlyViewed
