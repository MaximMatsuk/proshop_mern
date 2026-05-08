import React, { useEffect, useState } from 'react'
import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button, Card, Form, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { listOrders } from '../actions/orderActions'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

const OrderListScreen = ({ history }) => {
  const dispatch = useDispatch()
  const advancedFilters = useFeatureFlag('admin_advanced_filters')
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    paymentMethod: '',
  })

  const orderList = useSelector((state) => state.orderList)
  const { loading, error, orders } = orderList

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listOrders(advancedFilters ? filters : {}))
    } else {
      history.push('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, history, userInfo])

  const applyFilters = (e) => {
    e.preventDefault()
    dispatch(listOrders(filters))
  }

  const resetFilters = () => {
    const empty = { status: '', dateFrom: '', dateTo: '', paymentMethod: '' }
    setFilters(empty)
    dispatch(listOrders({}))
  }

  const onFilterChange = (k) => (e) =>
    setFilters((prev) => ({ ...prev, [k]: e.target.value }))

  return (
    <>
      <h1>Orders</h1>
      {advancedFilters && (
        <Card className='p-3 mb-3'>
          <Form onSubmit={applyFilters}>
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Control
                    as='select'
                    value={filters.status}
                    onChange={onFilterChange('status')}
                  >
                    <option value=''>Any</option>
                    <option value='pending'>Pending (unpaid)</option>
                    <option value='paid'>Paid</option>
                    <option value='delivered'>Delivered</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date from</Form.Label>
                  <Form.Control
                    type='date'
                    value={filters.dateFrom}
                    onChange={onFilterChange('dateFrom')}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date to</Form.Label>
                  <Form.Control
                    type='date'
                    value={filters.dateTo}
                    onChange={onFilterChange('dateTo')}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Payment method</Form.Label>
                  <Form.Control
                    type='text'
                    value={filters.paymentMethod}
                    onChange={onFilterChange('paymentMethod')}
                    placeholder='e.g. PayPal'
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button type='submit' className='mr-2'>
              Apply Filters
            </Button>
            <Button variant='light' onClick={resetFilters}>
              Reset
            </Button>
          </Form>
        </Card>
      )}
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>ID</th>
              <th>USER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>PAID</th>
              <th>DELIVERED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>{order.user && order.user.name}</td>
                <td>{order.createdAt.substring(0, 10)}</td>
                <td>${order.totalPrice}</td>
                <td>
                  {order.isPaid ? (
                    order.paidAt.substring(0, 10)
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>
                  {order.isDelivered ? (
                    order.deliveredAt.substring(0, 10)
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>
                  <LinkContainer to={`/order/${order._id}`}>
                    <Button variant='light' className='btn-sm'>
                      Details
                    </Button>
                  </LinkContainer>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default OrderListScreen
