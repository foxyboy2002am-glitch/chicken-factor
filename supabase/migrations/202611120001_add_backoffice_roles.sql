-- Add global back-office roles used by the operations console.
alter type public.app_role add value if not exists 'call_center';
alter type public.app_role add value if not exists 'accountant';
alter type public.app_role add value if not exists 'operations';
