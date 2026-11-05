-- =====================================================================
-- Saves reviewed statement rows in one step. Runs as the caller, so RLS
-- and the money ownership checks apply.
--   A plain row inserts one transaction. The external_ref index skips repeats.
--   A row with pair_id is the other side of a saved transfer. It sets the
--   transfer to the received amount and adds the difference as a fee.
-- =====================================================================
create or replace function public.import_transactions(p_rows jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  r jsonb;
  added integer;
  saved integer := 0;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if r ? 'pair_id' then
      update transactions set amount = (r ->> 'amount')::numeric
       where id = (r ->> 'pair_id')::uuid and kind = 'transfer';
      insert into transactions (kind, account_id, amount, occurred_on, merchant, source, external_ref)
      values ('expense', (r ->> 'fee_account_id')::uuid, (r ->> 'fee')::numeric, (r ->> 'occurred_on')::date,
              'Transfer fee', 'import', r ->> 'ref')
      on conflict (account_id, external_ref) where external_ref is not null do nothing;
    else
      insert into transactions
        (kind, account_id, to_account_id, category_id, amount, occurred_on, merchant, note, source, external_ref)
      values (
        (r ->> 'kind')::transaction_kind, (r ->> 'account_id')::uuid, (r ->> 'to_account_id')::uuid,
        (r ->> 'category_id')::uuid, (r ->> 'amount')::numeric, (r ->> 'occurred_on')::date,
        r ->> 'merchant', r ->> 'note', 'import', r ->> 'ref'
      )
      on conflict (account_id, external_ref) where external_ref is not null do nothing;
    end if;
    get diagnostics added = row_count;
    saved := saved + added;
  end loop;
  return saved;
end;
$$;
