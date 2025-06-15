-- Create sequences
CREATE SEQUENCE accounts_id_seq;
CREATE SEQUENCE missed_connections_id_seq;
CREATE SEQUENCE comments_id_seq;
CREATE SEQUENCE conversations_id_seq;
CREATE SEQUENCE deals_id_seq;
CREATE SEQUENCE messages_id_seq;
CREATE SEQUENCE pgmigrations_id_seq;
CREATE SEQUENCE posts_id_seq;
CREATE SEQUENCE search_logs_id_seq;

-- Create accounts table
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY DEFAULT nextval('accounts_id_seq'),
    auth0_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create blind table
CREATE TABLE blind (
    id INTEGER PRIMARY KEY DEFAULT nextval('missed_connections_id_seq'),
    username VARCHAR(255) NOT NULL,
    post TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    image_url TEXT,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER DEFAULT 0
);

-- Create comments table
CREATE TABLE comments (
    id INTEGER PRIMARY KEY DEFAULT nextval('comments_id_seq'),
    post_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    username VARCHAR(255),
    user_id VARCHAR(255),
    post_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY DEFAULT nextval('conversations_id_seq'),
    participant1_id VARCHAR(255) NOT NULL,
    participant2_id VARCHAR(255) NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create free table
CREATE TABLE free (
    id INTEGER PRIMARY KEY DEFAULT nextval('deals_id_seq'),
    username VARCHAR(255),
    post TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    image_url TEXT,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER DEFAULT 0,
    title VARCHAR(255),
    downvotes INTEGER DEFAULT 0
);

-- Create messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY DEFAULT nextval('messages_id_seq'),
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    reference_id INTEGER,
    reference_type VARCHAR(10),
    conversation_id INTEGER
);

-- Create pgmigrations table
CREATE TABLE pgmigrations (
    id INTEGER PRIMARY KEY DEFAULT nextval('pgmigrations_id_seq'),
    name VARCHAR(255) NOT NULL,
    run_on TIMESTAMP NOT NULL
);

-- Create posts table
CREATE TABLE posts (
    id INTEGER PRIMARY KEY DEFAULT nextval('posts_id_seq'),
    username VARCHAR(255) NOT NULL,
    post TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    image_url TEXT,
    user_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER DEFAULT 0,
    title VARCHAR(255),
    downvotes INTEGER DEFAULT 0
);

-- Create search_logs table
CREATE TABLE search_logs (
    id INTEGER PRIMARY KEY DEFAULT nextval('search_logs_id_seq'),
    query TEXT NOT NULL,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 