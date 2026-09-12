const clean=v=>String(v??'').trim();

export const REFERENCE_GROUP_PREFIX='atlas:';

export function referenceGroupId(structureId){
  const id=clean(structureId);
  return id ? `${REFERENCE_GROUP_PREFIX}${id}` : null;
}

function aliasesOf(item){
  return [...new Set([item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])].map(clean).filter(Boolean))];
}

function parentOf(item){
  return clean(item?.parentStructureId ?? item?.parentId ?? item?.parent?.id) || null;
}

export function createReferenceGroup(item){
  const structureId=clean(item?.id ?? item?.structureId);
  if(!structureId) return null;
  return {
    groupId:clean(item?.groupId) || referenceGroupId(structureId),
    structureId,
    meshId:clean(item?.meshId ?? item?.mesh?.id) || null,
    system:clean(item?.system) || null,
    name:clean(item?.name) || structureId,
    aliases:aliasesOf(item),
    parentStructureId:parentOf(item),
    parentGroupId:referenceGroupId(parentOf(item))
  };
}

export function buildReferenceGroups(catalog=[]){
  const groups=new Map();
  for(const item of Array.isArray(catalog)?catalog:[]){
    const group=createReferenceGroup(item);
    if(group) groups.set(group.groupId,group);
  }
  return groups;
}

export function resolveReferenceGroup({structureId=null,groupId=null,catalog=[]}={}){
  const groups=buildReferenceGroups(catalog);
  const requestedGroup=clean(groupId);
  const requestedStructure=clean(structureId);
  if(requestedGroup){
    const group=groups.get(requestedGroup);
    if(!group) return {status:'UNMAPPED',groupId:null,structureId:requestedStructure||null,group:null};
    if(requestedStructure && group.structureId!==requestedStructure) return {status:'CONFLICT',groupId:requestedGroup,structureId:requestedStructure,group:null};
    return {status:'MAPPED',groupId:group.groupId,structureId:group.structureId,group};
  }
  if(!requestedStructure) return {status:'UNKNOWN',groupId:null,structureId:null,group:null};
  const derived=referenceGroupId(requestedStructure);
  const group=groups.get(derived);
  return group
    ? {status:'MAPPED',groupId:group.groupId,structureId:group.structureId,group}
    : {status:'UNMAPPED',groupId:null,structureId:requestedStructure,group:null};
}

export function groupContains({group,structureId,groupId}={}){
  if(!group) return false;
  if(groupId && group.groupId!==groupId) return false;
  if(structureId && group.structureId!==structureId) return false;
  return true;
}
