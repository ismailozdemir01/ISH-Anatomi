import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFile(path.join(ROOT,relative),'utf8');
const main=await read('desktop/main.cjs');
const preload=await read('desktop/preload.cjs');
const packageJson=JSON.parse(await read('package.json'));

const exposed=[...preload.matchAll(/ipcRenderer\.invoke\(['"]([^'"]+)['"]/g)].map(m=>m[1]);
const handled=[...main.matchAll(/ipcMain\.handle\(['"]([^'"]+)['"]/g)].map(m=>m[1]);
const missingHandlers=exposed.filter(channel=>!handled.includes(channel));
const unusedHandlers=handled.filter(channel=>!exposed.includes(channel));

const requiredScripts=['test','test:python','desktop:prepare','desktop:dist','audit:architecture'];
const missingScripts=requiredScripts.filter(name=>typeof packageJson.scripts?.[name]!=='string');

const requiredModules=[
  'local-ai/intent.mjs','local-ai/catalog.mjs','local-ai/knowledge.mjs','local-ai/study.mjs',
  'clinical/engine.cjs','clinical/assessment.mjs','clinical/safety.mjs',
  'imaging/core.mjs','imaging/pipeline.mjs','imaging/quality.mjs','imaging/live-controller.mjs',
  'imaging/anatomy-registration.mjs','imaging/temporal.mjs','imaging/model-runtime.mjs','imaging/interop.mjs',
  'imaging/calibration.mjs','imaging/coordinate-space.mjs','imaging/evidence-session.mjs',
  'probe/manager.mjs','probe/stream.mjs',
  'knowledge/ontology.mjs','knowledge/evidence-engine.mjs','knowledge/clinical-evidence.mjs','knowledge/evidence-graph.mjs','knowledge/source-ingestion.mjs','knowledge/source-registry.mjs',
  'camera/local-phone-camera.mjs','camera/frame-analysis.mjs','camera/pose-filter.mjs','camera/virtual-camera.mjs'
];
const missingModules=[];
for(const module of requiredModules){try{await fs.access(path.join(ROOT,module));}catch{missingModules.push(module);}}

const report={status:missingHandlers.length||missingScripts.length||missingModules.length?'FAIL':'PASS',
  ipc:{exposed:[...new Set(exposed)].sort(),handled:[...new Set(handled)].sort(),missingHandlers:[...new Set(missingHandlers)].sort(),unusedHandlers:[...new Set(unusedHandlers)].sort()},
  scripts:{missing:missingScripts},
  requiredModules:{count:requiredModules.length,missing:missingModules}
};
console.log(JSON.stringify(report,null,2));
if(report.status!=='PASS')process.exit(1);
console.log('INTEGRATION_AUDIT_PASSED');
