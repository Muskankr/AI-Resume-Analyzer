import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react'

// Lightweight custom debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export interface SignupValidationFieldsProps {
  username?: string
  email?: string
  onUsernameChange?: (val: string) => void
  onEmailChange?: (val: string) => void
  onStatusChange?: (status: {
    usernameStatus: { state: string; message: string }
    emailStatus: { state: string; message: string }
  }) => void
}

export const SignupValidationFields: React.FC<SignupValidationFieldsProps> = ({
  username: externalUsername,
  email: externalEmail,
  onUsernameChange,
  onEmailChange,
  onStatusChange,
}) => {
  const [internalUsername, setInternalUsername] = useState('')
  const [internalEmail, setInternalEmail] = useState('')

  const username = externalUsername !== undefined ? externalUsername : internalUsername
  const email = externalEmail !== undefined ? externalEmail : internalEmail

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (onUsernameChange) onUsernameChange(val)
    else setInternalUsername(val)
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (onEmailChange) onEmailChange(val)
    else setInternalEmail(val)
  }

  const [usernameStatus, setUsernameStatus] = useState<{ state: string; message: string }>({
    state: 'idle',
    message: '',
  })
  const [emailStatus, setEmailStatus] = useState<{ state: string; message: string }>({
    state: 'idle',
    message: '',
  })

  const debouncedUsername = useDebounce(username, 400)
  const debouncedEmail = useDebounce(email, 400)

  // Network call to evaluate field uniqueness
  const checkAvailability = useCallback(
    async (
      field: 'username' | 'email',
      value: string,
      setStatus: React.Dispatch<React.SetStateAction<{ state: string; message: string }>>
    ) => {
      if (!value) {
        setStatus({ state: 'idle', message: '' })
        return
      }
      setStatus({ state: 'loading', message: 'Checking...' })

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
        const response = await fetch(
          `${backendUrl}/api/auth/check-availability?field=${field}&value=${encodeURIComponent(value)}`
        )
        const data = await response.json()

        if (data.isAvailable) {
          setStatus({ state: 'available', message: '✓ Available' })
        } else {
          // Softer security copy applied to email inputs to block target verification harvesting
          const errorCopy =
            field === 'email'
              ? 'This email format cannot be registered. Try logging in.'
              : '✖ Username is already taken.'
          setStatus({ state: 'taken', message: errorCopy })
        }
      } catch {
        setStatus({ state: 'idle', message: '' }) // Fail silently on network drops
      }
    },
    []
  )

  useEffect(() => {
    checkAvailability('username', debouncedUsername, setUsernameStatus)
  }, [debouncedUsername, checkAvailability])

  useEffect(() => {
    checkAvailability('email', debouncedEmail, setEmailStatus)
  }, [debouncedEmail, checkAvailability])

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({ usernameStatus, emailStatus })
    }
  }, [usernameStatus, emailStatus, onStatusChange])

  return (
    <div className="signup-fields space-y-4 max-w-sm mx-auto p-6 bg-slate-900 text-white rounded-lg">
      {/* Username Field Block */}
      <div className="flex flex-col">
        <label htmlFor="username" className="text-sm font-medium mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          className="p-2 border rounded text-black focus:ring-2 focus:ring-amber-500"
          placeholder="Choose a username"
        />
        <span
          className={`text-xs mt-1 font-semibold ${
            usernameStatus.state === 'available' ? 'text-green-500' : 'text-red-400'
          }`}
        >
          {usernameStatus.message}
        </span>
      </div>

      {/* Email Field Block */}
      <div className="flex flex-col">
        <label htmlFor="email" className="text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          className="p-2 border rounded text-black focus:ring-2 focus:ring-amber-500"
          placeholder="Enter your email"
        />
        <span
          className={`text-xs mt-1 font-semibold ${
            emailStatus.state === 'available' ? 'text-green-500' : 'text-red-400'
          }`}
        >
          {emailStatus.message}
        </span>
      </div>
    </div>
  )
}
