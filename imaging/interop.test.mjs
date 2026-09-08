import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRealtimeMetadata,createDicomRtvAdapter,createProbeProtocolAdapter} from './interop.mjs';
test('validates realtime metadata',()=>{assert.equal(validateRealtimeMetadata({timestamp:1,frameNumber:2}).status,'READY');assert.equal(validateRealtimeMetadata({}).status,'INVALID');});
test('unconfigured DICOM RTV decoder is explicit',async()=>{const a=createDicomRtvAdapter();assert.equal(a.status,'NOT_CONFIGURED');assert.equal((await a.decode({})).status,'NOT_CONFIGURED');});
test('probe transports require real decoder',async()=>{const a=createProbeProtocolAdapter({transport:'wifi'});assert.equal(a.status,'READY');assert.equal((await a.decodeFrame({})).status,'NOT_CONFIGURED');});
