-- Custom SQL migration file, put your code below! --
INSERT INTO "icons" ("name") VALUES ('nodata')
ON CONFLICT ("id") DO NOTHING;