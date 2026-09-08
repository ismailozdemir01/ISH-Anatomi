import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvidenceGraph,evaluateCandidates,graphForClinicalCase} from './evidence-graph.mjs';

test('builds graph from observations measurements imaging and evidence',()=>{
  const r=buildEvidenceGraph({observations:['chest pain'],measurements:['EF 45%'],imagingFindings:['reduced ventricular function'],evidence:[{chunkId:'c1',text:'cardiac dysfunction may present with reduced ventricular function',source:'Reference',provider:'Publisher',chapter:'Cardiology',section:'Echo',score:0.8}]});
  assert.equal(r.nodes.length,4); assert.equal(r.edges.length,3); assert.equal(r.edges[0].relation,'SUPPORTS');
});

test('ranks only candidates supported by evidence text',()=>{
  const graph=buildEvidenceGraph({observations:['finding'],evidence:[{chunkId:'c1',text:'cardiac dysfunction is associated with this finding',source:'Reference',provider:'Publisher',score:1}]});
  const r=evaluateCandidates([{name:'cardiac dysfunction'},{name:'pneumonia'}],graph);
  assert.equal(r.status,'READY'); assert.equal(r.candidates[0].name,'cardiac dysfunction'); assert.equal(r.candidates[0].evidenceHits,1);
});

test('does not invent a candidate without evidence',()=>{
  const r=graphForClinicalCase({observations:['finding'],evidence:[]});
  assert.equal(r.status,'NO_EVIDENCE'); assert.equal(r.graph.nodes.length,1);
});
