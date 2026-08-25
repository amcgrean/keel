-- Corrective follow-up: revoke from PUBLIC (the real default grantee) so anon
-- loses RPC access, then re-grant to authenticated, which still needs execute
-- (is_family_member runs inside RLS policies; log_audit_event is client-called).
revoke execute on function public.is_family_member(uuid) from public;
grant  execute on function public.is_family_member(uuid) to authenticated;

revoke execute on function
  public.log_audit_event(uuid, text, text, uuid, jsonb, jsonb) from public;
grant  execute on function
  public.log_audit_event(uuid, text, text, uuid, jsonb, jsonb) to authenticated;
