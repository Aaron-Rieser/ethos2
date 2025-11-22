-- Execute this in pgAdmin connected to ethos_dev (local test database)

CREATE TABLE IF NOT EXISTS accounts (
  id serial NOT NULL,
  auth0_id varchar(255) NOT NULL,
  email varchar(255),
  username varchar(255) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS accounts_backup (
  id int4,
  auth0_id varchar(255),
  email varchar(255),
  username varchar(255),
  created_at timestamp
);

CREATE TABLE IF NOT EXISTS comments (
  id serial NOT NULL,
  post_id int4 NOT NULL,
  comment text NOT NULL,
  username varchar(255),
  user_id varchar(255),
  post_type varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id serial NOT NULL,
  participant1_id varchar(255) NOT NULL,
  participant2_id varchar(255) NOT NULL,
  last_message_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS follows (
  auth0_id text NOT NULL,
  auth0_following_id text NOT NULL,
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (auth0_id, auth0_following_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id serial NOT NULL,
  sender_id varchar(255) NOT NULL,
  recipient_id varchar(255) NOT NULL,
  message text NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  read_at timestamp,
  reference_id int4,
  reference_type varchar(10),
  conversation_id int4,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS posts (
  id serial NOT NULL,
  username varchar(255),
  post text,
  latitude numeric,
  longitude numeric,
  image_url text,
  user_id varchar(255),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  upvotes int4 DEFAULT 0,
  title varchar(255),
  downvotes int4 DEFAULT 0,
  updated_at timestamp,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS search_logs (
  id serial NOT NULL,
  query text NOT NULL,
  user_id varchar(255),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

