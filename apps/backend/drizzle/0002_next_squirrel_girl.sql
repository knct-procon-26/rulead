ALTER TABLE "icons" ADD COLUMN "icon_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "keywords" ADD COLUMN "index" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "icons_name_type_unique" ON "icons" USING btree ("name","icon_type");--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_index_unique" ON "keywords" USING btree ("index");