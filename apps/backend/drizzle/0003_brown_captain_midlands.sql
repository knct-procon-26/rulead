CREATE TABLE "osm_areas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "osm_areas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osm_id" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"kind" text NOT NULL,
	"area" geometry(MultiPolygon,4326) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "osm_areas_osm_id_unique" ON "osm_areas" USING btree ("osm_id");--> statement-breakpoint
CREATE INDEX "osm_areas_area_gist_index" ON "osm_areas" USING gist ("area");