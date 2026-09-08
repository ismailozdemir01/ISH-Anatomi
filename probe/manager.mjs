const SUPPORTED_TRANSPORTS = new Set(['usb','wifi','bluetooth-le']);

export class ProbeManager {
  constructor() { this.adapters = new Map(); this.active = null; }

  register(adapter) {
    if (!adapter?.id || !SUPPORTED_TRANSPORTS.has(adapter.transport)) throw new Error('INVALID_PROBE_ADAPTER');
    if (typeof adapter.connect !== 'function' || typeof adapter.disconnect !== 'function') throw new Error('INVALID_PROBE_ADAPTER_INTERFACE');
    this.adapters.set(adapter.id, adapter);
  }

  list() { return [...this.adapters.values()].map(a => ({id:a.id, name:a.name ?? a.id, transport:a.transport, capabilities:a.capabilities ?? []})); }

  async connect(id) {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error('PROBE_NOT_FOUND');
    if (this.active && this.active.id !== id) await this.disconnect();
    await adapter.connect();
    this.active = adapter;
    return this.status();
  }

  async disconnect() {
    if (this.active) await this.active.disconnect();
    this.active = null;
    return this.status();
  }

  status() {
    if (!this.active) return {status:'NOT_CONNECTED'};
    return {status:'CONNECTED', id:this.active.id, name:this.active.name ?? this.active.id, transport:this.active.transport, capabilities:this.active.capabilities ?? [], telemetry:this.active.telemetry?.() ?? null};
  }
}

export function createBluetoothLEAdapter({id, name, connect, disconnect, telemetry, capabilities = []}) {
  return {id, name, transport:'bluetooth-le', connect, disconnect, telemetry, capabilities};
}

export function createWiFiAdapter({id, name, connect, disconnect, telemetry, capabilities = []}) {
  return {id, name, transport:'wifi', connect, disconnect, telemetry, capabilities};
}

export function createUSBAdapter({id, name, connect, disconnect, telemetry, capabilities = []}) {
  return {id, name, transport:'usb', connect, disconnect, telemetry, capabilities};
}
