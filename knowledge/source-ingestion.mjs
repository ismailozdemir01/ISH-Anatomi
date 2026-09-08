import {createHash} from 'node:crypto';
import {canIndex} from './source-registry.mjs';

export const LICENSE_STATUS=Object.freeze({OPEN:'OPEN',LICENSED:'LICENSED',RESTRICTED:'RESTRICTED',UNKNOWN:'UNKNOWN'});
export const DOCUMENT_TYPES=Object.freeze({TEXTBOOK:'TEXTBOOK',GUIDELINE:'GUIDELINE',ARTICLE:'ARTICLE',USER_LICENSED:'USER_LICENSED'});

const clean=v=>String(v??'').trim();
export function contentHash(text){ return createHash('sha256').update(String(text??''),'utf8').digest('hex'); }
export function validateDocument(document={}) {
  const required=['id','title','provider','language','licenseStatus','documentType','text'];
  for(const k of required) if(!clean(document[k])) return {valid:false,reason:`${k.toUpperCase()}_REQUIRED`};
  if(!Object.values(LICENSE_STATUS).includes(document.licenseStatus)) return {valid:false,reason:'INVALID_LICENSE_STATUS'};
  if(!Object.values(DOCUMENT_TYPES).includes(document.documentType)) return {valid:false,reason:'INVALID_DOCUMENT_TYPE'};
  if(!String(document.text).trim()) return {valid:false,reason:'EMPTY_CONTENT'};
  if(document.licenseStatus==='UNKNOWN' || document.licenseStatus==='RESTRICTED') return {valid:false,reason:'RIGHTS_NOT_CLEAR'};
  return {valid:true};
}
export function ingestDocument(document={},{maxChars=1800}={}) {
  const validation=validateDocument(document);
  if(!validation.valid) return {status:'REJECTED',...validation};
  const hash=contentHash(document.text);
  const paragraphs=String(document.text).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  const chunks=[]; let buffer=''; let index=0;
  const flush=()=>{ if(!buffer) return; chunks.push({id:`${document.id}:${hash.slice(0,16)}:${index++}`,sourceId:document.id,text:buffer,chapter:document.chapter??null,section:document.section??null,page:document.page??null,contentHash:contentHash(buffer)}); buffer=''; };
  for(const p of paragraphs){ if(buffer && buffer.length+p.length+2>maxChars) flush(); buffer=buffer?`${buffer}\n\n${p}`:p; }
  flush();
  const source={id:document.id,title:document.title,provider:document.provider,type:document.documentType,status:'ACTIVE',contentAvailable:true,edition:document.edition??null,year:document.year??null,language:document.language,license:document.licenseStatus,rights:document.rights??null,uri:document.uri??null,contentHash:hash,ingestedAt:new Date().toISOString()};
  const registryCheck=canIndex(source);
  if(!registryCheck) return {status:'REJECTED',reason:'SOURCE_REGISTRY_REJECTED'};
  return {status:'INGESTED',source,chunks};
}
export function ingestIntoStore(document,store={}) {
  const result=ingestDocument(document);
  if(result.status!=='INGESTED') return result;
  const chunks=new Map(store.chunks??[]); const sourceMap=new Map(store.sourceMap??[]);
  for(const chunk of result.chunks) chunks.set(chunk.id,chunk);
  sourceMap.set(result.source.id,result.source);
  const index=new Map(store.index??[]);
  const normalize=s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^\p{L}\p{N}\s]/gu,' ');
  for(const chunk of result.chunks) for(const term of normalize(chunk.text).split(/\s+/).filter(x=>x.length>1)){if(!index.has(term)) index.set(term,new Set()); index.get(term).add(chunk.id);}
  return {status:'INGESTED',store:{chunks,index,sourceMap},source:result.source,chunks:result.chunks};
}
