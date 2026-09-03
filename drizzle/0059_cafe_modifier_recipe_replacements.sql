ALTER TABLE "cafe_recipe_component"
  DROP CONSTRAINT IF EXISTS "cafe_recipe_quantity_check";

ALTER TABLE "cafe_recipe_component"
  ADD CONSTRAINT "cafe_recipe_quantity_check"
  CHECK ("quantityBase" <> 0);
