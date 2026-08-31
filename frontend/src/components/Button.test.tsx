// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { Button } from './Button'

describe('Button component (#102)', () => {
  it('renders children with default variant (primary) and size (md)', () => {
    render(<Button>Click Me</Button>)
    const btn = screen.getByRole('button', { name: /click me/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('app-button', 'app-button--primary', 'app-button--md')
    expect(btn).toHaveAttribute('type', 'button')
  })

  it.each([
    ['primary', 'app-button--primary'],
    ['secondary', 'app-button--secondary'],
    ['ghost', 'app-button--ghost'],
    ['outline', 'app-button--outline'],
    ['danger', 'app-button--danger'],
    ['accent', 'app-button--accent'],
  ] as const)('renders variant "%s" with class "%s"', (variant, expectedClass) => {
    render(<Button variant={variant}>{variant} button</Button>)
    const btn = screen.getByRole('button', { name: new RegExp(variant, 'i') })
    expect(btn).toHaveClass(expectedClass)
  })

  it.each([
    ['sm', 'app-button--sm'],
    ['md', 'app-button--md'],
    ['lg', 'app-button--lg'],
  ] as const)('renders size "%s" with class "%s"', (size, expectedClass) => {
    render(<Button size={size}>Size test</Button>)
    const btn = screen.getByRole('button', { name: /size test/i })
    expect(btn).toHaveClass(expectedClass)
  })

  it('renders pill shape when pill prop is true', () => {
    render(<Button pill>Pill Button</Button>)
    const btn = screen.getByRole('button', { name: /pill button/i })
    expect(btn).toHaveClass('app-button--pill')
  })

  it('renders full width when fullWidth prop is true', () => {
    render(<Button fullWidth>Full Width</Button>)
    const btn = screen.getByRole('button', { name: /full width/i })
    expect(btn).toHaveClass('app-button--full-width')
  })

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Submit</Button>)
    const btn = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger onClick when disabled', () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    )
    const btn = screen.getByRole('button', { name: /disabled/i })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('displays loading spinner and disables button when isLoading is true', () => {
    const handleClick = vi.fn()
    render(
      <Button isLoading onClick={handleClick}>
        Loading Button
      </Button>
    )
    const btn = screen.getByRole('button', { name: /loading button/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn.querySelector('.app-button__spinner')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders left and right icons when provided', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">👈</span>}
        rightIcon={<span data-testid="right-icon">👉</span>}
      >
        With Icons
      </Button>
    )
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    expect(screen.getByText('With Icons')).toBeInTheDocument()
  })

  it('forwards ref to the underlying button element', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Target</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current?.textContent).toBe('Ref Target')
  })

  it('supports custom HTML attributes and custom type', () => {
    render(
      <Button type="submit" aria-label="Custom Submit" data-testid="custom-btn">
        Save
      </Button>
    )
    const btn = screen.getByTestId('custom-btn')
    expect(btn).toHaveAttribute('type', 'submit')
    expect(btn).toHaveAttribute('aria-label', 'Custom Submit')
  })
})
