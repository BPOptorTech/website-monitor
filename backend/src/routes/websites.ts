import express from 'express';
import { body } from 'express-validator';
import { createWebsite } from '../controllers/websiteController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();

// Validation rules for adding a website
const addWebsiteValidation = [
    body('name').trim().isLength({ min:1 }).withMessage('Website name is required'),
    body('url').isURL().withMessage('Please provide a valid URL'),
];

// POST /api/websites - Add a new website
router.post('/', 
  authenticateToken,
  addWebsiteValidation,
  validateRequest,
  createWebsite
);

export default router;