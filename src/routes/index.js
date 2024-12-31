const express = require('express');
const router = express.Router();
const { validateTransformation } = require('../middleware/validation');

// ...existing code...

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: 
 *                 type: string
 *               password:
 *                 type: string
 */
router.post('/register', AuthController.register);

/**
 * @swagger
 * /images/{id}/transform:
 *   post:
 *     summary: Transform an image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transformations:
 *                 type: object
 */
router.post('/images/:id/transform', auth, validateTransformation, ImageController.transform);

// Add new route
router.get('/images/:id', auth, ImageController.getImage);

// Add validation middleware

// ...existing code...
