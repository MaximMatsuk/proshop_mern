import React from 'react'

const Rating = ({ value, text, color }) => {
  const numeric = typeof value === 'number' ? value : parseFloat(value) || 0
  const rounded = Math.round(numeric * 10) / 10
  const ariaLabel = text
    ? `Rated ${rounded} out of 5 stars, ${text}`
    : `Rated ${rounded} out of 5 stars`

  const starClass = (threshold) =>
    numeric >= threshold
      ? 'fas fa-star'
      : numeric >= threshold - 0.5
      ? 'fas fa-star-half-alt'
      : 'far fa-star'

  return (
    <div className='rating' role='img' aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden='true'>
          <i style={{ color }} className={starClass(n)}></i>
        </span>
      ))}
      {text && <span aria-hidden='true'>{text}</span>}
    </div>
  )
}

Rating.defaultProps = {
  color: '#f8e825',
}

export default Rating
