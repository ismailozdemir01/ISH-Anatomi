import test from 'node:test';
import assert from 'node:assert/strict';
import {contentHash,ingestDocument,ingestIntoStore} from './source-ingestion.mjs';

test('accepts clear open/licensed source and preserves provenance',()=>{const r=ingestDocument({id:'doc1',title:'Test Anatomy',provider:'Test Publisher',language:'en',licenseStatus:'OPEN',documentType:'TEXTBOOK',edition:'1',year:2026,chapter:'Heart',section:'Echo',page:12,uri:'urn:test',text:'Heart function.\n\nEchocardiography measures ventricular function.'});assert.equal(r.status,'INGESTED');assert.equal(r.source.contentHash,contentHash('Heart function.\n\nEchocardiography measures ventricular function.'));assert.equal(r.chunks[0].chapter,'Heart');assert.equal(r.chunks[0].page,12);});

test('rejects unknown or restricted rights',()=>{for(const licenseStatus of ['UNKNOWN','RESTRICTED']){const r=ingestDocument({id:'x',title:'X',provider:'P',language:'en',licenseStatus,documentType:'TEXTBOOK',text:'content'});assert.equal(r.status,'REJECTED');}});

test('chunk ids and hashes are deterministic',()=>{const d={id:'stable',title:'T',provider:'P',language:'en',licenseStatus:'LICENSED',documentType:'USER_LICENSED',text:'one paragraph\n\ntwo paragraph'};const a=ingestDocument(d),b=ingestDocument(d);assert.deepEqual(a.chunks,b.chunks);assert.equal(a.source.contentHash,b.source.contentHash);});

test('ingests into evidence store without losing existing chunks',()=>{const d={id:'d2',title:'T2',provider:'P',language:'tr',licenseStatus:'OPEN',documentType:'GUIDELINE',text:'ultrasound imaging evidence'};const r=ingestIntoStore(d);assert.equal(r.status,'INGESTED');assert.equal(r.store.sourceMap.get('d2').title,'T2');assert.ok(r.store.index.get('ultrasound').size>0);});

test('rejects empty content',()=>{const r=ingestDocument({id:'e',title:'E',provider:'P',language:'en',licenseStatus:'OPEN',documentType:'ARTICLE',text:'   '});assert.equal(r.reason,'EMPTY_CONTENT');});
