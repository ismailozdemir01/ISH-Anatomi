import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function loadCatalog(root) {
  const candidates=[
    path.join(root,'vendor','human-atlas','dist','models','atlas.json'),
    path.join(root,'vendor','human-atlas','public','models','atlas.json')
  ];
  for(const file of candidates){try{return JSON.parse(await readFile(file,'utf8'));}catch{}}
  return null;
}
export function findConcept(catalog, query){
  if(!catalog?.concepts?.length) return null;
  const q=String(query).toLocaleLowerCase('tr-TR').trim();
  return catalog.concepts.find(c=>c.name?.toLocaleLowerCase('tr-TR')===q) || catalog.concepts.find(c=>c.name?.toLocaleLowerCase('tr-TR').includes(q)) || null;
}
export function catalogStatus(catalog){
  if(!catalog) return {status:'ATLAS_CATALOG_UNAVAILABLE'};
  return {status:'READY',parts:catalog.parts?.length??0,concepts:catalog.concepts?.length??0,triangles:catalog.triangles??0};
}
