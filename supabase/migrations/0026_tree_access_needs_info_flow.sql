-- "Запросить дополнительные сведения" (owner decision, 2026-09-20):
-- an editor can ask a member a specific question instead of only
-- Подтвердить/Отклонить. admin_note holds that question — shown in
-- the member's own "Подтверждение родства" panel and emailed to them
-- (lib/email/send-notification.ts). Not cleared automatically once the
-- member replies (relation_note grows with the reply instead, see
-- server/repositories/lounge-tree-access.ts) — an editor re-reading the
-- request afterwards still sees what they originally asked.
alter table lounge_tree_access add column admin_note text null;

-- A member can move their own request from 'needs_info' back to
-- 'pending' by replying (server/actions/tree-access-request.ts) — same
-- shape as lounge_tree_access_own_resubmit (0023_tree_access_self_service.sql)
-- for a rejected request, just a different source status. Additive: a
-- member's row can now leave 'needs_info' via this policy or leave
-- 'rejected' via the existing one, never touching 'granted'.
create policy "lounge_tree_access_own_provide_info" on lounge_tree_access
  for update
  using (user_id = auth.uid() and status = 'needs_info')
  with check (user_id = auth.uid() and status = 'pending');
