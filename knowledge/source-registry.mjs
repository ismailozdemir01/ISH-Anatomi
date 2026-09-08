export const SOURCE_TYPES = Object.freeze({TEXTBOOK:'TEXTBOOK',GUIDELINE:'GUIDELINE',SYSTEMATIC_REVIEW:'SYSTEMATIC_REVIEW',USER_LICENSED:'USER_LICENSED'});
export const SOURCE_STATUS = Object.freeze({ACTIVE:'ACTIVE',STALE:'STALE',LICENSE_REQUIRED:'LICENSE_REQUIRED',NOT_IMPORTED:'NOT_IMPORTED'});
export const GLOBAL_SEEDS = Object.freeze([
  {id:'ncbi-bookshelf',provider:'NCBI Bookshelf',type:SOURCE_TYPES.TEXTBOOK,discoveryUrl:'https://www.ncbi.nlm.nih.gov/books/',status:SOURCE_STATUS.ACTIVE},
  {id:'who-guidelines',provider:'World Health Organization',type:SOURCE_TYPES.GUIDELINE,discoveryUrl:'https://www.who.int/publications/who-guidelines',status:SOURCE_STATUS.ACTIVE}
]);
export function validateSource(source={}) {
  if (!source.id || !source.title || !source.provider) return {valid:false,reason:'SOURCE_METADATA_REQUIRED'};
  if (!Object.values(SOURCE_TYPES).includes(source.type)) return {valid:false,reason:'INVALID_SOURCE_TYPE'};
  if (!Object.values(SOURCE_STATUS).includes(source.status)) return {valid:false,reason:'INVALID_SOURCE_STATUS'};
  return {valid:true};
}
export function canIndex(source={}) { const r=validateSource(source); return r.valid && source.status===SOURCE_STATUS.ACTIVE && source.contentAvailable===true; }
