import { Request, Response } from "express";
import jwt from 'jsonwebtoken';
import pool from '../config/database';

interface AuthenticatedRequest extends Request {
    user?: {
        userId: number;
        email: string;
    };
}

export const addWebsite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, url } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({error: 'Authentication required'});
    }

    if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });        
    }

    // Insert website into database
    const result = await pool.query(
      'INSERT INTO websites (user_id, name, url) VALUES ($1, $2, $3) RETURNING id, name, url, created_at',
      [userId, name, url]
    );

    const website = result.rows[0];

    res.status(201).json({
      message: 'Website added successfully',
      website: {
        id: website.id,
        name: website.name,
        url: website.url,
        created_at: website.created_at
      }
    });
  } catch (error) {
    console.error('Add website error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};    
