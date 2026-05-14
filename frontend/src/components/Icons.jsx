import React from 'react'

export const IconSearch = (p) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' {...p}>
    <circle cx='11' cy='11' r='6.5' stroke='currentColor' strokeWidth='1.6' />
    <path d='M16 16L20 20' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
  </svg>
)

export const IconCart = (p) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' {...p}>
    <path d='M5 7H19L17.5 16H6.5L5 7Z' stroke='currentColor' strokeWidth='1.4' strokeLinejoin='round' />
    <path d='M5 7L4 4H2' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' />
    <circle cx='9' cy='20' r='1.3' fill='currentColor' />
    <circle cx='16' cy='20' r='1.3' fill='currentColor' />
  </svg>
)

export const IconRefresh = (p) => (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' {...p}>
    <path
      d='M4 12C4 7.6 7.6 4 12 4C14.5 4 16.7 5.1 18.2 7M20 12C20 16.4 16.4 20 12 20C9.6 20 7.4 18.9 5.9 17M18.2 7L18.2 3M18.2 7L14.2 7M5.8 17L5.8 21M5.8 17L9.8 17'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const IconPlus = (p) => (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' {...p}>
    <path d='M12 5V19M5 12H19' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
  </svg>
)

export const IconFilter = (p) => (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' {...p}>
    <path d='M4 6H20M7 12H17M10 18H14' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
  </svg>
)

export const IconDots = (p) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' {...p}>
    <circle cx='6' cy='12' r='1.5' fill='currentColor' />
    <circle cx='12' cy='12' r='1.5' fill='currentColor' />
    <circle cx='18' cy='12' r='1.5' fill='currentColor' />
  </svg>
)

export const IconChevron = (p) => (
  <svg width='10' height='10' viewBox='0 0 10 10' fill='none' {...p}>
    <path d='M2 4L5 7L8 4' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const IconChevronRight = (p) => (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' {...p}>
    <path d='M9 6L15 12L9 18' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const IconClock = (p) => (
  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' {...p}>
    <circle cx='12' cy='12' r='8.5' stroke='currentColor' strokeWidth='1.4' />
    <path d='M12 7.5V12L15 14' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const IconX = (p) => (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' {...p}>
    <path d='M6 6L18 18M18 6L6 18' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
  </svg>
)

export const IconLogo = (p) => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.4'
    strokeLinecap='round'
    {...p}
  >
    <rect x='6' y='6' width='12' height='12' rx='1.5' />
    <path d='M9 3 V6 M15 3 V6 M9 18 V21 M15 18 V21 M3 9 H6 M3 15 H6 M18 9 H21 M18 15 H21' />
    <circle cx='12' cy='12' r='1.6' fill='currentColor' />
  </svg>
)
