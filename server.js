const express = require('express');
const pool = require('./db');
const NodeCache = require('node-cache');
const RSSParser = require('rss-parser');
const app = express();

// Initialize cache and parser
const cache = new NodeCache({ stdTTL: 300 });
const parser = new RSSParser();

app.use(express.json());
app.use(express.static('public'));

// Define feeds
const FEEDS = [
    {
        url: 'https://weather.gc.ca/rss/city/on-143_e.xml',  // Changed back to main feed
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
    }
];

async function fetchAllFeeds() {
    try {
        const feedPromises = FEEDS.map(async feed => {
            try {
                const parsedFeed = await parser.parseURL(feed.url);
                // transform will return null for non-current condition items
                return parsedFeed.items
                    .map(item => feed.transform(item))
                    .filter(item => item !== null);  // Remove null items
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

// Your existing POST endpoint for creating posts
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});