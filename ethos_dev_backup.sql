--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: SCHEMA; Schema: -; Owner: ethostest
--

CREATE SCHEMA postgis;


ALTER SCHEMA postgis OWNER TO ethostest;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: ethostest
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO ethostest;

--
-- Name: validate_comment_reference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_comment_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.post_type = 'post' THEN
        IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.post_id) THEN
            RAISE EXCEPTION 'Invalid post reference';
        END IF;
    ELSIF NEW.post_type = 'deal' THEN
        IF NOT EXISTS (SELECT 1 FROM deals WHERE id = NEW.post_id) THEN
            RAISE EXCEPTION 'Invalid deal reference';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_comment_reference() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    auth0_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: blind; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blind (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    post text NOT NULL,
    title character varying(255) NOT NULL,
    latitude numeric,
    longitude numeric,
    image_url text,
    user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    upvotes integer DEFAULT 0
);


ALTER TABLE public.blind OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    comment text NOT NULL,
    username character varying(255),
    user_id character varying(255),
    post_type character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['post'::character varying, 'deal'::character varying])::text[])))
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    participant1_id character varying(255) NOT NULL,
    participant2_id character varying(255) NOT NULL,
    last_message_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: free; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.free (
    id integer NOT NULL,
    username character varying(255),
    post text,
    latitude numeric,
    longitude numeric,
    image_url text,
    user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    upvotes integer DEFAULT 0,
    title character varying(255),
    downvotes integer DEFAULT 0,
    CONSTRAINT deals_upvotes_check CHECK (((upvotes >= 0) AND (upvotes <= 1000001)))
);


ALTER TABLE public.free OWNER TO postgres;

--
-- Name: deals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deals_id_seq OWNER TO postgres;

--
-- Name: deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deals_id_seq OWNED BY public.free.id;


--
-- Name: heritage_sites; Type: TABLE; Schema: public; Owner: ethostest
--

CREATE TABLE public.heritage_sites (
    ogc_fid integer NOT NULL,
    field1 bigint,
    folder_row bigint,
    cen bigint,
    yr bigint,
    sequence bigint,
    sec character varying(254),
    rev bigint,
    type character varying(254),
    type_desc character varying(254),
    status_cod bigint,
    status character varying(254),
    in_date date,
    listed date,
    designated date,
    easement_a character varying(254),
    building_t character varying(254),
    descriptio text,
    bylaw_no character varying(254),
    htg_conser character varying(254),
    omb_date character varying(254),
    reason character varying(254),
    list_numbe character varying(254),
    constructi character varying(254),
    architect_ character varying(254),
    year_demol character varying(254),
    property_r bigint,
    property_s character varying(254),
    property_y double precision,
    property_x double precision,
    house character varying(254),
    prefix character varying(254),
    street character varying(254),
    type_1 character varying(254),
    direction character varying(254),
    unit_type character varying(254),
    unit character varying(254),
    city character varying(254),
    province character varying(254),
    postal_cod character varying(254),
    address_ty character varying(254),
    roll double precision,
    planning_d character varying(254),
    former_mun character varying(254),
    ward bigint,
    pre_dec_1_ bigint,
    address character varying(254),
    extra_col1 text,
    extra_col2 text,
    extra_col3 text,
    extra_col4 text,
    extra_col5 text,
    extra_col6 text,
    extra_col7 text,
    extra_col8 text,
    extra_col9 text,
    extra_col10 text,
    spill1 jsonb,
    spill2 jsonb,
    spill3 jsonb,
    spill4 jsonb,
    spill5 jsonb,
    spill6 jsonb,
    spill7 jsonb,
    spill8 jsonb,
    spill9 jsonb,
    spill10 jsonb,
    spill11 jsonb,
    spill12 jsonb,
    spill13 jsonb,
    spill14 jsonb,
    spill15 jsonb,
    spill16 jsonb,
    spill17 jsonb,
    spill18 jsonb,
    spill19 jsonb,
    spill20 jsonb,
    spill21 jsonb,
    spill22 jsonb,
    spill23 jsonb,
    spill24 jsonb,
    spill25 jsonb,
    spill26 jsonb,
    spill27 jsonb,
    spill28 jsonb,
    spill29 jsonb,
    spill30 jsonb,
    spill31 jsonb,
    spill32 jsonb,
    spill33 jsonb,
    spill34 jsonb,
    spill35 jsonb,
    spill36 jsonb,
    spill37 jsonb,
    spill38 jsonb,
    spill39 jsonb,
    spill40 jsonb
);


ALTER TABLE public.heritage_sites OWNER TO ethostest;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id character varying(255) NOT NULL,
    recipient_id character varying(255) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    reference_id integer,
    reference_type character varying(10),
    conversation_id integer
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: missed_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.missed_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.missed_connections_id_seq OWNER TO postgres;

--
-- Name: missed_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.missed_connections_id_seq OWNED BY public.blind.id;


--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: ethostest
--

CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE public.pgmigrations OWNER TO ethostest;

--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: ethostest
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pgmigrations_id_seq OWNER TO ethostest;

--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethostest
--

ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: ethostest
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    post text NOT NULL,
    latitude numeric,
    longitude numeric,
    image_url text,
    user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    upvotes integer DEFAULT 0,
    title character varying(255),
    downvotes integer DEFAULT 0,
    CONSTRAINT posts_upvotes_check CHECK (((upvotes >= 0) AND (upvotes <= 1000001)))
);


ALTER TABLE public.posts OWNER TO ethostest;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: ethostest
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO ethostest;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethostest
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: search_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_logs (
    id integer NOT NULL,
    query text NOT NULL,
    user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.search_logs OWNER TO postgres;

--
-- Name: search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.search_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.search_logs_id_seq OWNER TO postgres;

--
-- Name: search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.search_logs_id_seq OWNED BY public.search_logs.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: blind id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blind ALTER COLUMN id SET DEFAULT nextval('public.missed_connections_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: free id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.free ALTER COLUMN id SET DEFAULT nextval('public.deals_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: public; Owner: ethostest
--

ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: ethostest
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: search_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_logs ALTER COLUMN id SET DEFAULT nextval('public.search_logs_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, auth0_id, email, username, created_at) FROM stdin;
1	auth0|677df892ac82b34d2d5fc5b0	gogogumshoe1@gmail.com	gogogumshoe1	2025-01-09 08:00:18.262523
2	auth0|676ce11692a6ede98c9739ca	aaron.j.ries@gmail.com	aaron.j.ries	2025-01-09 08:00:18.262523
\.


--
-- Data for Name: blind; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blind (id, username, post, title, latitude, longitude, image_url, user_id, created_at, upvotes) FROM stdin;
1	aaron.j.ries	Saw you	from across the room..	43.662759723658816	-79.48575156300018	\N	auth0|676ce11692a6ede98c9739ca	2025-04-29 23:13:14.034188	0
2	aaron.j.ries	Things were hazy	We met at 2 buck beer night	43.66271459103486	-79.48598009789802	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:31:30.40561	0
3	aaron.j.ries	No more delays pls	Anonymous note to the TTC...	43.662624571767736	-79.48580169311235	\N	auth0|676ce11692a6ede98c9739ca	2025-05-03 10:05:27.098688	0
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, post_id, comment, username, user_id, post_type, created_at) FROM stdin;
1	11	sweet	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-05 00:28:19.797812
2	11	yess	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-05 00:28:22.556186
3	11	from where?	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-07 22:48:15.717946
4	48	not good :(	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-02-07 22:48:29.181631
5	11	great deal	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-07 23:11:02.921161
6	49	I think we can do it!	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-02-07 23:11:20.339143
7	10	Love me the Macintoshe's!	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-07 23:13:50.940631
8	52	DM me - I know a spot near Annette and Keele	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-02-08 14:29:12.054921
9	14	Sounds great. Do you know if they are related to the French / Vietnamese crossover place that closed about a year ago on Dundas? I miss them!	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-09 10:01:02.326049
10	14	Sounds great. Do you know if they are related to the French / Vietnamese crossover place that closed about a year ago on Dundas? I miss them!	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-09 10:02:25.996892
11	14	.comment {     display: flex;     margin-bottom: 8px; }  .comment-user {     font-weight: bold;     color: #666;     flex-shrink: 0;  /* Prevent username from shrinking */     margin-right: 8px;  /* Consistent spacing */ }  .comment-text {     color: #333;     flex: 1;  /* Take remaining space */     word-break: break-word;  /* Prevent text overflow */ }	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-09 10:04:12.379018
12	50	.comment {     display: grid;     grid-template-columns: auto 1fr;     gap: 8px;     margin-bottom: 8px;     align-items: start; }  .comment-user {     font-weight: bold;     color: #666;     white-space: nowrap; /* Prevent username from wrapping */ }  .comment-text {     color: #333;     word-wrap: break-word; /* Allow long words to break */     min-width: 0; /* Prevent text from overflowing grid */ }	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-02-09 10:08:48.497063
13	13	great deal. Shadi is the man.	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	deal	2025-02-09 21:40:47.885948
14	52	Few places in the Junction.. not easy but they're out there.	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-02-10 23:06:38.480457
15	51	dope	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-04-21 21:48:53.781355
16	51	how can i join?	gogogumshoe1	auth0|677df892ac82b34d2d5fc5b0	post	2025-04-21 23:13:47.926473
17	56	Checkmate	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-05-28 23:07:05.147596
18	56	yas	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-05-28 23:25:14.738138
19	47	yas!	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-05-28 23:28:00.453148
20	46	very well mate	aaron.j.ries	auth0|676ce11692a6ede98c9739ca	post	2025-05-29 00:14:04.7376
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, participant1_id, participant2_id, last_message_at) FROM stdin;
1	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	2025-02-15 12:34:29.693705
\.


--
-- Data for Name: free; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.free (id, username, post, latitude, longitude, image_url, user_id, created_at, upvotes, title, downvotes) FROM stdin;
14	aaron.j.ries	New restaurant at Dundas W. and Keele, open until 7pm daily.	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 13:27:44.284758	11	If you like Bahn Mi... this is the spot	3
15	aaron.j.ries	A world of wonder, starting at 18.99	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-04-27 14:24:15.37028	0	Hot Docs Tickets	0
16	aaron.j.ries	Tonight is the final day - get 'em while they're here!	43.66275461586996	-79.48574613871438	\N	auth0|676ce11692a6ede98c9739ca	2025-04-27 15:13:19.769253	1	Hot Docs Tickets: Last Chance	0
17	aaron.j.ries	yas	43.6627167179871	-79.48598117116863	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:19:33.059235	0	Beer at Tail of the Junction	0
18	aaron.j.ries	yas	43.6627167179871	-79.48598117116863	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:20:05.457694	0	Beer at Tail of the Junction	0
19	aaron.j.ries	Tail of the junction	43.66271459103486	-79.48598009789802	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:31:09.417785	0	2 buck beers	0
1	aaron.j.ries	test	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-28 00:08:05.031548	0	Title	0
3	aaron.j.ries	testin' testin'	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-29 22:51:36.013911	0	Title	0
4	gogogumshoe1	testin testin	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 22:54:51.359718	0	Title	0
5	gogogumshoe1	test	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 22:55:30.70188	0	Title	0
7	gogogumshoe1	testin' 2	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 23:03:54.14195	0	Title	0
6	aaron.j.ries	testin	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-29 22:56:21.704597	1	Title	0
2	gogogumshoe1	undefined test	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 22:28:22.129484	1	Title	0
10	gogogumshoe1	Bag of Canadian grown organic apples, 5.50 each for 4 lbs.	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-02-02 12:56:37.958078	20	Title	0
11	aaron.j.ries	orange juice	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-02-03 00:12:05.52008	10	Title	0
9	aaron.j.ries	2012 Volkswagen Jetta, Midnight Blue, 100,000km on odo. Scratch free.	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-02-01 14:29:32.705041	14	Title	0
8	gogogumshoe1	TEST	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 23:49:10.298241	3	Title	0
12	aaron.j.ries	North side of high park	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 12:17:37.136399	0	Pints for sale	0
20	aaron.j.ries	COME GET IT 	43.662773133349084	-79.48563978563529	\N	auth0|676ce11692a6ede98c9739ca	2025-05-03 09:17:13.56147	3	FREE	0
13	aaron.j.ries	2 shawarma plates for $22 at Shadi on Bloor.	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 13:08:15.764379	1	Hungry?	0
\.


--
-- Data for Name: heritage_sites; Type: TABLE DATA; Schema: public; Owner: ethostest
--

COPY public.heritage_sites (ogc_fid, field1, folder_row, cen, yr, sequence, sec, rev, type, type_desc, status_cod, status, in_date, listed, designated, easement_a, building_t, descriptio, bylaw_no, htg_conser, omb_date, reason, list_numbe, constructi, architect_, year_demol, property_r, property_s, property_y, property_x, house, prefix, street, type_1, direction, unit_type, unit, city, province, postal_cod, address_ty, roll, planning_d, former_mun, ward, pre_dec_1_, address, extra_col1, extra_col2, extra_col3, extra_col4, extra_col5, extra_col6, extra_col7, extra_col8, extra_col9, extra_col10, spill1, spill2, spill3, spill4, spill5, spill6, spill7, spill8, spill9, spill10, spill11, spill12, spill13, spill14, spill15, spill16, spill17, spill18, spill19, spill20, spill21, spill22, spill23, spill24, spill25, spill26, spill27, spill28, spill29, spill30, spill31, spill32, spill33, spill34, spill35, spill36, spill37, spill38, spill39, spill40) FROM stdin;
3	3	5642908	20	25	168092	STE	13	HI	Heritage Inventory	1103	Part V	2025-05-30	\N	2024-12-05	\N	Residential	Part of the Cabbagetown Southwest Heritage Conservation District	1143-2024	Cabbagetown Southwest	\N	\N	\N	\N	\N	\N	233287	Active	4835462.435	315396.805	332	\N	BERKELEY	ST	\N	\N	\N	TORONTO	ON	M5A 2X5	Primary	1.90407228006e+18	South	Toronto	13	28	332  BERKELEY ST	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	4	2435882	20	9	54152	STE	14	HI	Heritage Inventory	1101	Listed	2009-05-01	1997-04-14	\N	\N	Commercial	Wardell's Monumental Works; 1911	NULL	\N	\N	Architectural	99	1911	\N	\N	153318	Active	4835882.384	308087.5	2694	\N	DUNDAS	ST	W	\N	\N	TORONTO	ON	M6P 1Y2	Primary	1.9040140200099999e+18	South	Toronto	4	14	2694  DUNDAS ST W	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, recipient_id, message, created_at, read_at, reference_id, reference_type, conversation_id) FROM stdin;
1	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	This is awesome. Thanks for sharing.	2025-02-12 00:14:16.574317	\N	14	deal	\N
2	auth0|676ce11692a6ede98c9739ca	auth0|676ce11692a6ede98c9739ca	very cool. thanks for sharing.	2025-02-13 00:02:20.323538	\N	14	deal	\N
8	auth0|676ce11692a6ede98c9739ca	auth0|677df892ac82b34d2d5fc5b0	Thanks! Glad you enjoyed it.	2025-02-15 09:46:23.8309	2025-02-18 23:15:39.783392	\N	\N	1
9	auth0|676ce11692a6ede98c9739ca	auth0|677df892ac82b34d2d5fc5b0	What neighbourhood are you in?	2025-02-15 10:47:44.485266	2025-02-18 23:15:39.783392	\N	\N	1
3	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	dope	2025-02-13 00:03:58.568824	2025-02-19 23:15:45.67238	14	deal	1
4	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	love it. Great work again.	2025-02-13 00:10:41.41393	2025-02-19 23:15:45.67238	14	deal	1
5	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	Cheers!!	2025-02-13 00:11:42.509317	2025-02-19 23:15:45.67238	14	deal	1
6	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	Where do you start from?	2025-02-13 08:37:09.358101	2025-02-19 23:15:45.67238	51	post	1
7	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	so cool.	2025-02-13 08:48:41.478844	2025-02-19 23:15:45.67238	14	deal	1
10	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	Runnymede. What about you?	2025-02-15 12:31:41.524199	2025-02-19 23:15:45.67238	\N	\N	1
11	auth0|677df892ac82b34d2d5fc5b0	auth0|676ce11692a6ede98c9739ca	Beauty!	2025-02-15 12:34:29.695353	2025-02-19 23:15:45.67238	14	deal	1
\.


--
-- Data for Name: pgmigrations; Type: TABLE DATA; Schema: public; Owner: ethostest
--

COPY public.pgmigrations (id, name, run_on) FROM stdin;
1	1735669710566_init	2024-12-31 15:57:30.637244
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: ethostest
--

COPY public.posts (id, username, post, latitude, longitude, image_url, user_id, created_at, upvotes, title, downvotes) FROM stdin;
1	aaro_local connection	image test 	43.66274000297204	-79.48566381221731	https://res.cloudinary.com/dfsdd9jt6/image/upload/v1735741252/posts/f325822gso5e7sczfrjm.jpg	auth0|676ce11692a6ede98c9739ca	2025-01-01 09:20:52.571916	2	Title	0
2	arrow_nav test	test with nav	43.66271708585566	-79.48563127019365	\N	auth0|676ce11692a6ede98c9739ca	2025-01-03 12:06:38.379478	0	Title	0
4	null	test post 	43.66278063999706	-79.48564276258017	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-07 23:29:27.512808	0	Title	0
5	test with image	post test - 	43.6627428829447	-79.4856978770629	\N	auth0|676ce11692a6ede98c9739ca	2025-01-07 23:32:04.077409	0	Title	0
6	test with image 	12	43.662798741241694	-79.48565328837712	\N	auth0|676ce11692a6ede98c9739ca	2025-01-07 23:37:28.650109	0	Title	0
8	a mama	a mia!	43.66278872229003	-79.48570707926686	\N	auth0|676ce11692a6ede98c9739ca	2025-01-08 00:15:22.457473	0	Title	0
11	aaron.j.ries	co-ordinates test	43.662802531876814	-79.48575189025573	\N	auth0|676ce11692a6ede98c9739ca	2025-01-09 08:49:39.826727	0	Title	0
12	aaron.j.ries	Margaritas at Bingo Bongos tonight	43.66289148902799	-79.48573992690018	\N	auth0|676ce11692a6ede98c9739ca	2025-01-12 20:54:18.144587	0	Title	0
13	aaron.j.ries	Pints of Beau's at the Saloon 	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-12 20:55:35.216211	0	Title	0
14	aaron.j.ries	Word on the street is that this prominent politician is stepping out on their spouse.	43.66283753245934	-79.48571155453045	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 00:43:38.275257	0	Title	0
16	aaron.j.ries	The mayor of roncey? more like the mayor of fancy	43.66270618839096	-79.48550339336741	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 00:52:33.167153	0	Title	0
18	aaron.j.ries	blind.. as a bat!	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 00:57:42.149827	0	Title	0
17	aaron.j.ries	ooh lala, fancy anonymous posting? does it work?	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 00:55:19.927753	0	Title	0
19	aaron.j.ries	not a bird, a plane, a man or a bat.. what am I 	43.662681221436436	-79.48546863447075	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 22:38:22.290072	0	Title	0
20	aaron.j.ries	Swansea themed mugs in the mews for sale. Hit me up.	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 22:38:49.591497	0	Title	0
21	aaron.j.ries	Penny for your thoughts? We've got old newsprint for sale.	43.662783300362996	-79.48563747940624	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 22:48:11.542507	0	Title	0
22	aaron.j.ries	will he or won't he?	43.66274077764573	-79.48559877719885	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 22:53:08.423006	0	Title	0
23	aaron.j.ries	penny for your thoughts chap	43.662725269681495	-79.48558553132206	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 22:57:15.38265	0	Title	0
24	gogogumshoe1	shhh	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-14 23:00:15.723325	0	Title	0
25	aaron.j.ries	advice ain't freee	43.6626253	-79.485789	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 23:03:52.889583	0	Title	0
26	gogogumshoe1	its close to free!!!	43.66287322448354	-79.48566660998745	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-15 23:14:37.901933	0	Title	0
28	gogogumshoe1	I'm back!	\N	\N	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-15 23:15:25.061262	0	Title	0
29	aaron.j.ries	Old CDSs for sale - sleigh bells, arcade fire, hit me up. 5 each.	43.6626224	-79.4858257	\N	auth0|676ce11692a6ede98c9739ca	2025-01-15 23:18:17.688293	0	Title	0
33	aaron.j.ries	shh	43.6626311	-79.485859	\N	auth0|676ce11692a6ede98c9739ca	2025-01-15 23:45:49.934956	0	Title	0
34	gogogumshoe1	testin testin?	43.662709294763324	-79.48550647676264	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-16 00:01:43.516602	0	Title	0
35	gogogumshoe1	user test	43.66274396373729	-79.48555216883558	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-16 00:22:37.290375	0	Title	0
36	gogogumshoe1	test	43.66279397937646	-79.48561876085837	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-16 00:28:00.78176	0	Title	0
38	gogogumshoe1	cheap beer here boys	43.66276585982034	-79.48559945668582	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-16 00:31:04.6958	0	Title	0
40	gogogumshoe1	shh	43.66280228161544	-79.48558804591742	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-16 00:46:53.986939	0	Title	0
41	aaron.j.ries	test	43.66279342411552	-79.48573805714165	\N	auth0|676ce11692a6ede98c9739ca	2025-01-20 22:04:30.482487	0	Title	0
42	aaron.j.ries	test	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-20 22:04:48.407949	0	Title	0
43	aaron.j.ries	separated test 3	43.662529	-79.4855241	\N	auth0|676ce11692a6ede98c9739ca	2025-01-25 14:08:18.993053	0	Title	0
44	gogogumshoe1	Still separated? FTW!	43.66273754432641	-79.48570367958283	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-27 23:11:22.633478	0	Title	0
45	gogogumshoe1	test	43.6628049204288	-79.48573354009	\N	auth0|677df892ac82b34d2d5fc5b0	2025-01-27 23:49:20.786784	0	Title	0
10	tesy	tesy	43.66273126523648	-79.48562444444391	\N	auth0|676ce11692a6ede98c9739ca	2025-01-09 08:04:48.354118	1	Title	0
7	mama mia!	mama mia!	43.66276003764741	-79.48552813106124	\N	auth0|676ce11692a6ede98c9739ca	2025-01-08 00:08:00.891999	2	Title	0
9	a-da	test a-da 15	43.66270860787012	-79.48575112413765	\N	auth0|676ce11692a6ede98c9739ca	2025-01-08 21:45:55.990056	4	Title	0
48	aaron.j.ries	How we feeling about the new tariffs, Toronto chat? Meet up at Sneaky Dee's for those who need to vent.	43.6626037	-79.4855185	\N	auth0|676ce11692a6ede98c9739ca	2025-02-03 00:11:42.472847	3	Title	0
49	aaron.j.ries	Tonight the Leafs are on my mind.. 3 game win streak? lets go.	43.6626439	-79.4858238	\N	auth0|676ce11692a6ede98c9739ca	2025-02-03 00:15:14.866612	7	Title	0
50	aaron.j.ries	We make titles. Post text. Add images if wanted. We post into our neighbourhood. If we want to make it a deal? No problem. Price is then allowed.	43.6628363807553	-79.48566944697693	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 12:15:09.337774	1	\N	3
15	aaron.j.ries	This popular Toronto mayor may be stepping out after dark...	\N	\N	\N	auth0|676ce11692a6ede98c9739ca	2025-01-14 00:48:24.66571	1	Title	0
53	gogogumshoe1	Careful on those roads out there boyos. 	43.6628059291915	-79.48569167429113	https://res.cloudinary.com/dfsdd9jt6/image/upload/v1739453558/posts/rjrcjw3cwgwxhmzpiaxe.jpg	auth0|677df892ac82b34d2d5fc5b0	2025-02-13 08:32:38.839275	10	Snow day! 	0
52	aaron.j.ries	does anyone know a spot that's subsidized in the Junction?	43.662746426448905	-79.48560117700654	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 13:22:02.164047	7	Daycare advice	0
51	aaron.j.ries	Full loop of the park at 4pm	43.662812700835524	-79.48568789191279	\N	auth0|676ce11692a6ede98c9739ca	2025-02-08 13:07:15.78965	8	Run club	0
55	aaron.j.ries	Leafs won!!	43.66271459103486	-79.48598009789802	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:29:13.772688	3	YAS! 	0
3	Well by golly...	Does posting still work?	43.66258475928495	-79.48555556066057	\N	auth0|676ce11692a6ede98c9739ca	2025-01-05 08:11:03.094065	4	Title	0
57	aaron.j.ries	Leafs won tonight!	43.662769080721475	-79.48605551539983	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:34:55.864935	1	YAS! 	0
54	aaron.j.ries	Junction cover band - we'll play it.	43.6627167179871	-79.48598117116863	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:19:06.976083	2	Fav Beatles track?	0
56	aaron.j.ries	Leafs won!!	43.66271459103486	-79.48598009789802	\N	auth0|676ce11692a6ede98c9739ca	2025-05-01 23:29:39.962369	4	YAS! 	0
47	aaron.j.ries	Yess! 	43.66277320444137	-79.48558418823085	\N	auth0|676ce11692a6ede98c9739ca	2025-02-02 13:22:01.055738	24	Title	0
46	gogogumshoe1	img	43.66277506181814	-79.48567216226415	https://res.cloudinary.com/dfsdd9jt6/image/upload/v1738212720/posts/d7l03n60l8dx3fw2dyot.jpg	auth0|677df892ac82b34d2d5fc5b0	2025-01-29 23:52:00.876953	15	Title	0
\.


--
-- Data for Name: search_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.search_logs (id, query, user_id, created_at) FROM stdin;
1	Bills	\N	2025-05-02 22:18:43.244003
2	humber	\N	2025-05-02 22:18:47.216043
3	humber	\N	2025-05-02 22:18:48.532474
4	Tariff	\N	2025-05-02 22:19:00.435609
5	Leafs	\N	2025-05-02 22:24:32.819961
6	Leafs	\N	2025-05-02 22:24:40.868282
7	Tarrifs	\N	2025-05-02 22:24:44.217796
8	Tarrif	\N	2025-05-02 22:24:47.124965
9	Tarrif	\N	2025-05-02 22:24:48.470782
10	Tariffs	\N	2025-05-02 22:24:51.645707
11	FREE	\N	2025-05-03 09:32:12.587461
12	FREE	\N	2025-05-03 09:32:14.891796
13	FREE	\N	2025-05-03 09:32:18.188903
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 93, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 20, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, true);


--
-- Name: deals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deals_id_seq', 20, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 11, true);


--
-- Name: missed_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.missed_connections_id_seq', 3, true);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethostest
--

SELECT pg_catalog.setval('public.pgmigrations_id_seq', 1, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethostest
--

SELECT pg_catalog.setval('public.posts_id_seq', 57, true);


--
-- Name: search_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.search_logs_id_seq', 13, true);


--
-- Name: accounts accounts_auth0_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_auth0_id_key UNIQUE (auth0_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_participant1_id_participant2_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_participant2_id_key UNIQUE (participant1_id, participant2_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: free deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.free
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: heritage_sites heritage_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: ethostest
--

ALTER TABLE ONLY public.heritage_sites
    ADD CONSTRAINT heritage_sites_pkey PRIMARY KEY (ogc_fid);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: blind missed_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blind
    ADD CONSTRAINT missed_connections_pkey PRIMARY KEY (id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: ethostest
--

ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: ethostest
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: search_logs search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT search_logs_pkey PRIMARY KEY (id);


--
-- Name: comments check_comment_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_comment_reference BEFORE INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.validate_comment_reference();


--
-- Name: conversations conversations_participant1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES public.accounts(auth0_id);


--
-- Name: conversations conversations_participant2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES public.accounts(auth0_id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.accounts(auth0_id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.accounts(auth0_id);


--
-- PostgreSQL database dump complete
--

