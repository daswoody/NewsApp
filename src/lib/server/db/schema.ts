import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';

// a group shares one AI connection and group MCP tokens across its members
export const groups = pgTable('groups', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	aiBaseUrl: text('ai_base_url').notNull().default(''),
	aiApiKey: text('ai_api_key').notNull().default(''),
	aiModel: text('ai_model').notNull().default(''),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	nickname: text('nickname').notNull(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	deleteAfterDays: integer('delete_after_days').notNull().default(30),
	isAdmin: boolean('is_admin').notNull().default(false),
	groupId: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const categories = pgTable('categories', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const topics = pgTable('topics', {
	id: uuid('id').primaryKey().defaultRandom(),
	categoryId: uuid('category_id')
		.notNull()
		.references(() => categories.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const articles = pgTable('articles', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	categoryId: uuid('category_id')
		.notNull()
		.references(() => categories.id, { onDelete: 'cascade' }),
	topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
	headline: text('headline').notNull(),
	summary: text('summary').notNull(),
	content: text('content').notNull(),
	imagePath: text('image_path'),
	saved: boolean('saved').notNull().default(false),
	publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sources = pgTable('sources', {
	id: uuid('id').primaryKey().defaultRandom(),
	articleId: uuid('article_id')
		.notNull()
		.references(() => articles.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	url: text('url').notNull()
});

export const chatMessages = pgTable('chat_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	articleId: uuid('article_id')
		.notNull()
		.references(() => articles.id, { onDelete: 'cascade' }),
	role: text('role').notNull(), // 'user' | 'assistant'
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const aiSettings = pgTable('ai_settings', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	baseUrl: text('base_url').notNull().default(''),
	apiKey: text('api_key').notNull().default(''),
	model: text('model').notNull().default('')
});

export const mcpTokens = pgTable('mcp_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	// set on group tokens: the token then researches for all group members
	groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
	tokenHash: text('token_hash').notNull().unique(),
	label: text('label').notNull().default(''),
	prefix: text('prefix').notNull().default(''),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true })
});

// single-row table (id = 1) for instance-wide admin settings
export const appSettings = pgTable('app_settings', {
	id: integer('id').primaryKey().default(1),
	allowRegistration: boolean('allow_registration').notNull().default(true),
	// custom design tokens as JSON, empty = built-in defaults
	themeLight: text('theme_light').notNull().default(''),
	themeDark: text('theme_dark').notNull().default(''),
	// typography (font ids from the self-hosted registry, '' = default)
	fontHeadline: text('font_headline').notNull().default(''),
	fontHeadlineStyle: text('font_headline_style').notNull().default(''),
	fontArticleHeadings: text('font_article_headings').notNull().default(''),
	fontArticleHeadingsStyle: text('font_article_headings_style').notNull().default(''),
	fontBody: text('font_body').notNull().default(''),
	// parallax strength in percent (0-100 = slider 0-1)
	parallaxStrength: integer('parallax_strength').notNull().default(35),
	showCardSummary: boolean('show_card_summary').notNull().default(true)
});

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AiSettings = typeof aiSettings.$inferSelect;
export type McpToken = typeof mcpTokens.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type Group = typeof groups.$inferSelect;
