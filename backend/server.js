const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS configuration
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
    origin: allowedOrigin
}));

// Rate limiter: limit each IP to 10 requests per minute
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10
});
app.use(limiter);

app.post('/api/generate-lesson', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', errorText);
            return res.status(response.status).json({ error: 'Anthropic API error', details: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
