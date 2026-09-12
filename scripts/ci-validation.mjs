import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';

const checks=[
  ['node-check-main',['--check','desktop/main.cjs']],
  ['node-check-preload',['--check','desktop/preload.cjs']],
  ['architecture-audit',['scripts/architecture-audit.mjs']],
  ['integration-audit',['scripts/integration-audit.mjs']],
  ['node-tests',['--test','local-ai/*.test.mjs','clinical/*.test.mjs','clinical/*.test.cjs','imaging/*.test.mjs','probe/*.test.mjs','knowledge/*.test.mjs','camera/*.test.mjs']],
  ['python-tests',null]
];

function run(name,args){return new Promise(resolve=>{const command=name==='python-tests'?'python':'node';const commandArgs=name==='python-tests'?['-m','unittest','discover','-s','clinical','-p','test_*.py']:args;const child=spawn(command,commandArgs,{stdio:'inherit',shell:false});child.on('close',code=>resolve({name,code:Number.isInteger(code)?code:1}));child.on('error',()=>resolve({name,code:1}));});}

const results=[];
for(const [name,args] of checks) results.push(await run(name,args));
await fs.mkdir('.ci',{recursive:true});
await fs.writeFile('.ci/validation.json',JSON.stringify({status:results.every(x=>x.code===0)?'PASS':'FAIL',results},null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(x=>x.code!==0))process.exit(1);
