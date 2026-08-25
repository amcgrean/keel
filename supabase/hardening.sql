-- Keel — security hardening for the SECURITY DEFINER functions.
-- Addresses Supabase advisor warnings (mutable search_path, anon-executable
-- RPC) plus an audit-log forging gap. Safe to run on the existing schema.

-- 1. is_family_member: pin search_path, schema-qualify references.
--    Only ever called internally by RLS policies, so it does not need to be
--    reachable as an RPC by anon or authenticated.
create or replace function public.is_family_member(fam_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam_id and user_id = (select auth.uid())
  );
$$;

-- Revoke from PUBLIC (the default grantee) to cut off anon, then re-grant to
-- authenticated, which still needs it: RLS policies call this per-query.
revoke execute on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

-- 2. log_audit_event: pin search_path, schema-qualify references, and refuse
--    to write into a family the caller is not a member of — otherwise any
--    signed-in user could forge rows into another family's immutable log.
create or replace function public.log_audit_event(
  p_family_id uuid,
  p_action text,
  p_object_type text,
  p_object_id uuid,
  p_old_value jsonb,
  p_new_value jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  select id into v_actor
  from public.family_members
  where family_id = p_family_id and user_id = (select auth.uid());

  if v_actor is null then
    raise exception 'not a member of family %', p_family_id
      using errcode = '42501';
  end if;

  insert into public.audit_events (
    family_id, actor_id, action, object_type, object_id, old_value, new_value
  ) values (
    p_family_id, v_actor, p_action, p_object_type, p_object_id, p_old_value, p_new_value
  );
end;
$$;

-- Logged-out users never audit anything; keep it to authenticated callers.
revoke execute on function
  public.log_audit_event(uuid, text, text, uuid, jsonb, jsonb) from public;
grant execute on function
  public.log_audit_event(uuid, text, text, uuid, jsonb, jsonb) to authenticated;
