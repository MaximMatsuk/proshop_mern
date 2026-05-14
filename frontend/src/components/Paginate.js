import React from 'react'
import { Pagination } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'

const Paginate = ({ pages, page, isAdmin = false, keyword = '' }) => {
  if (pages <= 1) return null

  return (
    <nav aria-label='Pagination'>
      <Pagination>
        {[...Array(pages).keys()].map((x) => {
          const pageNum = x + 1
          const isActive = pageNum === page
          return (
            <LinkContainer
              key={pageNum}
              to={
                !isAdmin
                  ? keyword
                    ? `/search/${keyword}/page/${pageNum}`
                    : `/page/${pageNum}`
                  : `/admin/productlist/${pageNum}`
              }
            >
              <Pagination.Item active={isActive} aria-label={`Page ${pageNum}`}>
                {pageNum}
              </Pagination.Item>
            </LinkContainer>
          )
        })}
      </Pagination>
    </nav>
  )
}

export default Paginate
