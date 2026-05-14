import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadFeatureFlags } from '../actions/featureFlagsActions'
import { Button } from '../components/Button'
import { Badge, CodeChip, SegmentTag } from '../components/Badge'
import { TextInput, Toggle } from '../components/Form'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconChevronRight,
  IconClock,
} from '../components/Icons'
import { cn } from '../components/cn'

const STATUS_TONE = { Testing: 'caution', Enabled: 'positive', Disabled: 'critical' }
const STRATEGY_LABEL = {
  canary: 'Canary',
  ab_test: 'A/B test',
  full_release: 'Full release',
}
const STRATEGY_DOT = {
  canary: 'bg-caution-500',
  ab_test: 'bg-info-500',
  full_release: 'bg-positive-500',
}

const FeatureListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const featureFlags = useSelector((s) => s.featureFlags)
  const { loading, error, flags } = featureFlags

  const userLogin = useSelector((s) => s.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(loadFeatureFlags())
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo])

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [expandedSet, setExpandedSet] = useState(() => new Set())
  // expandAll/collapseAll removed per design — keep state for per-row toggle.

  const rows = useMemo(() => Object.values(flags || {}), [flags])

  const counts = useMemo(() => {
    const c = { all: rows.length, Testing: 0, Enabled: 0, Disabled: 0 }
    rows.forEach((f) => {
      if (c[f.status] != null) c[f.status] += 1
    })
    return c
  }, [rows])

  const visible = useMemo(
    () =>
      rows.filter((f) => {
        if (tab !== 'all' && f.status !== tab) return false
        if (!query) return true
        const q = query.toLowerCase()
        return (
          f.name.toLowerCase().includes(q) ||
          (f.display_name || '').toLowerCase().includes(q)
        )
      }),
    [rows, tab, query],
  )

  const toggleExpand = (key) =>
    setExpandedSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className='min-h-screen bg-bone-100 text-ink'>
      <main className='py-8 pb-9'>
        <div className='max-w-container mx-auto px-6'>
          <nav className='flex items-center gap-2 text-xs text-ink-mute mb-5'>
            <span className='text-ink-mute'>Admin</span>
            <span aria-hidden>·</span>
            <span>Feature flags</span>
          </nav>

          <header className='grid grid-cols-[1fr_auto] gap-6 items-end pb-7 border-b border-line-soft'>
            <div>
              <div className='t-eyebrow'>Internal · Release management</div>
              <h1 className='font-display font-medium text-4xl text-forest-800 mt-1.5 mb-3'>
                Feature flags
              </h1>
              <p className='m-0 max-w-prose text-md text-ink-soft leading-loose'>
                Toggle, roll out, and roll back experiments across the shop. Changes
                propagate within a minute.
              </p>
            </div>
            <div className='flex gap-2.5'>
              <Button
                variant='ghost'
                icon={<IconRefresh />}
                onClick={() => dispatch(loadFeatureFlags())}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button variant='primary' icon={<IconPlus />}>
                New flag
              </Button>
            </div>
          </header>

          <section className='grid grid-cols-4 my-7 border-y border-line-soft'>
            <Stat label='Total flags' value={counts.all} hint='across the shop' />
            <Stat
              label='In testing'
              value={counts.Testing}
              hint='canary or A/B'
              tone='caution'
            />
            <Stat
              label='Live to everyone'
              value={counts.Enabled}
              hint='full release'
              tone='positive'
            />
            <Stat
              label='Disabled'
              value={counts.Disabled}
              hint='off in production'
              tone='critical'
              last
            />
          </section>

          <div className='flex items-center justify-between gap-5 mt-6 mb-5 flex-wrap'>
            <div className='flex gap-1'>
              <Tab active={tab === 'all'} count={counts.all} onClick={() => setTab('all')}>
                All
              </Tab>
              <Tab
                active={tab === 'Testing'}
                count={counts.Testing}
                onClick={() => setTab('Testing')}
              >
                Testing
              </Tab>
              <Tab
                active={tab === 'Enabled'}
                count={counts.Enabled}
                onClick={() => setTab('Enabled')}
              >
                Enabled
              </Tab>
              <Tab
                active={tab === 'Disabled'}
                count={counts.Disabled}
                onClick={() => setTab('Disabled')}
              >
                Disabled
              </Tab>
            </div>
            <div className='flex items-center gap-2.5'>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search flags by name or key'
                icon={<IconSearch />}
                className='w-[320px]'
              />
            </div>
          </div>

          <div className='hidden md:grid grid-cols-[28px_minmax(0,1fr)_240px_96px] gap-6 items-end px-[22px] pb-2 mt-0.5 mb-3 text-[10.5px] font-medium uppercase tracking-wider text-ink-mute'>
            <span />
            <span>Flag</span>
            <span>Traffic &amp; rollout</span>
            <span className='text-right pr-1'>Enabled</span>
          </div>

          <div className='bg-bone-50 border border-line-soft rounded-lg overflow-hidden'>
            {error ? (
              <div className='p-9 text-center'>
                <p className='font-display italic text-xl text-critical-700 m-0'>
                  {error}
                </p>
              </div>
            ) : visible.length === 0 && !loading ? (
              <div className='py-9 px-5 text-center'>
                <p className='font-display italic text-xl text-forest-800 m-0'>
                  No flags match.
                </p>
                <p className='text-sm text-ink-soft mt-2'>
                  Try a different search term or clear filters.
                </p>
              </div>
            ) : (
              visible.map((f) => (
                <FlagCard
                  key={f.name}
                  flag={f}
                  expanded={expandedSet.has(f.name)}
                  onToggleExpand={() => toggleExpand(f.name)}
                />
              ))
            )}
          </div>

          <p className='text-xs text-ink-mute mt-5'>
            Showing {visible.length} of {rows.length} flags · Synced from{' '}
            <span className='font-mono'>/api/features</span> · You are signed in as an
            admin
          </p>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, hint, tone, last }) {
  const valueColor =
    {
      positive: 'text-positive-700',
      caution: 'text-caution-700',
      critical: 'text-critical-700',
    }[tone] || 'text-forest-800'

  return (
    <div
      className={cn(
        'px-5 py-5 flex flex-col gap-1',
        !last && 'border-r border-line-soft',
      )}
    >
      <div
        className={cn(
          'font-display font-medium text-3xl leading-none',
          valueColor,
        )}
      >
        {value}
      </div>
      <div className='t-eyebrow mt-1'>{label}</div>
      {hint && <div className='text-xs text-ink-mute'>{hint}</div>}
    </div>
  )
}

function Tab({ active, count, onClick, children }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3.5 py-2 rounded-pill text-[13px] font-medium',
        'transition-colors duration-fast ease-out border-0 cursor-pointer',
        active ? 'bg-forest-800 text-bone-50' : 'bg-transparent text-ink-soft hover:bg-bone-200',
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          'inline-block min-w-[22px] text-center text-[11px] rounded-pill px-1.5 py-px',
          active ? 'bg-white/15 text-bone-50' : 'bg-bone-200 text-ink-soft',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function FlagCard({ flag, expanded, onToggleExpand }) {
  const enabled = flag.status !== 'Disabled'
  const [checked, setChecked] = useState(enabled)
  const isDisabled = flag.status === 'Disabled'

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggleExpand()
    }
  }

  return (
    <article
      className={cn(
        'border-b border-line-soft last:border-b-0 transition-colors duration-fast ease-out',
        expanded && 'bg-bone-100',
      )}
    >
      <div
        role='button'
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggleExpand}
        onKeyDown={onKeyDown}
        className={cn(
          'grid grid-cols-[28px_minmax(0,1fr)_240px_96px] gap-6 items-center',
          'w-full bg-transparent border-0 text-left cursor-pointer',
          'px-[22px] py-4',
          'hover:bg-bone-100',
          'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:-outline-offset-2',
          expanded && 'pb-[14px]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-grid place-items-center w-[22px] h-[22px] rounded-full',
            'text-ink-mute transition-transform duration-base ease-out',
            expanded && 'rotate-90 text-forest-700',
          )}
        >
          <IconChevronRight />
        </span>

        <div className='min-w-0 flex flex-col gap-1'>
          <div
            className={cn(
              'flex items-center gap-2.5 text-[15px] font-medium leading-snug',
              isDisabled ? 'text-ink-mute' : 'text-forest-800',
            )}
          >
            <span className='truncate'>{flag.display_name}</span>
            <Badge tone={STATUS_TONE[flag.status]} dot>
              {flag.status}
            </Badge>
          </div>
          <div className='flex items-center gap-3 flex-wrap text-[12.5px] text-ink-mute'>
            <CodeChip>{flag.name}</CodeChip>
            <span className='inline-flex items-center gap-1.5 text-ink-mute'>
              <span className='text-ink-faint inline-flex'>
                <IconClock />
              </span>
              Modified {flag.last_modified}
            </span>
          </div>
        </div>

        <div
          className='grid grid-cols-[56px_1fr] grid-rows-[auto_auto] gap-x-3 gap-y-[5px] items-center cursor-default'
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "row-span-2 font-display font-medium text-[28px] leading-none tracking-tight flex items-baseline gap-0.5 [font-feature-settings:'tnum']",
              isDisabled ? 'text-ink-mute' : 'text-forest-800',
            )}
          >
            <span>{flag.traffic_percentage}</span>
            <span className='font-sans text-xs font-normal text-ink-mute'>%</span>
          </div>
          <span className='inline-block h-[3px] w-full bg-bone-200 rounded-sm overflow-hidden'>
            <span
              className='block h-full bg-forest-500 transition-[width] duration-slow ease-out'
              style={{ width: `${flag.traffic_percentage}%` }}
            />
          </span>
          {flag.rollout_strategy ? (
            <span className='inline-flex items-center text-xs italic text-ink-soft'>
              <span
                className={cn(
                  'w-1 h-1 rounded-full mr-2',
                  STRATEGY_DOT[flag.rollout_strategy] || 'bg-ink-faint',
                )}
              />
              {STRATEGY_LABEL[flag.rollout_strategy] || flag.rollout_strategy}
            </span>
          ) : (
            <span className='inline-flex items-center text-xs italic text-ink-faint'>
              <span className='w-1 h-1 rounded-full mr-2 bg-ink-faint' />
              no rollout
            </span>
          )}
        </div>

        <div
          className='flex items-center justify-end cursor-default'
          onClick={(e) => e.stopPropagation()}
        >
          <Toggle checked={checked} onChange={() => setChecked((v) => !v)} />
        </div>
      </div>

      {expanded && (
        <div className='pl-[74px] pr-[22px] pb-7 pt-1 flex flex-col gap-5'>
          {flag.description && (
            <p className='m-0 max-w-[80ch] pr-5 text-base text-ink-soft leading-relaxed'>
              {flag.description}
            </p>
          )}

          <div className='flex items-center gap-3 flex-wrap pt-4 border-t border-line-soft'>
            <span className='t-eyebrow text-ink-mute shrink-0'>Targeted segments</span>
            {flag.targeted_segments && flag.targeted_segments.length > 0 ? (
              <div className='flex flex-wrap gap-1.5'>
                {flag.targeted_segments.map((s) => (
                  <SegmentTag key={s}>{s}</SegmentTag>
                ))}
              </div>
            ) : (
              <span className='text-ink-faint text-sm'>No segments targeted</span>
            )}
          </div>

          <div className='flex flex-wrap gap-2 pt-1'>
            <Button variant='secondary' size='sm'>
              Edit configuration
            </Button>
            <Button variant='ghost' size='sm'>
              Promote to next stage
            </Button>
            <Button variant='danger' size='sm'>
              Kill switch
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

export default FeatureListScreen
