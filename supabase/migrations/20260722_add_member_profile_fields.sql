alter table public.members
  add column if not exists current_address text,
  add column if not exists permanent_address text,
  add column if not exists aadhar_card_no text,
  add column if not exists driving_license_no text,
  add column if not exists pan_card_no text,
  add column if not exists marital_status text;

update public.members
set current_address = address
where current_address is null
  and address is not null;
