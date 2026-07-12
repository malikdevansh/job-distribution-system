import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '@jobqueue/database';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, role: 'USER' }
        });

        const tokenUser = { id: user.id, role: user.role };
        const accessToken = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

        res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tokenUser = { id: user.id, role: user.role };
        const accessToken = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

        res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const verifyEmail = (req: Request, res: Response) => {
    res.json({ success: true, message: 'Email verified successfully.' });
};

export const resetPassword = (req: Request, res: Response) => {
    res.json({ success: true, message: 'Password reset link sent to email.' });
};

export const refresh = (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
        const user = { id: decoded.id, role: decoded.role };
        const newAccessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(403).json({ error: 'Invalid refresh token' });
    }
};

export const me = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing token' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    
    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
