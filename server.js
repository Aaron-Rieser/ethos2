function createPostElement(item) {
    const postDiv = document.createElement('div');
    postDiv.className = `post post-card${item.isDeal ? ' deal' : ''}`;
    
    // Format the date
    const date = new Date(item.created_at);
    const formattedTime = date.toLocaleString('en-US', {
        month: 'short', // "Jan"
        day: 'numeric', // "1"
        hour: 'numeric', // "12"
        minute: '2-digit', // "00"
        hour12: true // Use AM/PM
    });
    
    let imageHtml = item.image_url 
        ? `<img src="${item.image_url}" alt="Post image" style="max-width: 100%; margin-top: 10px;">` 
        : '';
    
    let dealHtml = '';
    if (item.isDeal && item.price) {
        const price = parseFloat(item.price);
        if (!isNaN(price)) {
            dealHtml = `
                <div class="deal-header">
                    <div class="deal-tag">Deal</div>
                    <div class="deal-price">$${price.toFixed(2)}</div>
                </div>
            `;
        }
    }

    // Check if current user owns this post (this will be set by the client-side code)
    const canEdit = item.canEdit || false;
    
    let editButton = '';
    let deleteButton = '';
    if (canEdit) {
        editButton = `<button class="edit-button" data-id="${item.id}" title="Edit">✏️</button>`;
        deleteButton = `<button class="delete-button" data-id="${item.id}" title="Delete">🗑️</button>`;
    }

    postDiv.innerHTML = `
        <div class="post-content">
            ${dealHtml}
            <div class="post-title" data-editable="${canEdit}">${item.title || 'Title'}</div>
            <div class="post-text" data-editable="${canEdit}">${item.post || 'No content available'}</div>  
            ${imageHtml}
            <small>${item.username || 'Anonymous'} • ${formattedTime}</small>                    
            <div class="feed-footer">
                <button class="upvote-button" data-id="${item.id}" data-type="${item.isDeal ? 'deal' : 'post'}">⬆️</button>
                <button class="downvote-button" data-id="${item.id}" data-type="${item.isDeal ? 'deal' : 'post'}">⬇️</button>
                <button class="comment-button" data-id="${item.id}" data-type="${item.isDeal ? 'deal' : 'post'}">💬</button>
                <button class="message-button" data-id="${item.id}" data-type="${item.isDeal ? 'deal' : 'post'}" data-user-id="${item.user_id}">✉️</button>
                ${editButton}
                ${deleteButton}
                <span class="upvote-count" data-id="${item.id}">${item.upvotes || 0} Upvotes</span>
            </div>
            <div class="comments-section">
                <div class="comments-container" id="comments-${item.id}"></div>
                <form class="comment-form" onsubmit="submitComment(event, ${item.id}, '${item.isDeal ? 'deal' : 'post'}')">
                    <input type="text" id="comment-input-${item.id}" class="comment-input" placeholder="Add a comment..." required>
                    <div id="comment-error-${item.id}" class="error-message" style="display: none;"></div>
                    <button type="submit">Comment</button>
                </form>
            </div>
        </div>
    `;
    
    const messageButton = postDiv.querySelector('.message-button');
    messageButton.addEventListener('click', () => handleMessage(item.id, item.user_id, item.isDeal ? 'deal' : 'post'));

    // Add event listener for upvote button
    const upvoteButton = postDiv.querySelector('.upvote-button');
    upvoteButton.addEventListener('click', () => handleUpvote(item.id, item.isDeal));
    upvoteButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent any default touch behavior
        handleUpvote(item.id, item.isDeal);
    });

    const downvoteButton = postDiv.querySelector('.downvote-button');
    downvoteButton.addEventListener('click', () => handleDownvote(item.id, item.isDeal));
    downvoteButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent any default touch behavior
        handleDownvote(item.id, item.isDeal);
    });

    const commentButton = postDiv.querySelector('.comment-button');
    const commentForm = postDiv.querySelector('.comment-form');
    commentButton.addEventListener('click', () => {
        commentForm.style.display = commentForm.style.display === 'none' || commentForm.style.display === '' 
            ? 'flex' 
            : 'none';
    });

    // Add edit functionality only if user owns the post
    if (canEdit) {
        const editButton = postDiv.querySelector('.edit-button');
        const deleteButton = postDiv.querySelector('.delete-button');
        editButton.addEventListener('click', () => enableEditMode(item.id));
        deleteButton.addEventListener('click', () => handleDelete(item.id));
    }

    loadComments(item.id, item.isDeal ? 'deal' : 'post');

    return postDiv;
}



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
const sgMail = require('@sendgrid/mail');

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

// SendGrid configuration
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid configured');
} else {
    console.log('SendGrid API key not found - email notifications disabled');
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

// Email notification functions
async function sendFollowerEmail(recipientEmail, recipientUsername, followerUsername) {
    if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email');
        return;
    }

    try {
        const msg = {
            to: recipientEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gumshoo.ca',
            subject: `${recipientUsername} - you have a new follower on Gumshoo!`,
            text: `${followerUsername} has followed you\n\nClick for more local content: ${process.env.GUMSHOO_URL || 'https://gumshoo.ca'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>${followerUsername} has followed you</h2>
                    <p>You have a new follower on Gumshoo!</p>
                    <a href="${process.env.GUMSHOO_URL || 'https://gumshoo.ca'}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Click for more local content
                    </a>
                </div>
            `
        };

        await sgMail.send(msg);
        console.log(`Follower email sent to ${recipientEmail}`);
    } catch (error) {
        console.error('Error sending follower email:', error);
    }
}

async function sendCommentEmail(recipientEmail, recipientUsername, commenterUsername, commentPreview, postTitle) {
    if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email');
        return;
    }

    try {
        const msg = {
            to: recipientEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gumshoo.ca',
            subject: `${recipientUsername} - you have a new comment on your post`,
            text: `${commenterUsername} commented: "${commentPreview}"\n\nWant to respond?\nClick for more local conversation on Gumshoo.ca: ${process.env.GUMSHOO_URL || 'https://gumshoo.ca'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>New comment on your post</h2>
                    <p><strong>${commenterUsername}</strong> commented:</p>
                    <blockquote style="border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0;">
                        "${commentPreview}"
                    </blockquote>
                    <p>Want to respond?</p>
                    <a href="${process.env.GUMSHOO_URL || 'https://gumshoo.ca'}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Click for more local conversation on Gumshoo.ca
                    </a>
                </div>
            `
        };

        await sgMail.send(msg);
        console.log(`Comment email sent to ${recipientEmail}`);
    } catch (error) {
        console.error('Error sending comment email:', error);
    }
}

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
            
            // Send email notification to post owner
            try {
                // Get post owner's email
                const postOwnerResult = await pool.query(
                    'SELECT user_id, title FROM posts WHERE id = $1',
                    [post_id]
                );
                
                if (postOwnerResult.rows.length > 0) {
                    const postOwnerId = postOwnerResult.rows[0].user_id;
                    const postTitle = postOwnerResult.rows[0].title;
                    
                    // Get post owner's email and username
                    const ownerResult = await pool.query(
                        'SELECT email, username FROM accounts WHERE auth0_id = $1',
                        [postOwnerId]
                    );
                    
                    if (ownerResult.rows.length > 0 && postOwnerId !== user_id) {
                        const ownerEmail = ownerResult.rows[0].email;
                        const ownerUsername = ownerResult.rows[0].username;
                        const commentPreview = comment.length > 100 ? comment.substring(0, 100) + '...' : comment;
                        
                        // Send email notification
                        await sendCommentEmail(ownerEmail, ownerUsername, username, commentPreview, postTitle);
                    }
                }
            } catch (emailError) {
                console.error('Error sending comment notification email:', emailError);
                // Don't fail the comment if email fails
            }
            
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
    console.log('=== ENSURE USER ACCOUNT DEBUG ===');
    console.log('Input parameters:', { user_id, email });
    
    if (!email) {
        console.error('No email found in token payload');
        throw new Error('No email found in token payload');
    }
    if (!user_id) {
        console.error('No user_id provided');
        throw new Error('No user_id provided');
    }

    try {
        const username = email.split('@')[0];
        console.log('Generated username:', username);
        
        const query = `INSERT INTO accounts (auth0_id, email, username) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (auth0_id) 
             DO UPDATE SET email = $2, username = $3
             RETURNING username`;
        
        console.log('Executing query:', query);
        console.log('Query parameters:', [user_id, email, username]);
        
        const result = await pool.query(query, [user_id, email, username]);
        
        console.log('Query result:', result.rows);
        console.log('Returning username:', result.rows[0]?.username);
        console.log('=== END ENSURE USER ACCOUNT DEBUG ===');
        
        return result.rows[0].username;
    } catch (error) {
        console.error('=== ENSURE USER ACCOUNT ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error detail:', error.detail);
        console.error('Error constraint:', error.constraint);
        console.error('Full error object:', error);
        console.error('=== END ENSURE USER ACCOUNT ERROR ===');
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
        const { post, title, latitude, longitude } = req.body;  // Removed neighbourhood
        
        if (!title) {  // Only require title
            console.error('Missing required fields:', { title });
            return res.status(400).json({ error: 'Title is required' });
        }

        const image_url = req.file ? req.file.path : null;
        
        // Simplified query without neighbourhood
        const query = `
            INSERT INTO posts (
                username, post, title, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        
        const values = [
            username, post, title, latitude, longitude, 
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

// Edit post endpoint
app.put('/api/posts/:postId', authenticateJWT, async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, post } = req.body;
        const user_id = req.auth.payload.sub;
        
        console.log('Edit post request:', { postId, title, post, user_id });
        
        // Verify ownership
        const ownershipCheck = await pool.query(
            'SELECT id FROM posts WHERE id = $1 AND user_id = $2',
            [postId, user_id]
        );
        
        if (ownershipCheck.rows.length === 0) {
            console.log('Unauthorized edit attempt:', { postId, user_id });
            return res.status(403).json({ error: 'Not authorized to edit this post' });
        }
        
        // Update post
        const result = await pool.query(
            'UPDATE posts SET title = $1, post = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [title, post, postId]
        );
        
        console.log('Post updated successfully:', result.rows[0]);
        clearCacheForItem(postId, false);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Error updating post' });
    }
});

// Delete post endpoint
app.delete('/api/posts/:postId', authenticateJWT, async (req, res) => {
    try {
        const { postId } = req.params;
        const user_id = req.auth.payload.sub;
        
        console.log('Delete post request:', { postId, user_id });
        
        // Verify ownership
        const ownershipCheck = await pool.query(
            'SELECT id FROM posts WHERE id = $1 AND user_id = $2',
            [postId, user_id]
        );
        
        if (ownershipCheck.rows.length === 0) {
            console.log('Unauthorized delete attempt:', { postId, user_id });
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
        
        // Delete post
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        
        console.log('Post deleted successfully:', postId);
        clearCacheForItem(postId, false);
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Error deleting post' });
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
        const { post, title, price, latitude, longitude } = req.body;  // Removed neighbourhood
        
        // Enhanced price validation
        const numericPrice = parseFloat(price);
        const numericLatitude = parseFloat(latitude);  
        const numericLongitude = parseFloat(longitude); 
        console.log('Parsed price:', numericPrice);

        if (!title) {  // Only require title
            console.error('Missing required fields:', { title });
            return res.status(400).json({ error: 'Title is required' });
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
                username, post, title, price, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;
        
        const values = [
            username, post, title, numericPrice, latitude, longitude, 
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

app.post('/api/missed-connections', authenticateJWT, upload.single('image'), async (req, res) => {    
    try {
        const user_id = req.auth.payload.sub;
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ error: 'User email not provided' });
        }
        
        const username = await ensureUserAccount(user_id, email);
        
        const { post, title, latitude, longitude } = req.body;  // Removed neighbourhood
        
        if (!title) {  // Only require title
            return res.status(400).json({ error: 'Title is required' });
        }

        const image_url = req.file ? req.file.path : null;
        
        const query = `
            INSERT INTO missed_connections (
                username, post, title, latitude, longitude, 
                image_url, user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        
        const values = [
            username, post, title, 
            latitude ? parseFloat(latitude) : null, 
            longitude ? parseFloat(longitude) : null,
            image_url, user_id
        ];

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating missed connection:', error);
        res.status(500).json({ error: 'Failed to create missed connection' });
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

        // Parse and validate numeric values
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Handle "all" radius option
        let radiusInKm;
        if (radius === 'all') {
            radiusInKm = 'all';
        } else {
            radiusInKm = parseFloat(radius);
            if (isNaN(radiusInKm)) {
                console.error('Invalid radius parameter:', { radius });
                return res.status(400).json({ 
                    error: 'Invalid radius parameter',
                    details: { provided: radius }
                });
            }
        }

        if (isNaN(latitude) || isNaN(longitude)) {
            console.error('Invalid coordinate parameters:', { lat, lng });
            return res.status(400).json({ 
                error: 'Invalid coordinate parameters',
                details: { 
                    latitude: isNaN(latitude),
                    longitude: isNaN(longitude)
                }
            });
        }

        // Validate coordinate ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.error('Coordinates out of range:', { latitude, longitude });
            return res.status(400).json({ 
                error: 'Coordinates out of range',
                details: { latitude, longitude }
            });
        }

        console.log('Executing query with radius:', radiusInKm);
        
        const query = radiusInKm === 'all' ? `
            SELECT 
                p.*,
                a.username,
                NULL AS distance
            FROM posts p
            LEFT JOIN accounts a ON p.user_id = a.auth0_id
            ORDER BY p.created_at DESC
        ` : `
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
        
        const values = radiusInKm === 'all' ? [] : [parseFloat(lat), parseFloat(lng), radiusInKm];
        console.log('Executing query with values:', values);

        const postsResult = radiusInKm === 'all' ? 
            await pool.query(query) : 
            await pool.query(query, values);
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
    res.sendFile('feed.html', { root: './public' });
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

        // Search only in posts table (deals table doesn't exist in production)
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

        const searchPattern = `%${searchTerm}%`;
        
        const postsResult = await pool.query(postsQuery, [searchPattern]);

        // Sort results by date
        const allResults = postsResult.rows
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(allResults);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Error performing search' });
    }
});

// Add endpoint to fetch individual post by ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const postQuery = `
            SELECT 
                p.*,
                a.username
            FROM posts p
            LEFT JOIN accounts a ON p.user_id = a.auth0_id
            WHERE p.id = $1
        `;
        
        const result = await pool.query(postQuery, [postId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Error fetching post' });
    }
});

app.get('/api/combined-feed', async (req, res) => {
    try {
        const { lat, lng, radius = 2 } = req.query;
        
        // Input validation
        if (!lat || !lng) {
            console.error('Missing location parameters:', { lat, lng });
            return res.status(400).json({ 
                error: 'Missing location parameters',
                details: { lat: !!lat, lng: !!lng }
            });
        }

        // Parse and validate numeric values
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Handle "all" radius option
        let radiusInKm;
        if (radius === 'all') {
            radiusInKm = 'all';
        } else {
            radiusInKm = parseFloat(radius);
            if (isNaN(radiusInKm)) {
                console.error('Invalid radius parameter:', { radius });
                return res.status(400).json({ 
                    error: 'Invalid radius parameter',
                    details: { provided: radius }
                });
            }
        }

        if (isNaN(latitude) || isNaN(longitude)) {
            console.error('Invalid coordinate parameters:', { lat, lng });
            return res.status(400).json({ 
                error: 'Invalid coordinate parameters',
                details: { 
                    latitude: isNaN(latitude),
                    longitude: isNaN(longitude)
                }
            });
        }

        // Validate coordinate ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.error('Coordinates out of range:', { latitude, longitude });
            return res.status(400).json({ 
                error: 'Coordinates out of range',
                details: { latitude, longitude }
            });
        }

        console.log('Fetching combined feed with params:', { latitude, longitude, radiusInKm });

        // Fetch posts with error handling
        let formattedPosts = [];
        try {
            // Get current user ID for following check
            let currentUserId = null;
            if (req.auth && req.auth.payload) {
                console.log('Checking user for follows:', req.auth.payload.sub);
                // Check if user exists in accounts table before using for follows
                const userCheck = await pool.query(
                    'SELECT auth0_id FROM accounts WHERE auth0_id = $1',
                    [req.auth.payload.sub]
                );
                if (userCheck.rows.length > 0) {
                    currentUserId = req.auth.payload.sub;
                    console.log('User found in accounts table, will check follows');
                } else {
                    console.log('User not found in accounts table, skipping follows check');
                }
            }

            const postsQuery = radiusInKm === 'all' ? `
                SELECT 
                    p.*, 
                    a.username,
                    false as "isDeal",
                    'post' as "type",
                    CASE WHEN f.auth0_following_id IS NOT NULL THEN 3 ELSE 1 END as follow_multiplier,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND post_type = 'post') as comment_count
                FROM posts p
                LEFT JOIN accounts a ON p.user_id = a.auth0_id
                LEFT JOIN follows f ON f.auth0_id = $1 AND f.auth0_following_id = p.user_id
            ` : `
                SELECT 
                    p.*, 
                    a.username,
                    false as "isDeal",
                    'post' as "type",
                    CASE WHEN f.auth0_following_id IS NOT NULL THEN 3 ELSE 1 END as follow_multiplier,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND post_type = 'post') as comment_count
                FROM posts p
                LEFT JOIN accounts a ON p.user_id = a.auth0_id
                LEFT JOIN follows f ON f.auth0_id = $1 AND f.auth0_following_id = p.user_id
                WHERE (
                    6371 * acos(
                        cos(radians($2)) * 
                        cos(radians(latitude)) * 
                        cos(radians(longitude) - radians($3)) + 
                        sin(radians($2)) * 
                        sin(radians(latitude))
                    )
                ) <= $4
            `;
            
            const postsResult = radiusInKm === 'all' ? 
                await pool.query(postsQuery, [currentUserId || null]) : 
                await pool.query(postsQuery, [currentUserId || null, latitude, longitude, radiusInKm]);
            
            // Hybrid recency + engagement sorting
            const sortedPosts = postsResult.rows.sort((a, b) => {
                const now = new Date();
                const aAge = (now - new Date(a.created_at)) / (1000 * 60 * 60); // hours
                const bAge = (now - new Date(b.created_at)) / (1000 * 60 * 60); // hours
                
                // Recency boost calculation
                const getRecencyBoost = (age, isOwnPost) => {
                    if (isOwnPost && age <= 2) return 10; // Own posts get 10x boost for first 2 hours
                    if (age <= 2) return 5; // Recent posts get 5x boost
                    if (age <= 24) return 2; // Day-old posts get 2x boost
                    return 1; // Older posts get normal boost
                };
                
                const aIsOwnPost = a.user_id === currentUserId;
                const bIsOwnPost = b.user_id === currentUserId;
                
                const aRecencyBoost = getRecencyBoost(aAge, aIsOwnPost);
                const bRecencyBoost = getRecencyBoost(bAge, bIsOwnPost);
                
                // Engagement score calculation
                const aEngagement = (a.upvotes || 0) + (a.comment_count || 0) * 2; // Comments worth 2x upvotes
                const bEngagement = (b.upvotes || 0) + (b.comment_count || 0) * 2;
                
                // Apply follow multiplier
                const aFinalEngagement = aEngagement * (a.follow_multiplier || 1);
                const bFinalEngagement = bEngagement * (b.follow_multiplier || 1);
                
                // Final score: recency boost + engagement
                const aScore = aRecencyBoost + aFinalEngagement;
                const bScore = bRecencyBoost + bFinalEngagement;
                
                return bScore - aScore; // Higher scores first
            });
            
            formattedPosts = sortedPosts.map(post => ({
                ...post,
                isDeal: false,
                created_at: new Date(post.created_at).toISOString()
            }));
            console.log(`Found ${formattedPosts.length} posts`);
        } catch (postsError) {
            console.error('Error fetching posts:', postsError);
            // Continue with other content types even if posts fail
        }

        // Use formatted posts directly (already sorted)
        const allContent = [...formattedPosts];

        console.log(`Returning ${allContent.length} total items`);
        res.json(allContent);

    } catch (error) {
        console.error('Error in /api/combined-feed:', error);
        // Send a more detailed error response
        res.status(500).json({ 
            error: 'Server Error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                code: error.code,
                detail: error.detail
            } : undefined
        });
    }
});

app.get('/api/map-posts', async (req, res) => {
    console.log('=== MAP POSTS REQUEST RECEIVED ===');
    console.log('Request query:', req.query);
    
    try {
        // Test database connection first
        try {
            console.log('Testing database connection...');
            await pool.query('SELECT 1');
            console.log('Database connection test successful');
        } catch (dbError) {
            console.error('Database connection test failed:', dbError);
            return res.status(500).json({ 
                error: 'Database connection error',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }

        // Check bounds parameter
        if (!req.query.bounds) {
            console.log('Missing bounds parameter');
            return res.status(400).json({ error: 'Missing bounds parameter' });
        }

        // Parse bounds parameter
        let bounds;
        try {
            bounds = JSON.parse(req.query.bounds);
            console.log('Parsed bounds:', bounds);
        } catch (parseError) {
            console.error('Error parsing bounds:', parseError);
            return res.status(400).json({ 
                error: 'Invalid bounds format',
                details: 'Bounds must be valid JSON' 
            });
        }

        // Validate bounds keys
        if (!bounds || 
            typeof bounds.north !== 'number' || 
            typeof bounds.south !== 'number' || 
            typeof bounds.east !== 'number' || 
            typeof bounds.west !== 'number') {
            console.error('Invalid bounds structure:', bounds);
            return res.status(400).json({ 
                error: 'Invalid bounds structure',
                details: 'Bounds must include north, south, east, and west as numbers'
            });
        }

        // Query with bounds filtering and all necessary fields
        const query = `
            SELECT 
                id, 
                title, 
                post, 
                latitude, 
                longitude, 
                image_url,
                created_at,
                upvotes,
                'post' as type,
                (SELECT COUNT(*) FROM comments WHERE post_id = posts.id AND post_type = 'post') as comment_count
            FROM posts 
            WHERE 
                latitude BETWEEN $1 AND $2 
                AND longitude BETWEEN $3 AND $4
            ORDER BY 
                (upvotes * 0.5 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 * 0.5) DESC
            LIMIT 200`;  // Increased limit to allow for filtering

        console.log('Executing query with bounds:', bounds);
        const result = await pool.query(query, [
            bounds.south,
            bounds.north,
            bounds.west,
            bounds.east
        ]);
        
        console.log(`Query successful, returned ${result.rows.length} rows`);
        res.json(result.rows);
        
    } catch (error) {
        console.error('=== MAP POSTS ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            error: 'Server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
    console.log('=== MAP POSTS REQUEST COMPLETE ===');
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        // Query including image_url for content display
        const query = `
            SELECT 
                id,
                username,
                post,
                upvotes,
                created_at,
                image_url
            FROM posts
            WHERE created_at >= NOW() - INTERVAL '30 days'
            ORDER BY upvotes DESC, created_at DESC
            LIMIT 10
        `;

        const result = await pool.query(query);
        
        // Format the response
        const leaderboard = result.rows.map(post => ({
            id: post.id,
            username: post.username || 'Anonymous',
            post: post.post,
            upvotes: post.upvotes || 0,
            created_at: post.created_at,
            image_url: post.image_url
        }));

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ 
            error: 'Error fetching leaderboard',
            details: error.message 
        });
    }
});

// Follow/Unfollow user
app.post('/api/follow/:userId', authenticateJWT, async (req, res) => {
    try {
        const followerId = req.auth.payload.sub;
        const followingId = req.params.userId;
        
        if (followerId === followingId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        
        // Check if both users exist in accounts table
        console.log('Checking users for follow:', { followerId, followingId });
        const userCheck = await pool.query(
            'SELECT auth0_id FROM accounts WHERE auth0_id = $1 OR auth0_id = $2',
            [followerId, followingId]
        );
        
        console.log('User check result:', userCheck.rows);
        console.log('User check count:', userCheck.rows.length);
        
        if (userCheck.rows.length < 2) {
            console.log('Not enough users found in accounts table');
            return res.status(400).json({ error: 'One or both users not found' });
        }
        
        // Check if already following
        const existingFollow = await pool.query(
            'SELECT * FROM follows WHERE auth0_id = $1 AND auth0_following_id = $2',
            [followerId, followingId]
        );
        
        if (existingFollow.rows.length > 0) {
            // Unfollow
            await pool.query(
                'DELETE FROM follows WHERE auth0_id = $1 AND auth0_following_id = $2',
                [followerId, followingId]
            );
            res.json({ following: false });
        } else {
            // Follow
            await pool.query(
                'INSERT INTO follows (auth0_id, auth0_following_id) VALUES ($1, $2)',
                [followerId, followingId]
            );
            
            // Send email notification to followed user
            try {
                // Get follower's username
                const followerResult = await pool.query(
                    'SELECT username FROM accounts WHERE auth0_id = $1',
                    [followerId]
                );
                
                // Get followed user's email and username
                const followedResult = await pool.query(
                    'SELECT email, username FROM accounts WHERE auth0_id = $1',
                    [followingId]
                );
                
                if (followerResult.rows.length > 0 && followedResult.rows.length > 0) {
                    const followerUsername = followerResult.rows[0].username;
                    const followedEmail = followedResult.rows[0].email;
                    const followedUsername = followedResult.rows[0].username;
                    
                    // Send email notification
                    await sendFollowerEmail(followedEmail, followedUsername, followerUsername);
                }
            } catch (emailError) {
                console.error('Error sending follower notification email:', emailError);
                // Don't fail the follow if email fails
            }
            
            res.json({ following: true });
        }
            } catch (error) {
            console.error('Error following/unfollowing:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                detail: error.detail,
                followerId,
                followingId
            });
            res.status(500).json({ error: 'Error following/unfollowing user' });
        }
});

// Get user's following list
app.get('/api/following', authenticateJWT, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        // Check if user exists in accounts table
        const userCheck = await pool.query(
            'SELECT auth0_id FROM accounts WHERE auth0_id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.json([]); // Return empty array if user doesn't exist
        }
        
        const result = await pool.query(
            'SELECT auth0_following_id FROM follows WHERE auth0_id = $1',
            [userId]
        );
        res.json(result.rows.map(row => row.auth0_following_id));
    } catch (error) {
        console.error('Error getting following list:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            userId
        });
        res.status(500).json({ error: 'Error getting following list' });
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