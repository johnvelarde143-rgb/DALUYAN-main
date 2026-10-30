create table if not exists public.municipality_visuals (
  id uuid primary key default gen_random_uuid(),
  municipality_name text not null check (municipality_name in ('Boac','Mogpog','Gasan','Buenavista','Santa Cruz','Torrijos')),
  municipality_code text not null,
  image_url text not null check (image_url like 'https://%' or image_url like '/%'),
  image_title text not null,
  image_category text not null,
  source_name text not null,
  source_url text not null check (source_url like 'https://%'),
  attribution_text text not null,
  is_verified boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.municipality_visuals enable row level security;
drop policy if exists municipality_visuals_read on public.municipality_visuals;
create policy municipality_visuals_read on public.municipality_visuals for select using (is_active = true);
revoke all on public.municipality_visuals from anon, authenticated;
grant select on public.municipality_visuals to anon, authenticated;
create unique index if not exists municipality_visuals_order on public.municipality_visuals(municipality_code, display_order);

insert into public.municipality_visuals (municipality_name, municipality_code, image_url, image_title, image_category, source_name, source_url, attribution_text, is_verified, display_order, is_active)
values
('Boac','boac','https://commons.wikimedia.org/wiki/Special:FilePath/Boac%20Cathedral%20Marinduque.jpg?width=640','Boac Cathedral','Built heritage','Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Boac_Cathedral_Marinduque.jpg','Ranieljosecastaneda · CC BY-SA 4.0',true,1,true),
('Boac','boac','/landscape-1.svg','DALUYAN heritage fallback','DALUYAN placeholder','DALUYAN','https://marinduque.gov.ph/places-of-interest-and-contact-persons/','Original DALUYAN illustration; official place reference',false,2,true),
('Mogpog','mogpog','https://commons.wikimedia.org/wiki/Special:FilePath/Balanacan%20Cove%20Lake.JPG?width=640','Balanacan Cove','Coastal landscape','Wikimedia Commons','https://commons.wikimedia.org/wiki/Category:Mogpog','Wikimedia Commons · see file page for license',true,1,true),
('Mogpog','mogpog','/landscape-2.svg','DALUYAN cultural fallback','DALUYAN placeholder','DALUYAN','https://marinduque.gov.ph/provincial-government-of-marinduque-honors-dot-for-cultural-tourism-development-caravan/','Original DALUYAN illustration; official Moriones reference',false,2,true),
('Gasan','gasan','https://commons.wikimedia.org/wiki/Special:FilePath/Gasan%20Church%2C%20Marinduque.jpg?width=640','Gasan Church','Built heritage','Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Gasan_Church,_Marinduque.jpg','Joelaldor · CC BY-SA 4.0',true,1,true),
('Gasan','gasan','https://commons.wikimedia.org/wiki/Special:FilePath/San%20Jose%20Esposo%20de%20Maria%20Parish%20Church%2C%20Gasan%2C%20Marinduque.jpg?width=640','San Jose Esposo de Maria Parish Church','Built heritage','Wikimedia Commons','https://commons.wikimedia.org/wiki/File:San_Jose_Esposo_de_Maria_Parish_Church,_Gasan,_Marinduque.jpg','Joelaldor · CC BY 3.0',true,2,true),
('Buenavista','buenavista','https://commons.wikimedia.org/wiki/Special:FilePath/Malbog%20Hot%20Spring.jpg?width=640','Malbog Hot Spring','Nature and wellness','Wikimedia Commons','https://commons.wikimedia.org/wiki/Category:Buenavista,_Marinduque','Wikimedia Commons · see file page for license',true,1,true),
('Buenavista','buenavista','https://commons.wikimedia.org/wiki/Special:FilePath/Buenavista%20Town%20Park.jpg?width=640','Buenavista Town Park','Community scene','Wikimedia Commons','https://commons.wikimedia.org/wiki/Category:Buenavista,_Marinduque','Wikimedia Commons · see file page for license',true,2,true),
('Santa Cruz','santa-cruz','https://commons.wikimedia.org/wiki/Special:FilePath/Santa%20Cruz%20de%20Napo%20Church%2C%20Marinduque.jpg?width=640','Santa Cruz de Napo Church','Built heritage','Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Santa_Cruz_de_Napo_Church,_Marinduque.jpg','Joelaldor · CC BY-SA 4.0',true,1,true),
('Santa Cruz','santa-cruz','https://commons.wikimedia.org/wiki/Special:FilePath/Santa%20Cruz%20Marinduque%20Monte%20de%20Ramos%20Buntal%20Talipot%20bagsB.jpg?width=640','Santa Cruz buntal and talipot craft','Local craft','Wikimedia Commons','https://commons.wikimedia.org/wiki/Category:Santa_Cruz,_Marinduque','Wikimedia Commons · see file page for license',true,2,true),
('Torrijos','torrijos','https://commons.wikimedia.org/wiki/Special:FilePath/Boac%20-%20Mogpog%20-%20Santa%20Cruz%20-%20Torrijos%20Rd%2C%20Torrijos%2C%20Marinduque%2C%20Philippines%20-%20panoramio.jpg?width=640','Torrijos road landscape','Landscape','Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Boac_-_Mogpog_-_Santa_Cruz_-_Torrijos_Rd,_Torrijos,_Marinduque,_Philippines_-_panoramio.jpg','Mozhar · CC BY-SA 3.0',true,1,true),
('Torrijos','torrijos','https://commons.wikimedia.org/wiki/Special:FilePath/Ang%20Labanan%20sa%20Pulang%20Lupa%20historical%20marker.jpg?width=640','Pulang Lupa historical marker','History','Wikimedia Commons / NHCP marker','https://commons.wikimedia.org/wiki/File:Ang_Labanan_sa_Pulang_Lupa_historical_marker.jpg','Wikimedia Commons · see file page for license',true,2,true)
on conflict (municipality_code, display_order) do update set image_url=excluded.image_url, image_title=excluded.image_title, image_category=excluded.image_category, source_name=excluded.source_name, source_url=excluded.source_url, attribution_text=excluded.attribution_text, is_verified=excluded.is_verified, is_active=excluded.is_active;
