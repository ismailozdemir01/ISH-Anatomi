import test from 'node:test';
import assert from 'node:assert/strict';
import {EvidenceSession} from './evidence-session.mjs';

test('evidence events are ordered and exported',()=>{const s=new EvidenceSession({id:'s1',probeId:'p1',startedAt:10});s.append({type:'FRAME',frameId:'f1',timestamp:20});s.append({type:'REGISTRATION',frameId:'f1',timestamp:30,structureId:'heart',confidence:.91});const out=s.export();assert.equal(out.schema,'ish-anatomi.evidence.v1');assert.equal(out.session.eventCount,2);assert.equal(out.events[1].sequence,1);});
test('invalid event cannot enter audit trail',()=>{const s=new EvidenceSession();assert.throws(()=>s.append({type:'FRAME'}),/INVALID_EVIDENCE_EVENT/);});
