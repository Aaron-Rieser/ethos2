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
    // Weather Feed (keeping as is)
    {
        url: 'https://weather.gc.ca/rss/city/on-143_e.xml',
        source: 'Environment Canada',
        type: 'atom',
        transform: (item) => {
            // Your existing weather transform
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
    },
    // Library Feed (modified to combine all items)
    {
        url: 'https://www.torontopubliclibrary.ca/rss.jsp?N=&Ns=p_date_acquired_sort&Nso=1&Ntt=Toronto',
        source: 'Toronto Public Library',
        type: 'atom',
        transform: (data) => {
            console.log('TPL Raw feed data:', data);

            // Get all items and take first 10
            const items = data.items?.slice(0, 10) || [];
            
            if (items.length === 0) {
                console.log('No TPL items found');
                return null;
            }

            // Return single combined feed item
            return {
                type: 'feed',
                source: 'TPL New Toronto Books',
                title: 'New at the Library',
                content: items.map(item => item.title).join('\n'),
                link: 'https://www.torontopubliclibrary.ca/search.jsp?Ntt=Toronto&sort=newest',
                date: new Date(),
                books: {
                    count: items.length,
                    items: items.map(item => ({
                        title: item.title,
                        link: item.link,
                        date: new Date(item.pubDate || item.isoDate),
                        type: item.contentSnippet?.match(/Book|DVD|CD/i)?.[0] || 'Item'
                    }))
                }
            };
        }
    }
];

async function fetchAllFeeds() {
    try {
        console.log('Starting to fetch feeds...');  // Debug line
        const feedPromises = FEEDS.map(async feed => {
            try {
                console.log(`Attempting to fetch ${feed.source}...`);  // Debug line
                if (feed.type === 'json') {
                    // Handle JSON feeds (511 traffic)
                    const response = await fetch(feed.url);
                    const data = await response.json();
                    console.log(`Successfully fetched JSON from ${feed.source}`);  // Debug line
                    return [feed.transform(data)].filter(item => item !== null);
                } else {
                    // Handle RSS/ATOM feeds (weather, library)
                    const parsedFeed = await parser.parseURL(feed.url);
                    console.log(`Successfully fetched RSS from ${feed.source}`);  // Debug line
                    return parsedFeed.items
                        .map(item => feed.transform(item))
                        .filter(item => item !== null);
                }
            } catch (error) {
                console.error(`Error fetching ${feed.source}:`, error);
                return [];
            }
        });
        const results = await Promise.all(feedPromises);
        console.log('All feeds fetched, results:', results);  // Debug line
        return results.flat();
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