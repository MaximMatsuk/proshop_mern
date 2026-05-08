import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from 'react-bootstrap'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'

const RecentlyViewed = ({ excludeId }) => {
  const enabled = useFeatureFlag('recently_viewed')
  const { items } = useRecentlyViewed()

  if (!enabled) return null
  const visible = items.filter((p) => p._id !== excludeId)
  if (visible.length === 0) return null

  return (
    <div className='my-4'>
      <h3>Recently Viewed</h3>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        {visible.map((product) => (
          <Card
            key={product._id}
            style={{ minWidth: '180px', maxWidth: '180px' }}
          >
            <Link to={`/product/${product._id}`}>
              <Card.Img src={product.image} variant='top' />
            </Link>
            <Card.Body className='p-2'>
              <Link
                to={`/product/${product._id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card.Title
                  as='div'
                  style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}
                >
                  <strong>{product.name}</strong>
                </Card.Title>
              </Link>
              <Card.Text as='div'>${product.price}</Card.Text>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RecentlyViewed
