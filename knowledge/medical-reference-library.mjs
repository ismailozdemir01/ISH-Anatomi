export const REFERENCE_DOMAIN=Object.freeze({ANATOMY:'ANATOMY',DIAGNOSIS:'DIAGNOSIS'});
export const REFERENCE_POLICY=Object.freeze({
  anatomy:{required:true,minimumSources:1},
  diagnosis:{required:true,minimumSources:1}
});

export const REFERENCE_CATALOG=Object.freeze([
  {id:'ncbi-bookshelf-anatomy',domain:REFERENCE_DOMAIN.ANATOMY,type:'TEXTBOOK',provider:'NCBI Bookshelf',title:'Anatomy references (NCBI Bookshelf)',status:'DISCOVERABLE',contentMode:'USER_IMPORTED_OR_OPEN'},
  {id:'licensed-anatomy-textbook',domain:REFERENCE_DOMAIN.ANATOMY,type:'TEXTBOOK',provider:'LOCAL_LIBRARY',title:'Licensed anatomy textbook',status:'USER_IMPORT_REQUIRED',contentMode:'LICENSED_LOCAL'},
  {id:'licensed-diagnostic-textbook',domain:REFERENCE_DOMAIN.DIAGNOSIS,type:'TEXTBOOK',provider:'LOCAL_LIBRARY',title:'Licensed medical diagnosis textbook',status:'USER_IMPORT_REQUIRED',contentMode:'LICENSED_LOCAL'},
  {id:'clinical-guideline-library',domain:REFERENCE_DOMAIN.DIAGNOSIS,type:'GUIDELINE',provider:'LOCAL_LIBRARY',title:'Licensed clinical guidelines',status:'USER_IMPORT_REQUIRED',contentMode:'LICENSED_LOCAL'}
]);

export function validateReference(source={}) {
  if(!source?.id || !source?.domain) return {valid:false,reason:'REFERENCE_METADATA_REQUIRED'};
  if(!Object.values(REFERENCE_DOMAIN).includes(source.domain)) return {valid:false,reason:'INVALID_REFERENCE_DOMAIN'};
  if(source.contentAvailable!==true) return {valid:false,reason:'REFERENCE_CONTENT_REQUIRED'};
  if(source.licenseStatus==='UNKNOWN' || source.licenseStatus==='RESTRICTED') return {valid:false,reason:'REFERENCE_RIGHTS_NOT_CLEAR'};
  return {valid:true};
}

export function referenceCoverage(sources=[]) {
  const active=sources.filter(s=>validateReference(s).valid);
  return {
    anatomy:active.filter(s=>s.domain===REFERENCE_DOMAIN.ANATOMY).length,
    diagnosis:active.filter(s=>s.domain===REFERENCE_DOMAIN.DIAGNOSIS).length,
    ready:active.some(s=>s.domain===REFERENCE_DOMAIN.ANATOMY) && active.some(s=>s.domain===REFERENCE_DOMAIN.DIAGNOSIS)
  };
}
