import React, { useState, useRef, useEffect } from 'react'
import { Link, useHistory, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../actions/userActions'
import { cn } from './cn'
import { IconLogo, IconSearch, IconCart, IconChevron } from './Icons'

const Header = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const location = useLocation()
  const route = location.pathname

  const userLogin = useSelector((s) => s.userLogin)
  const { userInfo } = userLogin

  const cart = useSelector((s) => s.cart)
  const { cartItems } = cart
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0)

  const [openMenu, setOpenMenu] = useState(null)
  const menuRef = useRef(null)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const closeMenu = () => setOpenMenu(null)

  const submitSearch = (e) => {
    e.preventDefault()
    if (keyword.trim()) history.push(`/search/${keyword.trim()}`)
    else history.push('/')
  }

  const onLogout = () => {
    closeMenu()
    dispatch(logout())
    history.push('/login')
  }

  const cartAriaLabel =
    cartCount > 0
      ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`
      : 'Cart, empty'

  return (
    <header className='sticky top-0 z-50 bg-bone-100 border-b border-line-soft backdrop-blur-sm'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-forest-700 focus:text-bone-50 focus:no-underline focus:outline-2 focus:outline-forest-500 focus:outline-offset-2'
      >
        Skip to main content
      </a>
      <div className='max-w-container mx-auto px-6 h-header grid grid-cols-[auto_1fr_auto] items-center gap-7'>
        <Link
          to='/'
          aria-label='ProShop — go to homepage'
          className='inline-flex items-center gap-2.5 text-forest-800 hover:text-forest-700 hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
        >
          <span className='text-forest-700'>
            <IconLogo />
          </span>
          <span className='font-display font-medium text-[26px] tracking-[-0.01em] leading-none'>
            ProShop
          </span>
        </Link>

        <form
          role='search'
          aria-label='Site search'
          onSubmit={submitSearch}
          className={cn(
            'flex items-center gap-2.5 h-input px-[18px] max-w-[420px]',
            'rounded-pill border border-line bg-transparent',
            'transition-colors duration-fast ease-out focus-within:border-forest-700',
          )}
        >
          <label htmlFor='header-search' className='sr-only'>
            Search the shop
          </label>
          <span className='text-ink-mute' aria-hidden='true'>
            <IconSearch />
          </span>
          <input
            id='header-search'
            type='search'
            name='q'
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder='Search the shop'
            className='flex-1 bg-transparent border-0 outline-none text-sm text-ink placeholder:text-ink-mute'
          />
        </form>

        <nav aria-label='Account and admin' className='flex items-center gap-6' ref={menuRef}>
          <NavAnchor
            to='/cart'
            active={route.startsWith('/cart')}
            aria-label={cartAriaLabel}
          >
            <span className='text-ink-soft inline-flex' aria-hidden='true'>
              <IconCart />
            </span>
            <span aria-hidden='true'>Cart</span>
            {cartCount > 0 && (
              <span
                aria-hidden='true'
                className='inline-grid place-items-center min-w-[18px] h-[18px] px-[5px] rounded-pill bg-forest-700 text-bone-50 text-[10px] font-semibold'
              >
                {cartCount}
              </span>
            )}
          </NavAnchor>

          {userInfo ? (
            <Menu
              id='user-menu'
              open={openMenu === 'user'}
              onToggle={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              onClose={closeMenu}
              label={userInfo.name}
              items={[
                {
                  label: 'Profile',
                  to: '/profile',
                  active: route === '/profile',
                  onClick: closeMenu,
                },
                { sep: true },
                { label: 'Sign out', onClick: onLogout },
              ]}
            />
          ) : (
            <NavAnchor to='/login' active={route === '/login'}>
              Sign in
            </NavAnchor>
          )}

          {userInfo && userInfo.isAdmin && (
            <Menu
              id='admin-menu'
              open={openMenu === 'admin'}
              onToggle={() => setOpenMenu(openMenu === 'admin' ? null : 'admin')}
              onClose={closeMenu}
              label='Admin'
              active={route.startsWith('/admin')}
              items={[
                {
                  label: 'Users',
                  to: '/admin/userlist',
                  active: route === '/admin/userlist',
                  onClick: closeMenu,
                },
                {
                  label: 'Products',
                  to: '/admin/productlist',
                  active: route === '/admin/productlist',
                  onClick: closeMenu,
                },
                {
                  label: 'Orders',
                  to: '/admin/orderlist',
                  active: route === '/admin/orderlist',
                  onClick: closeMenu,
                },
                {
                  label: 'Feature flags',
                  to: '/admin/featurelist',
                  active: route === '/admin/featurelist',
                  onClick: closeMenu,
                },
              ]}
            />
          )}
        </nav>
      </div>
    </header>
  )
}

function NavAnchor({ children, to, active, ...rest }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex items-center gap-2 px-1 py-2',
        'text-sm font-medium tracking-[0.01em] no-underline hover:no-underline',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm',
        active ? 'text-forest-700' : 'text-ink hover:text-forest-700',
        active && 'after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-forest-700',
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

function Menu({ open, onToggle, onClose, label, items, active, id }) {
  const triggerRef = useRef(null)
  const prevOpenRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      triggerRef.current?.focus()
    }
    prevOpenRef.current = open
  }, [open])

  return (
    <div className='relative'>
      <button
        ref={triggerRef}
        type='button'
        onClick={onToggle}
        aria-haspopup='true'
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'inline-flex items-center gap-1.5 px-1 py-2 text-sm font-medium bg-transparent border-0 cursor-pointer rounded-sm',
          'transition-colors duration-fast ease-out',
          'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
          active ? 'text-forest-700' : 'text-ink hover:text-forest-700',
        )}
      >
        {label}
        <span className='text-ink-mute' aria-hidden='true'>
          <IconChevron />
        </span>
      </button>
      {open && (
        <div
          id={id}
          aria-label={`${label} menu`}
          className='absolute top-full right-0 mt-1.5 min-w-[200px] z-[60] p-1.5 rounded-md bg-bone-50 border border-line shadow-2'
        >
          {items.map((it, i) =>
            it.sep ? (
              <div key={i} className='h-px bg-line-soft my-1.5 mx-1' role='separator' />
            ) : it.to ? (
              <Link
                key={i}
                to={it.to}
                onClick={it.onClick}
                aria-current={it.active ? 'page' : undefined}
                className={cn(
                  'block w-full text-left px-3 py-[9px] text-sm rounded-[3px] no-underline hover:no-underline',
                  'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
                  it.active
                    ? 'bg-forest-100 text-forest-700'
                    : 'text-ink hover:bg-bone-200 hover:text-forest-800',
                )}
              >
                {it.label}
              </Link>
            ) : (
              <button
                key={i}
                type='button'
                onClick={it.onClick}
                className={cn(
                  'block w-full text-left px-3 py-[9px] text-sm rounded-[3px] bg-transparent border-0 cursor-pointer',
                  'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
                  it.active
                    ? 'bg-forest-100 text-forest-700'
                    : 'text-ink hover:bg-bone-200 hover:text-forest-800',
                )}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default Header
