export type AgentTraceEvent = {
  agent: string;
  status: string;
  message: string;
  tool_name?: string;
  confidence?: number;
  duration_ms?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

type TraceHandler = (event: AgentTraceEvent) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

export class AgentTraceSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Set<TraceHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(runId: string, baseUrl?: string) {
    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = baseUrl || `${scheme}//${window.location.host}`;
    this.url = `${host}/ws/agent-trace/${runId}`;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.emitStatus('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.emitStatus('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as AgentTraceEvent;
        this.listeners.forEach((fn) => fn(data));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.emitStatus('disconnected');
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.emitStatus('error');
    };
  }

  onTrace(fn: TraceHandler): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusHandler): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  send(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private emitStatus(status: Parameters<StatusHandler>[0]): void {
    this.statusListeners.forEach((fn) => fn(status));
  }
}

export function connectAgentTrace(runId: string): AgentTraceSocket {
  const socket = new AgentTraceSocket(runId);
  socket.connect();
  return socket;
}
