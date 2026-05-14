import React from 'react'
import { Alert } from 'react-bootstrap'

const ROLE_BY_VARIANT = {
  danger: 'alert',
  warning: 'alert',
  success: 'status',
  info: 'status',
  primary: 'status',
  secondary: 'status',
  light: 'status',
  dark: 'status',
}

const Message = ({ variant, children }) => {
  const role = ROLE_BY_VARIANT[variant] || 'status'
  return (
    <Alert variant={variant} role={role}>
      {children}
    </Alert>
  )
}

Message.defaultProps = {
  variant: 'info',
}

export default Message
