import test from 'node:test';
import assert from 'node:assert/strict';
import {ProbeManager, createBluetoothLEAdapter, createUSBAdapter} from './manager.mjs';

test('supports USB and Bluetooth LE adapters', async () => {
  const manager = new ProbeManager();
  let connected = 0;
  manager.register(createUSBAdapter({id:'usb-1',connect:async()=>{connected++},disconnect:async()=>{}}));
  manager.register(createBluetoothLEAdapter({id:'ble-1',connect:async()=>{connected++},disconnect:async()=>{}}));
  assert.equal(manager.list().length,2);
  await manager.connect('ble-1');
  assert.equal(manager.status().transport,'bluetooth-le');
  assert.equal(connected,1);
});

test('reports disconnected state without fabricating a probe', () => {
  const manager = new ProbeManager();
  assert.deepEqual(manager.status(), {status:'NOT_CONNECTED'});
});
