// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfilePage } from './ProfilePage'

// ProfilePage now talks to the shared `api` instance rather than bare axios,
// so that the access token is attached from storage and a 401 is retried after
// a refresh (#633). Mocking the client directly keeps these tests about the
// page rather than about axios' interceptor plumbing.
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  BACKEND_URL: 'http://127.0.0.1:8000',
  onSessionExpired: vi.fn(() => () => {}),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const mockedAxiosGet = vi.mocked(api.get)
const mockedAxiosPut = vi.mocked(api.put)
const mockedUseAuth = vi.mocked(useAuth)

describe('ProfilePage', () => {
  const mockUser = {
    username: 'testuser',
    token: 'fake-token',
  }

  const mockUpdateProfileSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockedUseAuth.mockReturnValue({
      user: mockUser,
      signup: vi.fn(),
      login: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      sessionExpired: false,
      dismissSessionExpired: vi.fn(),
      updateProfileSession: mockUpdateProfileSession,
      updateUserAvatar: vi.fn(),
      exportUserData: vi.fn(),
    })
  })

  it('shows access denied when the user is not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      signup: vi.fn(),
      login: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      sessionExpired: false,
      dismissSessionExpired: vi.fn(),
      updateProfileSession: vi.fn(),
      updateUserAvatar: vi.fn(),
      exportUserData: vi.fn(),
    })

    render(<ProfilePage />)

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText(/Please log in to manage your account details/i)).toBeInTheDocument()
  })

  it('fetches and displays the authenticated user profile with bio', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Senior Software Engineer | React & Python',
        weekly_digest_opt_in: true,
      },
    })

    render(<ProfilePage />)

    expect(screen.getByText('Fetching profile information...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Senior Software Engineer | React & Python')).toBeInTheDocument()

    const digestToggle = screen.getByRole('switch', {
      name: /weekly resume-tips email digest/i,
    })

    expect(digestToggle).toBeChecked()
    expect(mockedAxiosGet).toHaveBeenCalledWith(expect.stringContaining('/api/profile/'))
  })

  it('enters edit mode when Edit Profile is clicked', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Frontend Architect',
        weekly_digest_opt_in: false,
      },
    })

    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const bioInput = screen.getByLabelText(/bio \/ headline/i)
    const digestToggle = screen.getByRole('switch', {
      name: /weekly resume-tips email digest/i,
    })

    expect(usernameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(bioInput).toBeDisabled()
    expect(digestToggle).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))

    expect(usernameInput).not.toBeDisabled()
    expect(emailInput).not.toBeDisabled()
    expect(bioInput).not.toBeDisabled()
    expect(digestToggle).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('updates the profile and bio successfully with sanitization', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Initial Headline',
        weekly_digest_opt_in: false,
      },
    })

    mockedAxiosPut.mockResolvedValueOnce({
      data: {
        username: 'updateduser',
        email: 'updated@example.com',
        bio: 'Full-Stack Developer & Open Source Contributor',
        weekly_digest_opt_in: true,
      },
    })

    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'updateduser' } })
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'updated@example.com' },
    })
    fireEvent.click(screen.getByRole('switch', { name: /weekly resume-tips email digest/i }))
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockedAxiosPut).toHaveBeenCalled())

    expect(mockedAxiosPut).toHaveBeenCalledWith(expect.stringContaining('/api/profile/'), {
      username: 'updateduser',
      email: 'updated@example.com',
      bio: 'Full-Stack Developer & Open Source Contributor',
      weekly_digest_opt_in: true,
      notification_preferences: { browser: false, in_app: true },
    })

    await waitFor(() =>
      expect(
        screen.getByText('Profile and notification preferences updated successfully!')
      ).toBeInTheDocument()
    )
    expect(screen.getByDisplayValue('updateduser')).toBeInTheDocument()
    expect(screen.getByDisplayValue('updated@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Full-Stack Developer & Open Source Contributor')).toBeInTheDocument()
    expect(mockUpdateProfileSession).toHaveBeenCalledWith('updateduser')
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
  })

  it('does not save when username is empty', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: { username: 'testuser', email: 'test@example.com', weekly_digest_opt_in: false },
    })

    render(<ProfilePage />)
    await waitFor(() => expect(screen.getByDisplayValue('testuser')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Username cannot be empty.')).toBeInTheDocument()
    expect(mockedAxiosPut).not.toHaveBeenCalled()
  })

  it('does not save when the email is invalid', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: { username: 'testuser', email: 'test@example.com', weekly_digest_opt_in: false },
    })

    render(<ProfilePage />)
    await waitFor(() => expect(screen.getByDisplayValue('testuser')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'invalid-email' } })

    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')
    if (form) fireEvent.submit(form)

    expect(await screen.findByText('Please provide a valid email address.')).toBeInTheDocument()
    expect(mockedAxiosPut).not.toHaveBeenCalled()
  })

  it('cancels editing and restores the original values including bio', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: { username: 'testuser', email: 'test@example.com', bio: 'Original Bio Text', weekly_digest_opt_in: false },
    })

    render(<ProfilePage />)
    await waitFor(() => expect(screen.getByDisplayValue('testuser')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'changeduser' } })
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'changed@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original Bio Text')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
  })
})
