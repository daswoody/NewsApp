CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"allow_registration" boolean DEFAULT true NOT NULL,
	"ai_global" boolean DEFAULT false NOT NULL,
	"mcp_global" boolean DEFAULT false NOT NULL,
	"ai_base_url" text DEFAULT '' NOT NULL,
	"ai_api_key" text DEFAULT '' NOT NULL,
	"ai_model" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users" SET "is_admin" = true WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1);