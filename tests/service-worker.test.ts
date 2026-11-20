import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('service worker parses and displays a push before acknowledging receipt',async()=>{
 const handlers:Record<string,(event:unknown)=>void>={};const calls:string[]=[];let waiting:Promise<unknown>=Promise.resolve();
 runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{addEventListener:(name:string,fn:(event:unknown)=>void)=>{handlers[name]=fn;},registration:{showNotification:async(title:string)=>{calls.push('display:'+title);}}},fetch:async()=>{calls.push('receipt');}});
 handlers.push({data:{json:()=>({title:'TEST ONLY',body:'No real message is sent',deliveryId:'test',receipt:'test'})},waitUntil:(promise:Promise<unknown>)=>{waiting=promise;}});await waiting;assert.deepEqual(calls,['display:TEST ONLY','receipt']);
 calls.length=0;handlers.push({data:{json:()=>null},waitUntil:(promise:Promise<unknown>)=>{waiting=promise;}});await waiting;assert.deepEqual(calls,['display:Nepal Metals']);
});
test('service worker does not acknowledge a notification that failed to display',async()=>{
 const handlers:Record<string,(event:unknown)=>void>={};let waiting:Promise<unknown>=Promise.resolve();let receipts=0;
 runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{addEventListener:(name:string,fn:(event:unknown)=>void)=>{handlers[name]=fn;},registration:{showNotification:async()=>{throw new Error('Test display failure');}}},fetch:async()=>{receipts++;}});
 handlers.push({data:{json:()=>({deliveryId:'test',receipt:'test'})},waitUntil:(promise:Promise<unknown>)=>{waiting=promise;}});await assert.rejects(waiting);assert.equal(receipts,0);
});
