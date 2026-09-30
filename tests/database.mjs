import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
await db.exec(fs.readFileSync(new URL('../supabase/001_initial.sql',import.meta.url),'utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
await db.exec(`insert into auth.users values ('${a}'),('${b}'),('${c}'); insert into public.app_members(user_id,role) values ('${a}','admin'),('${b}','staff'),('${c}','staff');`);
async function as(id){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`)}
await as(a);
const product={code:' syn-sw-001 ',name:'2-gang switch',unit_price:1670,currency:'EGP',active:true};
let p=(await db.query('select * from public.save_product($1)',[JSON.stringify(product)])).rows[0];assert.equal(p.code,'SYN-SW-001');
async function fails(sql,args,label){let failed=false;try{await db.query(sql,args)}catch(e){failed=true;console.log('PASS',label,':',e.message.slice(0,90))}assert.ok(failed,label)}
await fails('select * from public.save_product($1)',[JSON.stringify(product)],'duplicate code');
await as(b);await fails('select * from public.save_product($1)',[JSON.stringify(product)],'staff cannot edit catalog');await fails('update public.app_members set role=$1 where user_id=$2',['admin',b],'staff cannot self-promote');
const doc={clientName:'Test client',clientContact:'',projectName:'Room',projectLocation:'',quoteDate:'2026-09-29',validUntil:'2026-10-06',companyName:'SYNCIFY',companyPhone:'',companyWeb:'',logo:'assets/syncify-logo.png',clientNote:'',paymentTerms:'',warrantyTerms:'',extraTerms:'',currency:'EGP',discountType:'percent',discountValue:10,sections:[{name:'Room',optional:false,items:[{productId:p.id,code:p.code,name:p.name,qty:2,price:1670,catalogPrice:1670}]},{name:'Options',optional:true,items:[{name:'Track',qty:1.5,price:100}]}]};
let q=(await db.query('select public.save_quotation($1) as q',[JSON.stringify(doc)])).rows[0].q;assert.equal(q.serverTotals.grand,3006);assert.equal(q.serverTotals.optional,150);assert.equal(q.sections.length,2);console.log('PASS decimal totals',q.serverTotals);
q=(await db.query('select public.save_quotation($1,$2,$3) as q',[JSON.stringify(q),q.id,q.version])).rows[0].q;assert.equal(q.sections.length,2);assert.equal(q.version,2);console.log('PASS atomic update retains new sections');
await fails('select public.save_quotation($1,$2,$3)',[JSON.stringify(q),q.id,1],'stale version');
await as(c);await fails('select public.get_quotation($1)',[q.id],'cross-user RPC access');assert.equal((await db.query('select * from public.quotation_items')).rows.length,0);console.log('PASS child-table RLS');
await as(a);p=(await db.query('select * from public.save_product($1,$2,$3)',[JSON.stringify({...product,unit_price:1800}),p.id,p.version])).rows[0];await fails('select * from public.save_product($1,$2,$3)',[JSON.stringify({...product,currency:'USD'}),p.id,p.version],'used product currency protected');await as(b);const old=(await db.query('select public.get_quotation($1) as q',[q.id])).rows[0].q;assert.equal(old.sections[0].items[0].price,1670);console.log('PASS catalog edit preserves snapshot');
const bad=structuredClone(q);bad.sections[0].items[0].name='';await fails('select public.save_quotation($1,$2,$3)',[JSON.stringify(bad),q.id,q.version],'unnamed line validation');assert.equal((await db.query('select public.get_quotation($1) as q',[q.id])).rows[0].q.version,2);console.log('PASS rollback');
q=(await db.query('select public.save_quotation($1,$2,$3,true) as q',[JSON.stringify(q),q.id,q.version])).rows[0].q;await fails('select public.save_quotation($1,$2,$3)',[JSON.stringify(q),q.id,q.version],'finalized immutability');
await db.exec('reset role;set role anon;');await fails('select * from public.products',[],'anonymous catalog denied');await fails('select public.get_quotation($1)',[q.id],'anonymous RPC denied');
console.log('ALL DATABASE CHECKS PASSED');await db.close();
