import React, { useState, useRef, useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
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

  const navigate = (to) => {
    setOpenMenu(null)
    history.push(to)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    if (keyword.trim()) history.push(`/search/${keyword.trim()}`)
    else history.push('/')
  }

  const onLogout = () => {
    setOpenMenu(null)
    dispatch(logout())
    history.push('/login')
  }

  return (
    <header className='sticky top-0 z-50 bg-bone-100 border-b border-line-soft backdrop-blur-sm'>
      <div className='max-w-container mx-auto px-6 h-header grid grid-cols-[auto_1fr_auto] items-center gap-7'>
        <a
          href='/'
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          className='inline-flex items-center gap-2.5 text-forest-800 hover:text-forest-700 hover:no-underline'
        >
          <span className='text-forest-700'>
            <IconLogo />
          </span>
          <span className='font-display font-medium text-[26px] tracking-[-0.01em] leading-none'>
            ProShop
          </span>
        </a>

        <form
          onSubmit={submitSearch}
          className={cn(
            'flex items-center gap-2.5 h-input px-[18px] max-w-[420px]',
            'rounded-pill border border-line bg-transparent',
            'transition-colors duration-fast ease-out focus-within:border-forest-700',
          )}
        >
          <span className='text-ink-mute'>
            <IconSearch />
          </span>
          <input
            type='text'
            name='q'
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder='Search the shop'
            className='flex-1 bg-transparent border-0 outline-none text-sm text-ink placeholder:text-ink-mute'
          />
        </form>

        <nav className='flex items-center gap-6' ref={menuRef}>
          <NavLink onClick={() => navigate('/cart')} active={route.startsWith('/cart')}>
            <span className='text-ink-soft inline-flex'>
              <IconCart />
            </span>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className='inline-grid place-items-center min-w-[18px] h-[18px] px-[5px] rounded-pill bg-forest-700 text-bone-50 text-[10px] font-semibold'>
                {cartCount}
              </span>
            )}
          </NavLink>

          {userInfo ? (
            <Menu
              open={openMenu === 'user'}
              onToggle={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              label={userInfo.name}
              items={[
                { label: 'Profile', onClick: () => navigate('/profile') },
                { sep: true },
                { label: 'Sign out', onClick: onLogout },
              ]}
            />
          ) : (
            <NavLink onClick={() => navigate('/login')} active={route === '/login'}>
              Sign in
            </NavLink>
          )}

          {userInfo && userInfo.isAdmin && (
            <Menu
              open={openMenu === 'admin'}
              onToggle={() => setOpenMenu(openMenu === 'admin' ? null : 'admin')}
              label='Admin'
              active={route.startsWith('/admin')}
              items={[
                { label: 'Users', onClick: () => navigate('/admin/userlist'), active: route === '/admin/userlist' },
                { label: 'Products', onClick: () => navigate('/admin/productlist'), active: route === '/admin/productlist' },
                { label: 'Orders', onClick: () => navigate('/admin/orderlist'), active: route === '/admin/orderlist' },
                {
                  label: 'Feature flags',
                  onClick: () => navigate('/admin/featurelist'),
                  active: route === '/admin/featurelist',
                },
              ]}
            />
          )}
        </nav>
      </div>
    </header>
  )
}

function NavLink({ children, onClick, active }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-2 px-1 py-2 bg-transparent border-0 cursor-pointer',
        'text-sm font-medium tracking-[0.01em]',
        'transition-colors duration-fast ease-out',
        active ? 'text-forest-700' : 'text-ink hover:text-forest-700',
        active && 'after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-forest-700',
      )}
    >
      {children}
    </button>
  )
}

function Menu({ open, onToggle, label, items, active }) {
  return (
    <div className='relative'>
      <button
        type='button'
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-1 py-2 text-sm font-medium bg-transparent border-0 cursor-pointer',
          'transition-colors duration-fast ease-out',
          active ? 'text-forest-700' : 'text-ink hover:text-forest-700',
        )}
      >
        {label}
        <span className='text-ink-mute'>
          <IconChevron />
        </span>
      </button>
      {open && (
        <div className='absolute top-full right-0 mt-1.5 min-w-[200px] z-[60] p-1.5 rounded-md bg-bone-50 border border-line shadow-2'>
          {items.map((it, i) =>
            it.sep ? (
              <div key={i} className='h-px bg-line-soft my-1.5 mx-1' />
            ) : (
              <button
                key={i}
                type='button'
                onClick={it.onClick}
                className={cn(
                  'block w-full text-left px-3 py-[9px] text-sm rounded-[3px] bg-transparent border-0 cursor-pointer',
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
