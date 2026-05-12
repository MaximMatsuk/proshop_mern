import React, { useEffect } from 'react'
import { Table, Badge, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { loadFeatureFlags } from '../actions/featureFlagsActions'

const STATUS_VARIANT = {
  Disabled: 'danger',
  Testing: 'warning',
  Enabled: 'success',
}

const FeatureListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const featureFlags = useSelector((state) => state.featureFlags)
  const { loading, error, flags } = featureFlags

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(loadFeatureFlags())
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo])

  const rows = Object.values(flags || {})

  return (
    <>
      <div className='d-flex justify-content-between align-items-center'>
        <h1>Feature Flags</h1>
        <Button
          variant='light'
          onClick={() => dispatch(loadFeatureFlags())}
          disabled={loading}
        >
          <i className='fas fa-sync'></i> Refresh
        </Button>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Traffic</th>
              <th>Strategy</th>
              <th>Dependencies</th>
              <th>Segments</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.name}>
                <td title={f.description}>
                  <strong>{f.display_name}</strong>
                  <br />
                  <small className='text-muted'>{f.name}</small>
                </td>
                <td>
                  <Badge variant={STATUS_VARIANT[f.status] || 'secondary'}>
                    {f.status}
                  </Badge>
                </td>
                <td>
                  {f.enabled ? (
                    <i className='fas fa-check' style={{ color: 'green' }}></i>
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>{f.traffic_percentage}%</td>
                <td>{f.rollout_strategy || '—'}</td>
                <td>
                  {(f.dependencies || []).map((d) => (
                    <Badge key={d} variant='info' className='mr-1'>
                      {d}
                    </Badge>
                  ))}
                </td>
                <td>
                  <small>{(f.targeted_segments || []).join(', ')}</small>
                </td>
                <td>{f.last_modified}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default FeatureListScreen
