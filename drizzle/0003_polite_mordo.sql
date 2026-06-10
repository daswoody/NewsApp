-- migrate the old family mode into a real group: if central AI or central MCP
-- was enabled, create a "Familie" group with the global AI settings and move
-- every user into it, so existing setups keep working unchanged
INSERT INTO "groups" ("name", "ai_base_url", "ai_api_key", "ai_model")
SELECT 'Familie', "ai_base_url", "ai_api_key", "ai_model"
FROM "app_settings"
WHERE "ai_global" = true OR "mcp_global" = true
LIMIT 1;--> statement-breakpoint
UPDATE "users" SET "group_id" = (SELECT "id" FROM "groups" WHERE "name" = 'Familie' LIMIT 1)
WHERE (SELECT COUNT(*) FROM "groups" WHERE "name" = 'Familie') > 0;--> statement-breakpoint
UPDATE "mcp_tokens" SET "group_id" = (SELECT "id" FROM "groups" WHERE "name" = 'Familie' LIMIT 1)
WHERE (SELECT COUNT(*) FROM "groups" WHERE "name" = 'Familie') > 0
  AND "user_id" IN (SELECT "id" FROM "users" WHERE "is_admin" = true);--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "ai_global";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "mcp_global";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "ai_base_url";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "ai_api_key";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "ai_model";