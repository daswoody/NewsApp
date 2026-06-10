ALTER TABLE "app_settings" ADD COLUMN "font_headline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "font_article_headings" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "font_body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "show_card_summary" boolean DEFAULT true NOT NULL;