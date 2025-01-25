require('dotenv').config();

const express = require('express');
const pool = require('./db');
const NodeCache = require('node-cache');
const RSSParser = require('rss-parser');
const app = express();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { auth } = require('express-oauth2-jwt-bearer');
const authenticateJWT = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
});
// Verify required environment variables
const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

console.log('Initializing database connection...');
pool.connect()
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

console.log('Checking Cloudinary environment variables:');
console.log('CLOUD_NAME present:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('API_KEY present:', !!process.env.CLOUDINARY_API_KEY);
console.log('API_SECRET present:', !!process.env.CLOUDINARY_API_SECRET);

// 2. Initialize cache and parser
const cache = new NodeCache({ stdTTL: 300 });
const parser = new RSSParser();

app.use(express.json());
app.use(express.static('public'));

// 3. Cloudinary configuration MUST come before storage and upload
try {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Test connection
    cloudinary.api.ping()
        .then(result => console.log('Cloudinary connected:', result))
        .catch(error => {
            console.error('Cloudinary connection error:', error);
            process.exit(1);
        });
} catch (error) {
    console.error('Cloudinary configuration error:', error);
    process.exit(1);
}

// 4. Then storage configuration (AFTER the try-catch block)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'posts',
        allowed_formats: ['jpg', 'jpeg', 'png'] 
    }
});

// 5. Then upload middleware
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        console.log('Fetching comments for post:', postId);
        console.log('Request received for comments, URL:', req.url);
        console.log('PostId:', postId);
        console.log('Request headers:', req.headers);

        const comments = await pool.query(
            'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
            [postId]
        );

        console.log('Found comments:', comments.rows);
        console.log('Query executed, found comments:', comments.rows.length);
        
        res.json(comments.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        console.error('Detailed error in comments:', error);
        res.status(500).json({ error: 'Error fetching comments' });
    }
});

app.post('/api/comments', authenticateJWT, async (req, res) => {
    try {
        const { post_id, comment, email } = req.body;  // Get email from request body
        const user_id = req.auth.payload.sub;
        
        // Add debug logging
        console.log('Comment attempt:', {
            post_id,
            comment,
            user_id,
            email,  // Log the email we got from the form
            auth: req.auth.payload
        });

        if (!email) {
            console.error('No email provided in comment request');
            return res.status(400).json({ error: 'User email not provided' });
        }

        // Use ensureUserAccount like we did in posts
        const username = await ensureUserAccount(user_id, email);

        const result = await pool.query(
            'INSERT INTO comments (post_id, comment, user_id, username) VALUES ($1, $2, $3, $4) RETURNING *',
            [post_id, comment, user_id, username]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Error adding comment', details: error.message });
    }
});

app.post('/api/account', authenticateJWT, async (req, res) => {
    try {
        const auth0_id = req.auth.payload.sub;  // Changed from req.user.sub
        const email = req.auth.payload.email;   // Changed from req.user.email
        const userResult = await pool.query(
            'SELECT username FROM accounts WHERE auth0_id = $1',
            [auth0_id]  // Changed from user_id
        );
        console.log('Account lookup result:', userResult.rows);
        const username = email.split('@')[0];

        const result = await pool.query(
            `INSERT INTO accounts (auth0_id, email, username) 
             VALUES ($1, $2, $3)
             ON CONFLICT (auth0_id) 
             DO UPDATE SET email = $2, username = $3
             RETURNING *`,
            [auth0_id, email, username]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error managing account:', error);
        res.status(500).json({ error: 'Error managing account' });
    }
});

async function ensureUserAccount(user_id, email) {
    if (!email) {
        throw new Error('No email found in token payload');
    }
    if (!user_id) {
        throw new Error('No user_id provided');
    }

    try {
        const username = email.split('@')[0];
        const result = await pool.query(
            `INSERT INTO accounts (auth0_id, email, username) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (auth0_id) 
             DO UPDATE SET email = $2, username = $3
             RETURNING username`,
            [user_id, email, username]
        );
        return result.rows[0].username;
    } catch (error) {
        console.error('Error ensuring user account:', error);
        throw new Error('Failed to create/update user account');
    }
}

app.post('/api/posts', authenticateJWT, upload.single('image'), async (req, res) => {    
    try {
        console.log('Full auth payload:', req.auth.payload);
        console.log('Form Data:', req.body);

        const user_id = req.auth.payload.sub;
        const email = req.body.email;

        console.log('Email from form:', email);

        if (!email) {
            console.error('No email provided in request');
            return res.status(400).json({ error: 'User email not provided' });
        }
        
        const username = await ensureUserAccount(user_id, email);
        
        console.log('Received file:', req.file);
        const { neighbourhood, post, latitude, longitude } = req.body;
        
        if (!neighbourhood || !post) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const image_url = req.file ? req.file.path : null;
        
        // Simplified query without post_type
        const query = `
            INSERT INTO posts (
                neighbourhood, username, post, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        
        const values = [
            neighbourhood, username, post, latitude, longitude, 
            image_url, user_id
        ];

        const result = await pool.query(query, values);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Detailed error:', err);
        if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'File too large', 
                details: 'Maximum file size is 5MB' 
            });
        }
        if (err.name === 'MulterError') {
            return res.status(400).json({ error: 'File upload error', details: err.message });
        }
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// Define feeds
const FEEDS = [
    // Weather Feed
    {
        url: 'https://weather.gc.ca/rss/city/on-143_e.xml',
        source: 'Environment Canada',
        type: 'atom',
        transform: (item) => {
            console.log('Raw feed item:', item);
            
            // Only transform if it's a current conditions item
            if (item.title && item.title.includes('Current Conditions')) {
                const transformedItem = {
                    type: 'feed',
                    source: 'Toronto Weather',
                    title: 'Current Conditions',
                    content: item.summary,
                    link: item.link,
                    date: new Date(item.pubDate || item.isoDate),
                    weather: {
                        temperature: item.summary?.match(/Temperature:\s*([-\d.]+)/)?.[1] || 'N/A',
                        conditions: item.summary?.match(/Condition:\s*([^,\n]+)/)?.[1] || 'N/A'
                    }
                };

                console.log('Transformed item:', transformedItem);
                return transformedItem;
            }
            return null;  // Skip non-current condition items
        }
    },
    // Road Alerts Feed
    {
        url: 'https://511on.ca/api/v2/get/event',
        source: '511 Ontario',
        type: 'json',
        transform: (events) => {
            // Toronto approximate boundaries
            const TORONTO_BOUNDS = {
                north: 43.855,
                south: 43.581,
                east: -79.116,
                west: -79.639
            };

            // Filter for Toronto events
            const torontoEvents = events.filter(event => {
                const lat = parseFloat(event.Latitude);
                const lon = parseFloat(event.Longitude);
                
                return lat >= TORONTO_BOUNDS.south 
                    && lat <= TORONTO_BOUNDS.north
                    && lon >= TORONTO_BOUNDS.west
                    && lon <= TORONTO_BOUNDS.east;
            });

            if (torontoEvents.length === 0) return null;

            // Combine all events into a single feed item
            return {
                type: 'feed',
                source: 'Toronto Road Alerts',
                title: 'Current Road Alerts',
                content: torontoEvents.map(event => 
                    `${event.RoadwayName}: ${event.Description}`
                ).join('\n\n'),
                link: 'https://511on.ca',
                date: new Date(),
                roadAlerts: {
                    count: torontoEvents.length,
                    events: torontoEvents
                }
            };
        }
    }
];

async function fetchAllFeeds() {
    try {
        console.log('Starting to fetch all feeds...');
        console.log('FEEDS array:', FEEDS); // Check what feeds are being processed

        const feedPromises = FEEDS.map(async feed => {
            try {
                if (feed.type === 'json') {
                    // Handle JSON feeds (511 traffic)
                    const response = await fetch(feed.url);
                    const data = await response.json();
                    return [feed.transform(data)].filter(item => item !== null);
                } else {
                    // Handle RSS/ATOM feeds (weather)
                    const parsedFeed = await parser.parseURL(feed.url);
                    console.log(`Raw feed item:`, parsedFeed.items[0]); // Log first item

                    return parsedFeed.items
                        .map(item => feed.transform(item))
                        .filter(item => item !== null);
                }
            } catch (error) {
                console.error(`Error fetching ${feed.source}:`, error);
                return [];
            }
        });
        return (await Promise.all(feedPromises)).flat();
    } catch (error) {
        console.error('Error fetching feeds:', error);
        return [];
    }
}

// Modified GET endpoint to include feeds
app.get('/api/posts', async (req, res) => {
    try {
        console.log('Fetching posts and feeds...');
        const { neighbourhood } = req.query;
        
        // Check cache first
        const cacheKey = `posts_${neighbourhood || 'all'}`;
        const cachedContent = cache.get(cacheKey);
        if (cachedContent) {
            return res.json(cachedContent);
        }

        // Fetch posts from database
        let query = 'SELECT * FROM posts';
        let values = [];

        if (neighbourhood) {
            query += ' WHERE neighbourhood = $1';
            values = [neighbourhood];
            console.log(`Filtering posts for neighbourhood: ${neighbourhood}`);
        }

        query += ' ORDER BY id DESC';

        const allPosts = await pool.query(query, values);
        const posts = allPosts.rows.map(post => ({
            ...post,
            type: 'post'
        }));

        // Fetch feed content
        const feedItems = await fetchAllFeeds();

        // Combine posts and feeds, sort by date
        const combinedContent = [...posts, ...feedItems].sort((a, b) => {
            const dateA = new Date(a.created_at || a.date);
            const dateB = new Date(b.created_at || b.date);
            return dateB - dateA;
        });

        // Cache the result
        cache.set(cacheKey, combinedContent);

        console.log('Combined content retrieved');
        res.json(combinedContent);
    } catch (err) {
        console.error('Error fetching content:', err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Existing SIGTERM handler
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end();
        process.exit(0);
    });
});

// Add SIGINT handler here
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end();
        process.exit(0);
    });
});

// Add unhandled rejection handler here
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Add actual error handling
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    server.close(() => {
        pool.end();
        process.exit(1);
    });
});