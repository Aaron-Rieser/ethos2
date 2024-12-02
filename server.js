const express = require('express');
const pool = require('./db');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// POST endpoint for creating posts
app.post('/api/posts', async (req, res) => {
    try {
        const { neighbourhood, username, post } = req.body;
        const newPost = await pool.query(
            'INSERT INTO posts (neighbourhood, username, post) VALUES ($1, $2, $3) RETURNING *',
            [neighbourhood, username, post]
        );
        res.json(newPost.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET endpoint for retrieving posts
app.get('/api/posts', async (req, res) => {
    try {
        console.log('Fetching posts from database...');
        const { neighbourhood } = req.query;
        
        let query = 'SELECT * FROM posts';
        let values = [];

        if (neighbourhood) {
            query += ' WHERE neighbourhood = $1';
            values = [neighbourhood];
            console.log(`Filtering posts for neighbourhood: ${neighbourhood}`);
        }

        query += ' ORDER BY id DESC';  // Keeping your existing ORDER BY id DESC

        const allPosts = await pool.query(query, values);
        console.log('Posts retrieved:', allPosts.rows);
        res.json(allPosts.rows);
    } catch (err) {
        console.error('Error fetching posts:', err.message);
        res.status(500).send('Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});