-- Add RLS policies for NextAuth.js authentication
-- 
-- Note: With NextAuth.js (application-level auth), PostgreSQL RLS cannot directly
-- check the authenticated user. These policies provide defense-in-depth by:
-- 1. Requiring user_id to be set on all operations
-- 2. Ensuring data integrity at the database level
-- 3. Actual user filtering is handled by Prisma queries (which filter by userId)
--
-- This approach provides security layers:
-- - Application layer: NextAuth.js + middleware protect routes
-- - Application layer: Prisma queries filter by userId
-- - Database layer: RLS ensures user_id is always set

-- RLS Policies for clothing_items
-- Note: SELECT policy allows all because Prisma filters by userId in WHERE clause
CREATE POLICY clothing_items_select_policy ON clothing_items
  FOR SELECT
  USING (true); -- Prisma handles user filtering via WHERE userId = ?

CREATE POLICY clothing_items_insert_policy ON clothing_items
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL); -- Require user_id on insert

CREATE POLICY clothing_items_update_policy ON clothing_items
  FOR UPDATE
  USING (user_id IS NOT NULL) -- Require user_id exists
  WITH CHECK (user_id IS NOT NULL); -- Cannot set user_id to NULL

CREATE POLICY clothing_items_delete_policy ON clothing_items
  FOR DELETE
  USING (user_id IS NOT NULL); -- Require user_id exists

-- RLS Policies for outfit_recommendations
CREATE POLICY outfit_recommendations_select_policy ON outfit_recommendations
  FOR SELECT
  USING (true); -- Prisma handles user filtering

CREATE POLICY outfit_recommendations_insert_policy ON outfit_recommendations
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY outfit_recommendations_update_policy ON outfit_recommendations
  FOR UPDATE
  USING (user_id IS NOT NULL)
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY outfit_recommendations_delete_policy ON outfit_recommendations
  FOR DELETE
  USING (user_id IS NOT NULL);

-- RLS Policies for saved_outfits
CREATE POLICY saved_outfits_select_policy ON saved_outfits
  FOR SELECT
  USING (true); -- Prisma handles user filtering

CREATE POLICY saved_outfits_insert_policy ON saved_outfits
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY saved_outfits_update_policy ON saved_outfits
  FOR UPDATE
  USING (user_id IS NOT NULL)
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY saved_outfits_delete_policy ON saved_outfits
  FOR DELETE
  USING (user_id IS NOT NULL);

-- RLS Policies for wear_events
CREATE POLICY wear_events_select_policy ON wear_events
  FOR SELECT
  USING (true); -- Prisma handles user filtering

CREATE POLICY wear_events_insert_policy ON wear_events
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY wear_events_update_policy ON wear_events
  FOR UPDATE
  USING (user_id IS NOT NULL)
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY wear_events_delete_policy ON wear_events
  FOR DELETE
  USING (user_id IS NOT NULL);

-- RLS Policies for uploads
CREATE POLICY uploads_select_policy ON uploads
  FOR SELECT
  USING (true); -- Prisma handles user filtering

CREATE POLICY uploads_insert_policy ON uploads
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY uploads_update_policy ON uploads
  FOR UPDATE
  USING (user_id IS NOT NULL)
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY uploads_delete_policy ON uploads
  FOR DELETE
  USING (user_id IS NOT NULL);

