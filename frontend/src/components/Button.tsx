import React, { forwardRef } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  pill?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      pill = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const classNames = [
      'app-button',
      `app-button--${variant}`,
      `app-button--${size}`,
      pill ? 'app-button--pill' : '',
      fullWidth ? 'app-button--full-width' : '',
      isLoading ? 'app-button--loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        type={type}
        className={classNames}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        {...rest}
      >
        {isLoading && <span className="app-button__spinner" aria-hidden="true" />}
        {!isLoading && leftIcon && <span className="app-button__icon app-button__icon--left">{leftIcon}</span>}
        {children && <span className="app-button__text">{children}</span>}
        {!isLoading && rightIcon && <span className="app-button__icon app-button__icon--right">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
