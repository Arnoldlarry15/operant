-- Migration 002: Atomic XP increment function for Aurora PostgreSQL
-- Supabase handles auth only; run this in Aurora/RDS, not Supabase.

CREATE OR REPLACE FUNCTION increment_companion_xp(
  p_companion_id UUID,
  p_user_id      UUID,
  p_xp           INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_xp      INTEGER;
  v_new_level   INTEGER;
  v_new_msgs    INTEGER;
BEGIN
  UPDATE companions
  SET
    xp = xp + p_xp,
    message_count = message_count + 1,
    level = GREATEST(level, FLOOR((xp + p_xp) / 100)::INT + 1)
  WHERE id = p_companion_id
    AND user_id = p_user_id
    AND companion_type IN ('prebuilt', 'custom')
  RETURNING xp, level, message_count
  INTO v_new_xp, v_new_level, v_new_msgs;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found or access denied';
  END IF;

  RETURN json_build_object('xp', v_new_xp, 'level', v_new_level);
END;
$$;
