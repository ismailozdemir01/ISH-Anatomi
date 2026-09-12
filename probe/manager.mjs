const SUPPORTED_TRANSPORTS = new Set(['usb', 'wifi', 'bluetooth-le']);
const CONNECTED = 'CONNECTED';
const NOT_CONNECTED = 'NOT_CONNECTED';
const ERROR = 'ERROR';

function requireFunction(adapter, name) {
  if (typeof adapter?.[name] !== 'function') throw new Error(`INVALID_PROBE_${name.toUpperCase()}_INTERFACE`);
}

function normalizeCapabilities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))];
}

export class ProbeManager {
  constructor({clock = () => Date.now()} = {}) {
    this.adapters = new Map();
    this.active = null;
    this.lastError = null;
    this.clock = clock;
  }

  register(adapter) {
    if (!adapter?.id || typeof adapter.id !== 'string' || !SUPPORTED_TRANSPORTS.has(adapter.transport)) throw new Error('INVALID_PROBE_ADAPTER');
    requireFunction(adapter, 'connect');
    requireFunction(adapter, 'disconnect');
    if (adapter.telemetry != null) requireFunction(adapter, 'telemetry');
    if (adapter.capabilities != null && !Array.isArray(adapter.capabilities)) throw new Error('INVALID_PROBE_CAPABILITIES');
    this.adapters.set(adapter.id, {...adapter, capabilities: normalizeCapabilities(adapter.capabilities)});
    return this.adapters.get(adapter.id);
  }

  unregister(id) {
    if (this.active?.id === id) throw new Error('ACTIVE_PROBE_CANNOT_BE_UNREGISTERED');
    return this.adapters.delete(id);
  }

  list() {
    return [...this.adapters.values()].map(a => ({id: a.id, name: a.name ?? a.id, transport: a.transport, capabilities: [...a.capabilities]}));
  }

  async connect(id) {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error('PROBE_NOT_FOUND');
    if (this.active?.id === id) return this.status();
    if (this.active) await this.disconnect();
    try {
      await adapter.connect();
      this.active = {...adapter, connectedAt: this.clock()};
      this.lastError = null;
      return this.status();
    } catch (error) {
      this.active = null;
      this.lastError = {code: 'PROBE_CONNECT_FAILED', message: error instanceof Error ? error.message : String(error), at: this.clock()};
      throw error;
    }
  }

  async disconnect() {
    if (!this.active) return this.status();
    const adapter = this.active;
    this.active = null;
    try {
      await adapter.disconnect();
      return this.status();
    } catch (error) {
      this.lastError = {code: 'PROBE_DISCONNECT_FAILED', message: error instanceof Error ? error.message : String(error), at: this.clock()};
      throw error;
    }
  }

  status() {
    if (!this.active) {
      return this.lastError ? {status: NOT_CONNECTED, error: this.lastError} : {status: NOT_CONNECTED};
    }
    let telemetry = null;
    try {
      telemetry = this.active.telemetry?.() ?? null;
    } catch (error) {
      telemetry = {status: ERROR, message: error instanceof Error ? error.message : String(error)};
    }
    return {
      status: CONNECTED,
      id: this.active.id,
      name: this.active.name ?? this.active.id,
      transport: this.active.transport,
      capabilities: [...this.active.capabilities],
      telemetry,
      connectedAt: this.active.connectedAt,
      ...(this.lastError ? {error: this.lastError} : {})
    };
  }
}

function adapter({id, name, transport, connect, disconnect, telemetry, capabilities = []}) {
  return {id, name, transport, connect, disconnect, telemetry, capabilities};
}

export function createBluetoothLEAdapter(options) { return adapter({...options, transport: 'bluetooth-le'}); }
export function createWiFiAdapter(options) { return adapter({...options, transport: 'wifi'}); }
export function createUSBAdapter(options) { return adapter({...options, transport: 'usb'}); }
