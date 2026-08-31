

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Handles user login with structured, specific error messages and anti-enumeration protection.
 */
export async function loginUser(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            error_code: 'MISSING_FIELDS', 
            message: 'Please provide both email and password.' 
        });
    }

    const client = await pool.connect();
    try {
        const userRes = await client.query(
            `SELECT id, email, password_hash, is_verified, is_locked, failed_login_attempts FROM users WHERE email = $1`,
            [email]
        );

        // Security: Avoid user enumeration. Return generic "Invalid credentials" if user does not exist.
        if (userRes.rows.length === 0) {
            return res.status(401).json({ 
                error_code: 'INVALID_CREDENTIALS', 
                message: 'Invalid email or password. Please check your credentials and try again.' 
            });
        }

        const user = userRes.rows[0];

        // Check if account is locked
        if (user.is_locked) {
            return res.status(403).json({ 
                error_code: 'ACCOUNT_LOCKED', 
                message: 'Your account has been temporarily locked due to multiple failed login attempts.',
                action: 'CONTACT_SUPPORT'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            // Increment failed attempts logic can go here
            return res.status(401).json({ 
                error_code: 'INVALID_CREDENTIALS', 
                message: 'Invalid email or password. Please check your credentials and try again.' 
            });
        }

        // Check if email is verified
        if (!user.is_verified) {
            return res.status(403).json({ 
                error_code: 'UNVERIFIED_ACCOUNT', 
                message: 'Your email address has not been verified yet.',
                action: 'RESEND_VERIFICATION'
            });
        }

        // Successful login token generation (omitted for brevity)
        return res.status(200).json({ message: 'Login successful', token: 'mock_jwt_token' });
    } catch (err: any) {
        return res.status(500).json({ error_code: 'SERVER_ERROR', message: 'An internal error occurred during login.' });
    } finally {
        client.release();
    }
}
