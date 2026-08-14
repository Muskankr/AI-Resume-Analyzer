// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { ProfilePage } from './ProfilePage'

vi.mock('axios')

vi.mock('../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'

const mockedAxiosGet = vi.mocked(axios.get)
const mockedAxiosPut = vi.mocked(axios.put)
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
            logout: vi.fn(),
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
            logout: vi.fn(),
            updateProfileSession: vi.fn(),
            updateUserAvatar: vi.fn(),
            exportUserData: vi.fn(),
        })


        render(<ProfilePage />)

        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(
            screen.getByText(/Please log in to manage your account details/i)
        ).toBeInTheDocument()
    })

    it('fetches and displays the authenticated user profile', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: true,
            },
        })

        render(<ProfilePage />)

        expect(
            screen.getByText('Fetching profile information...')
        ).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()

        const digestToggle = screen.getByRole('switch', {
            name: /weekly resume-tips email digest/i,
        })

        expect(digestToggle).toBeChecked()

        expect(mockedAxiosGet).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/profile/'),
            {
                headers: {
                    Authorization: 'Bearer fake-token',
                },
            }
        )
    })

    it('enters edit mode when Edit Profile is clicked', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: false,
            },
        })

        render(<ProfilePage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        const usernameInput = screen.getByLabelText('Username')
        const emailInput = screen.getByLabelText('Email Address')
        const digestToggle = screen.getByRole('switch')

        expect(usernameInput).toBeDisabled()
        expect(emailInput).toBeDisabled()
        expect(digestToggle).toBeDisabled()

        fireEvent.click(
            screen.getByRole('button', { name: /edit profile/i })
        )

        expect(usernameInput).not.toBeDisabled()
        expect(emailInput).not.toBeDisabled()
        expect(digestToggle).not.toBeDisabled()

        expect(
            screen.getByRole('button', { name: /save changes/i })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', { name: /cancel/i })
        ).toBeInTheDocument()
    })

    it('updates the profile successfully', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: false,
            },
        })

        mockedAxiosPut.mockResolvedValueOnce({
            data: {
                username: 'updateduser',
                email: 'updated@example.com',
                weekly_digest_opt_in: true,
            },
        })

        render(<ProfilePage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: /edit profile/i })
        )

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: 'updateduser' },
        })

        fireEvent.change(screen.getByLabelText('Email Address'), {
            target: { value: 'updated@example.com' },
        })

        fireEvent.click(
            screen.getByRole('switch', {
                name: /weekly resume-tips email digest/i,
            })
        )

        fireEvent.click(
            screen.getByRole('button', { name: /save changes/i })
        )

        await waitFor(() => {
            expect(mockedAxiosPut).toHaveBeenCalled()
        })

        expect(mockedAxiosPut).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/profile/'),
            {
                username: 'updateduser',
                email: 'updated@example.com',
                weekly_digest_opt_in: true,
            },
            {
                headers: {
                    Authorization: 'Bearer fake-token',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText('Profile updated successfully!')
            ).toBeInTheDocument()
        })

        expect(screen.getByDisplayValue('updateduser')).toBeInTheDocument()
        expect(
            screen.getByDisplayValue('updated@example.com')
        ).toBeInTheDocument()

        expect(mockUpdateProfileSession).toHaveBeenCalledWith('updateduser')

        expect(
            screen.getByRole('button', { name: /edit profile/i })
        ).toBeInTheDocument()
    })

    it('does not save when username is empty', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: false,
            },
        })

        render(<ProfilePage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: /edit profile/i })
        )

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: '' },
        })

        fireEvent.click(
            screen.getByRole('button', { name: /save changes/i })
        )

        expect(
            await screen.findByText('Username cannot be empty.')
        ).toBeInTheDocument()

        expect(mockedAxiosPut).not.toHaveBeenCalled()
    })

    it('does not save when the email is invalid', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: false,
            },
        })

        render(<ProfilePage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: /edit profile/i })
        )

        fireEvent.change(screen.getByLabelText('Email Address'), {
            target: { value: 'invalid-email' },
        })

        const form = screen.getByRole('button', { name: /save changes/i }).closest('form')
        if (form) {
            fireEvent.submit(form)
        }

        expect(
            await screen.findByText('Please provide a valid email address.')
        ).toBeInTheDocument()

        expect(mockedAxiosPut).not.toHaveBeenCalled()
    })

    it('cancels editing and restores the original values', async () => {
        mockedAxiosGet.mockResolvedValueOnce({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                weekly_digest_opt_in: false,
            },
        })

        render(<ProfilePage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: /edit profile/i })
        )

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: 'changeduser' },
        })

        fireEvent.change(screen.getByLabelText('Email Address'), {
            target: { value: 'changed@example.com' },
        })

        fireEvent.click(
            screen.getByRole('button', { name: /cancel/i })
        )

        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
        expect(
            screen.getByDisplayValue('test@example.com')
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', { name: /edit profile/i })
        ).toBeInTheDocument()
    })
})
