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

app.use(express.json());
app.use(express.static('public'));

// Verify required environment variables
const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

console.log('Initializing database connection...');
pool.connect()
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

console.log('Checking Cloudinary environment variables:');
console.log('CLOUD_NAME present:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('API_KEY present:', !!process.env.CLOUDINARY_API_KEY);
console.log('API_SECRET present:', !!process.env.CLOUDINARY_API_SECRET);

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

const cache = new NodeCache({ stdTTL: 300 });
const parser = new RSSParser();

function clearCacheForItem(id, isDeal) {
    const itemType = isDeal ? 'deals' : 'posts';
    // Clear both specific neighborhood cache and all items cache
    cache.keys().forEach(key => {
        if (key.startsWith(itemType)) {
            cache.del(key);
        }
    });
}

const authenticateJWT = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
});

app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { type } = req.query;  // Get the type from query params
        
        console.log('Fetching comments for:', { postId, type });
        console.log('Request received for comments, URL:', req.url);
        console.log('Request headers:', req.headers);
        
        // Determine which table to check based on type
        const table = type === 'deal' ? 'deals' : 'posts';
        
        // First verify the post/deal exists
        const itemExists = await pool.query(
            `SELECT id FROM ${table} WHERE id = $1`,
            [postId]
        );

        if (itemExists.rows.length === 0) {
            return res.status(404).json({ error: `${type || 'post'} not found` });
        }

        const comments = await pool.query(
            'SELECT * FROM comments WHERE post_id = $1 AND post_type = $2 ORDER BY created_at DESC',
            [postId, type || 'post']
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
        const { post_id, comment, post_type } = req.body;
        const user_id = req.auth.payload.sub;
        
        // Add extensive logging
        console.log('Comment request received:', {
            post_id,
            post_type,
            user_id,
            comment_length: comment?.length
        });

        // Get username from accounts
        const userResult = await pool.query(
            'SELECT username FROM accounts WHERE auth0_id = $1',
            [user_id]
        );
        
        console.log('User lookup result:', userResult.rows);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        const username = userResult.rows[0].username;

        // Try to insert comment with explicit transaction
        await pool.query('BEGIN');

        try {
            const insertQuery = `
                INSERT INTO comments 
                (post_id, comment, user_id, username, post_type) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING *
            `;
            
            console.log('Executing insert with params:', {
                post_id,
                comment_preview: comment?.substring(0, 20),
                user_id,
                username,
                post_type
            });

            const result = await pool.query(insertQuery, [
                post_id,
                comment,
                user_id,
                username,
                post_type || 'post'  // Default to 'post' if not specified
            ]);

            await pool.query('COMMIT');
            console.log('Comment inserted successfully:', result.rows[0]);
            
            res.json(result.rows[0]);
        } catch (insertError) {
            await pool.query('ROLLBACK');
            console.error('Insert transaction failed:', {
                error: insertError.message,
                code: insertError.code,
                detail: insertError.detail,
                constraint: insertError.constraint
            });
            throw insertError;
        }
    } catch (error) {
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            where: error.where
        });
        
        res.status(500).json({ 
            error: 'Error adding comment',
            details: error.message,
            code: error.code
        });
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
        const { neighbourhood, post, title, latitude, longitude } = req.body;
        
        if (!neighbourhood || !post || !title) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const image_url = req.file ? req.file.path : null;
        
        // Simplified query without post_type
        const query = `
            INSERT INTO posts (
                neighbourhood, username, post, title, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;
        
        const values = [
            neighbourhood, username, post, title, latitude, longitude, 
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

app.post('/api/posts/:postId/upvote', authenticateJWT, async (req, res) => {
    const { postId } = req.params;

    try {
        console.log('Attempting to upvote post:', postId);
        
        const result = await pool.query(
            'UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *',
            [postId]
        );

        console.log('Upvote query result:', result.rows);

        if (result.rows.length === 0) {
            console.log('No post found with ID:', postId);
            return res.status(404).json({ error: 'Post not found' });
        }

        clearCacheForItem(postId, false);
        console.log('Cache cleared for post:', postId);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Detailed error updating upvotes for post:', error);
        res.status(500).json({ error: 'Error updating upvotes' });
    }
});

app.post('/api/posts/:postId/downvote', authenticateJWT, async (req, res) => {
    const { postId } = req.params;

    try {
        const result = await pool.query(
            'UPDATE posts SET downvotes = downvotes + 1 WHERE id = $1 RETURNING *',
            [postId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        clearCacheForItem(postId, false);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating downvotes for post:', error);
        res.status(500).json({ error: 'Error updating downvotes' });
    }
});

app.post('/api/deals', authenticateJWT, upload.single('image'), async (req, res) => {    
    res.setHeader('Content-Type', 'application/json');
    
    try {
        console.log('Deals endpoint hit');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('Full auth payload:', req.auth.payload);

        const user_id = req.auth.payload.sub;
        const email = req.body.email;

        console.log('Email from form:', email);
        console.log('Raw price value:', req.body.price); // Add price logging

        if (!email) {
            console.error('No email provided in request');
            return res.status(400).json({ error: 'User email not provided' });
        }
        
        const username = await ensureUserAccount(user_id, email);
        
        console.log('Received file:', req.file);
        const { neighbourhood, post, title, price, latitude, longitude } = req.body;
        
        // Enhanced price validation
        const numericPrice = parseFloat(price);
        const numericLatitude = parseFloat(latitude);  
        const numericLongitude = parseFloat(longitude); 
        console.log('Parsed price:', numericPrice);

        if (!neighbourhood || !post || !title) {
            console.error('Missing required fields:', { neighbourhood, post, title });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!price || isNaN(numericPrice)) {
            console.error('Invalid price value:', { price, numericPrice });
            return res.status(400).json({ error: 'Invalid price format' });
        }

        if (numericPrice < 0 || numericPrice > 999999999.99) {
            console.error('Price out of range:', numericPrice);
            return res.status(400).json({ error: 'Price must be between 0 and 999,999,999.99' });
        }

        const image_url = req.file ? req.file.path : null;
        
        // Log the final values before database insertion
        console.log('Inserting deal with values:', {
            neighbourhood,
            username,
            post,
            title,
            price: numericPrice,
            latitude,
            longitude,
            image_url,
            user_id
        });

        const query = `
            INSERT INTO deals (
                neighbourhood, username, post, title, price, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *
        `;
        
        const values = [
            neighbourhood, username, post, title, numericPrice, latitude, longitude, 
            image_url, user_id
        ];

        const result = await pool.query(query, values);
        console.log('Deal inserted successfully:', result.rows[0]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Detailed error:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail
        });

        if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'File too large', 
                details: 'Maximum file size is 5MB' 
            });
        }
        if (err.name === 'MulterError') {
            return res.status(400).json({ error: 'File upload error', details: err.message });
        }
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message,
            code: err.code 
        });
    }
});

app.post('/api/deals/:dealId/upvote', authenticateJWT, async (req, res) => {
    const { dealId } = req.params;

    try {
        const result = await pool.query(
            'UPDATE deals SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *',
            [dealId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        // Clear cache after successful upvote
        clearCacheForItem(dealId, true);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating upvotes for deal:', error);
        res.status(500).json({ error: 'Error updating upvotes' });
    }
});

app.post('/api/deals/:dealId/downvote', authenticateJWT, async (req, res) => {
    const { dealId } = req.params;

    try {
        const result = await pool.query(
            'UPDATE deals SET downvotes = downvotes + 1 WHERE id = $1 RETURNING *',
            [dealId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        clearCacheForItem(dealId, true);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating downvotes for deal:', error);
        res.status(500).json({ error: 'Error updating downvotes' });
    }
});

app.post('/api/messages', authenticateJWT, async (req, res) => {
    try {
        const { recipient_id, message, reference_id, reference_type } = req.body;
        const sender_id = req.auth.payload.sub;
        
        // Get or create conversation
        const conversationResult = await pool.query(
            `SELECT id FROM conversations 
             WHERE (participant1_id = $1 AND participant2_id = $2)
             OR (participant1_id = $2 AND participant2_id = $1)`,
            [sender_id, recipient_id]
        );

        let conversation_id;
        if (conversationResult.rows.length === 0) {
            const newConversation = await pool.query(
                `INSERT INTO conversations (participant1_id, participant2_id)
                 VALUES ($1, $2) RETURNING id`,
                [sender_id, recipient_id]
            );
            conversation_id = newConversation.rows[0].id;
        } else {
            conversation_id = conversationResult.rows[0].id;
        }

        // Update conversation last_message_at
        await pool.query(
            `UPDATE conversations 
             SET last_message_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [conversation_id]
        );

        // Insert message
        const result = await pool.query(
            `INSERT INTO messages 
             (sender_id, recipient_id, message, reference_id, reference_type, conversation_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [sender_id, recipient_id, message, reference_id, reference_type, conversation_id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

app.post('/api/conversations', authenticateJWT, async (req, res) => {
    try {
        const { recipient_id } = req.body;
        const sender_id = req.auth.payload.sub;

        // Try to find existing conversation
        let result = await pool.query(
            `SELECT id FROM conversations 
             WHERE (participant1_id = $1 AND participant2_id = $2)
             OR (participant1_id = $2 AND participant2_id = $1)`,
            [sender_id, recipient_id]
        );

        // If no conversation exists, create one
        if (result.rows.length === 0) {
            result = await pool.query(
                `INSERT INTO conversations (participant1_id, participant2_id)
                 VALUES ($1, $2) RETURNING id`,
                [sender_id, recipient_id]
            );
        }

        res.json({ conversation_id: result.rows[0].id });
    } catch (error) {
        console.error('Error with conversation:', error);
        res.status(500).json({ error: 'Error managing conversation' });
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

// radius based
app.get('/api/posts', async (req, res) => {
    try {
        const { lat, lng, radius = 2 } = req.query;  // Default radius to 2
        
        console.log('Received request for posts:', { lat, lng, radius });
        
        if (!lat || !lng) {
            console.log('Missing parameters:', { lat, lng, radius });
            return res.status(400).json({ 
                error: 'Missing location parameters',
                details: { lat, lng, radius }
            });
        }

        const radiusInKm = parseFloat(radius);
        if (isNaN(radiusInKm)) {
            return res.status(400).json({ 
                error: 'Invalid radius parameter',
                details: { provided: radius }
            });
        }

        console.log('Executing query with radius:', radiusInKm);
        
        const query = `
            SELECT 
                p.*,
                a.username,
                (
                    6371 * acos(
                        cos(radians($1)) * 
                        cos(radians(latitude)) * 
                        cos(radians(longitude) - radians($2)) + 
                        sin(radians($1)) * 
                        sin(radians(latitude))
                    )
                ) AS distance
            FROM posts p
            LEFT JOIN accounts a ON p.user_id = a.auth0_id
            WHERE (
                6371 * acos(
                    cos(radians($1)) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * 
                    sin(radians(latitude))
                )
            ) <= $3
            ORDER BY p.created_at DESC
        `;
        
        const values = [parseFloat(lat), parseFloat(lng), radiusInKm];
        console.log('Executing query with values:', values);

        const postsResult = await pool.query(query, values);
        console.log(`Found ${postsResult.rows.length} posts`);

        // Format dates and add feeds
        const formattedPosts = postsResult.rows.map(post => {
            console.log('Processing post:', post.id);
            return {
                ...post,
                created_at: new Date(post.created_at).toISOString()
            };
        });

        // Add feeds if they exist
        console.log('Fetching additional feed items...');
        const feedItems = await fetchAllFeeds();
        console.log(`Found ${feedItems.length} additional feed items`);

        const combinedContent = [...formattedPosts, ...feedItems];
        console.log(`Returning ${combinedContent.length} total items`);

        res.json(combinedContent);

    } catch (err) {
        console.error('Error in /api/posts:', err);
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

app.get('/api/deals', async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        
        // Add detailed validation logging
        console.log('Received location parameters:', { lat, lng, radius });
        
        if (!lat || !lng || !radius) {
            console.log('Missing parameters:', { lat, lng, radius });
            return res.status(400).json({ 
                error: 'Missing location parameters',
                details: {
                    lat: !!lat,
                    lng: !!lng,
                    radius: !!radius
                }
            });
        }

        const radiusInKm = parseFloat(radius);
        
        const query = `
            SELECT *, 
            (
                6371 * acos(
                    cos(radians($1)) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * 
                    sin(radians(latitude))
                )
            ) AS distance
            FROM deals
            WHERE (
                6371 * acos(
                    cos(radians($1)) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * 
                    sin(radians(latitude))
                )
            ) <= $3
            ORDER BY created_at DESC
        `;
        
        const values = [parseFloat(lat), parseFloat(lng), radiusInKm];
        const result = await pool.query(query, values);

        const formattedDeals = result.rows.map(deal => ({
            ...deal,
            created_at: new Date(deal.created_at).toISOString()
        }));
        
        res.json(formattedDeals);
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({ error: 'Error fetching deals', details: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

app.get('/api/messages/inbox', authenticateJWT, async (req, res) => {
    try {
        const user_id = req.auth.payload.sub;
        
        const conversations = await pool.query(
            `SELECT 
                c.id as conversation_id,
                c.last_message_at,
                CASE 
                    WHEN c.participant1_id = $1 THEN a2.username
                    ELSE a1.username
                END as other_participant_username,
                (SELECT message FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC LIMIT 1) as last_message
             FROM conversations c
             JOIN accounts a1 ON c.participant1_id = a1.auth0_id
             JOIN accounts a2 ON c.participant2_id = a2.auth0_id
             WHERE c.participant1_id = $1 OR c.participant2_id = $1
             ORDER BY c.last_message_at DESC`,
            [user_id]
        );
        
        res.json(conversations.rows);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Error fetching conversations' });
    }
});

app.get('/api/messages/unread/count', authenticateJWT, async (req, res) => {
    try {
        const user_id = req.auth.payload.sub;
        
        const result = await pool.query(
            `SELECT COUNT(*) 
             FROM messages 
             WHERE recipient_id = $1 
             AND read_at IS NULL`,
            [user_id]
        );
        
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error counting unread messages:', error);
        res.status(500).json({ error: 'Error counting unread messages' });
    }
});

app.post('/api/conversations/:conversationId/mark-read', authenticateJWT, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const user_id = req.auth.payload.sub;
        
        await pool.query(
            `UPDATE messages 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE conversation_id = $1 
             AND recipient_id = $2 
             AND read_at IS NULL`,
            [conversationId, user_id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Error marking messages as read' });
    }
});

app.get('/api/conversations/:conversationId/messages', authenticateJWT, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const user_id = req.auth.payload.sub;
        
        // Verify user is part of this conversation
        const conversationCheck = await pool.query(
            `SELECT id FROM conversations 
             WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)`,
            [conversationId, user_id]
        );
        
        if (conversationCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view this conversation' });
        }

        const messages = await pool.query(
            `SELECT m.*, a.username as sender_username
             FROM messages m
             JOIN accounts a ON m.sender_id = a.auth0_id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC`,
            [conversationId]
        );
        
        res.json(messages.rows);
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Mark message as read
app.put('/api/messages/:messageId/read', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const user_id = req.auth.payload.sub;

        const result = await pool.query(
            `UPDATE messages 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND recipient_id = $2
             RETURNING *`,
            [messageId, user_id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Error marking message as read' });
    }
});

// Add this new endpoint for search
app.get('/api/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        // Search in both posts and deals tables
        const postsQuery = `
            SELECT 
                p.*,
                'post' as item_type,
                a.username
            FROM posts p
            LEFT JOIN accounts a ON p.user_id = a.auth0_id
            WHERE 
                (LOWER(p.title) LIKE LOWER($1) OR 
                 LOWER(p.post) LIKE LOWER($1))
        `;

        const dealsQuery = `
            SELECT 
                d.*,
                'deal' as item_type,
                true as isDeal,
                a.username
            FROM deals d
            LEFT JOIN accounts a ON d.user_id = a.auth0_id
            WHERE 
                (LOWER(d.title) LIKE LOWER($1) OR 
                 LOWER(d.post) LIKE LOWER($1))
        `;

        const searchPattern = `%${searchTerm}%`;
        
        const [postsResult, dealsResult] = await Promise.all([
            pool.query(postsQuery, [searchPattern]),
            pool.query(dealsQuery, [searchPattern])
        ]);

        // Combine and sort results by date
        const allResults = [...postsResult.rows, ...dealsResult.rows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(allResults);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Error performing search' });
    }
});

app.get('/api/combined-feed', async (req, res) => {
    try {
        const { lat, lng, radius = 2 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing location parameters' });
        }
        const radiusInKm = parseFloat(radius);

        // Fetch posts
        const postsQuery = `
            SELECT 
                p.*, 
                a.username,
                false as "isDeal"
            FROM posts p
            LEFT JOIN accounts a ON p.user_id = a.auth0_id
            WHERE (
                6371 * acos(
                    cos(radians($1)) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * 
                    sin(radians(latitude))
                )
            ) <= $3
        `;
        const postsResult = await pool.query(postsQuery, [parseFloat(lat), parseFloat(lng), radiusInKm]);
        const formattedPosts = postsResult.rows.map(post => ({
            ...post,
            isDeal: false,
            created_at: new Date(post.created_at).toISOString()
        }));

        // Fetch deals
        const dealsQuery = `
            SELECT 
                d.*, 
                a.username,
                true as "isDeal"
            FROM deals d
            LEFT JOIN accounts a ON d.user_id = a.auth0_id
            WHERE (
                6371 * acos(
                    cos(radians($1)) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * 
                    sin(radians(latitude))
                )
            ) <= $3
        `;
        const dealsResult = await pool.query(dealsQuery, [parseFloat(lat), parseFloat(lng), radiusInKm]);
        const formattedDeals = dealsResult.rows.map(deal => ({
            ...deal,
            isDeal: true,
            created_at: new Date(deal.created_at).toISOString()
        }));

        // Combine and sort by recency
        const allContent = [...formattedPosts, ...formattedDeals].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json(allContent);
    } catch (error) {
        console.error('Error in /api/combined-feed:', error);
        res.status(500).json({ error: 'Server Error', details: error.message });
    }
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