export const ATLAS_MAPPING_STATUS=Object.freeze({MAPPED:'MAPPED',UNMAPPED:'UNMAPPED',INVALID:'INVALID'});
const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
const finiteArray=(value,size)=>Array.isArray(value)&&value.length===size&&value.every(v=>Number.isFinite(Number(v)));
const groupIdFor=id=>id?`atlas:${id}`:null;
export function mapUltrasoundFinding({structureId,system=null,terminology=null,meshId=null,confidence=null,transform=null,groupId=null}={},catalog=[]){
  const id=text(structureId); if(!id)return{status:ATLAS_MAPPING_STATUS.INVALID,reason:'STRUCTURE_ID_REQUIRED',structureId:null};
  if(confidence!=null&&(!Number.isFinite(Number(confidence))||Number(confidence)<0||Number(confidence)>1))return{status:ATLAS_MAPPING_STATUS.INVALID,reason:'INVALID_CONFIDENCE',structureId:id};
  if(transform!=null&&!finiteArray(transform,16))return{status:ATLAS_MAPPING_STATUS.INVALID,reason:'INVALID_TRANSFORM',structureId:id};
  const entries=Array.isArray(catalog)?catalog:[]; const match=entries.find(item=>text(item?.structureId)===id||text(item?.id)===id);
  if(!match)return{status:ATLAS_MAPPING_STATUS.UNMAPPED,structureId:id,groupId:text(groupId)??groupIdFor(id),confidence:confidence==null?null:Number(confidence),system:text(system),terminology:text(terminology),meshId:text(meshId),transform:transform?[...transform].map(Number):null};
  return{status:ATLAS_MAPPING_STATUS.MAPPED,structureId:id,groupId:text(groupId)??text(match.groupId)??groupIdFor(id),system:text(system)??text(match.system),terminology:text(terminology)??text(match.terminology),meshId:text(meshId)??text(match.meshId),confidence:confidence==null?null:Number(confidence),transform:transform?[...transform].map(Number):null};
}
export function atlasOverlayGate(mapping,{registrationStatus='UNKNOWN',calibrated=false,qualityStatus='GOOD'}={}){
  if(mapping?.status!==ATLAS_MAPPING_STATUS.MAPPED)return{visible:false,reason:'ATLAS_MAPPING_REQUIRED'};
  if(registrationStatus!=='TRACKING')return{visible:false,reason:'REGISTRATION_NOT_TRACKING'};
  if(!calibrated)return{visible:false,reason:'CALIBRATION_REQUIRED'};
  if(!['GOOD','SUFFICIENT'].includes(qualityStatus))return{visible:false,reason:'IMAGE_QUALITY_INSUFFICIENT'};
  return{visible:true,structureId:mapping.structureId,groupId:mapping.groupId,meshId:mapping.meshId,transform:mapping.transform};
}
