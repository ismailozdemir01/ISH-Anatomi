export const COORDINATE_SPACE = Object.freeze({ PROBE:'probe', IMAGE:'image', WORLD:'world', ATLAS:'atlas' });
function finiteMatrix(m){return Array.isArray(m)&&m.length===16&&m.every(Number.isFinite);}
export function identityTransform(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
export function validateRigidTransform(m){
  if(!finiteMatrix(m))return {valid:false,reason:'INVALID_TRANSFORM'};
  const axes=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>Math.sqrt(dot(a,a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
  const det=dot(axes[0],cross(axes[1],axes[2]));
  if(axes.some(r=>Math.abs(norm(r)-1)>0.03)||Math.abs(dot(axes[0],axes[1]))>0.03||Math.abs(dot(axes[0],axes[2]))>0.03||Math.abs(dot(axes[1],axes[2]))>0.03||Math.abs(det-1)>0.05||Math.abs(m[3])>1e-3||Math.abs(m[7])>1e-3||Math.abs(m[11])>1e-3||Math.abs(m[15]-1)>1e-3)return {valid:false,reason:'NON_RIGID_TRANSFORM'};
  return {valid:true};
}
export function multiply4x4(a,b){
  if(!finiteMatrix(a)||!finiteMatrix(b))throw new Error('INVALID_TRANSFORM');
  const out=new Array(16).fill(0); for(let row=0;row<4;row++)for(let col=0;col<4;col++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k]; return out;
}
export function transformPoint(matrix,point){
  if(!finiteMatrix(matrix)||!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))throw new Error('INVALID_POINT_OR_TRANSFORM');
  const x=matrix[0]*point[0]+matrix[4]*point[1]+matrix[8]*point[2]+matrix[12], y=matrix[1]*point[0]+matrix[5]*point[1]+matrix[9]*point[2]+matrix[13], z=matrix[2]*point[0]+matrix[6]*point[1]+matrix[10]*point[2]+matrix[14], w=matrix[3]*point[0]+matrix[7]*point[1]+matrix[11]*point[2]+matrix[15];
  if(!Number.isFinite(w)||Math.abs(w)<1e-9)throw new Error('INVALID_HOMOGENEOUS_POINT'); return [x/w,y/w,z/w];
}
export function composeCoordinateChain({probeToImage,imageToWorld,worldToAtlas}={}){
  for(const m of [probeToImage,imageToWorld,worldToAtlas]){const check=validateRigidTransform(m);if(!check.valid)throw new Error(check.reason);}
  return {probeToAtlas:multiply4x4(multiply4x4(probeToImage,imageToWorld),worldToAtlas),spaces:[COORDINATE_SPACE.PROBE,COORDINATE_SPACE.IMAGE,COORDINATE_SPACE.WORLD,COORDINATE_SPACE.ATLAS]};
}
