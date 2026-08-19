export type Options = {
  debug: boolean;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export type EventHooks = {
  onConnect: () => void;
  onDisconnect: (event: CloseEvent) => void;
  onMessage: (message: any) => void;
  onError: (error: Event) => void;
  onMaxReconnectAttempts: () => void;
  pollStats: () => { [key: string]: unknown }
}

export class WebSocketClient {
  url: string;
  options: Options;
  ws: WebSocket | null;
  heartbeatTimer: number | null;
  heartbeatTimeoutTimer: number | null;
  reconnectAttempts: number;
  isIntentionallyClosed: boolean;
  pendingPings: Map<number, { timeoutId: number }>;
  _connected: boolean = false;
  _estimatedLatency: number = 0;

  onConnect: () => void;
  onDisconnect: (event: CloseEvent) => void;
  onMessage: (message: any) => void;
  onError: (error: Event) => void;
  onMaxReconnectAttempts: () => void;
  pollStats: () => { [key: string]: unknown }

  constructor(url: string, options: Partial<Options & EventHooks> = {}) {
    this.url = url;
    this.options = {
      debug: options.debug ?? false,
      heartbeatInterval: options.heartbeatInterval || 30000,
      heartbeatTimeout: options.heartbeatTimeout || 10000,
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
    };

    this.ws = null;
    this.heartbeatTimer = null;
    this.heartbeatTimeoutTimer = null;
    this.reconnectAttempts = 0;
    this.isIntentionallyClosed = false;
    this.pendingPings = new Map();

    const noop = () => { };
    this.onConnect = options.onConnect ?? noop;
    this.onDisconnect = options.onDisconnect ?? noop;
    this.onMessage = options.onMessage ?? noop;
    this.onError = options.onError ?? noop;
    this.onMaxReconnectAttempts = options.onMaxReconnectAttempts ?? noop;
    this.pollStats = options.pollStats ?? (() => ({})),

    this.connect();
  }

  public get connected() {
    return this._connected;
  }

  public get estimatedLatency() {
    return this._estimatedLatency;
  }

  connect() {
    // Reset intentional close flag
    this.isIntentionallyClosed = false;

    console.info(`[websocket] Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.info('[websocket] Connected to ' + this.url);
      this._connected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[websocket] Error parsing message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.info(`[websocket] closed: ${event.code} - ${event.reason}`);
      this._connected = false;
      this.stopHeartbeat();
      this.onDisconnect(event);

      // Attempt reconnection if not intentionally closed
      if (!this.isIntentionallyClosed) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[websocket] error:', error);
      this.onError(error);
    };
  }

  handleMessage(message: any) {
    this.resetHeartbeatTimeout();
    if ('type' in message) {
      // Handle server heartbeat ping
      if (message.type === 'ping') {
        // Respond immediately with pong
        this.send({
          type: 'pong',
          id: message.id,
          timestamp: message.timestamp,
          clientTime: Date.now(),
          properties: this.pollStats()
        });
        return;
      }

      // Handle server response to our ping
      if (message.type === 'pong') {
        const pingId = Math.floor(message.timestamp);
        const pending = this.pendingPings.get(pingId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          this.pendingPings.delete(pingId);
          const latency = Date.now() - pingId;
          this._estimatedLatency = latency;
          console.info(`[websocket] Round-trip latency: ${latency}ms`);
        }
        return;
      }
    }

    // Forward to application handler
    this.onMessage(message);
  }

  startHeartbeat() {
    // Clear any existing timers
    this.stopHeartbeat();

    // Send periodic client heartbeats
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, this.options.heartbeatInterval);

    // Set initial timeout
    this.resetHeartbeatTimeout();
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
    // Clear pending pings
    for (const pending of this.pendingPings.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingPings.clear();
  }

  resetHeartbeatTimeout() {
    // Clear existing timeout
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
    }

    // Set new timeout - if no data received, assume connection is dead
    this.heartbeatTimeoutTimer = setTimeout(() => {
      console.info('[websocket] Heartbeat timeout - connection appears dead');
      this.ws?.close(4000, 'Heartbeat timeout');
    }, this.options.heartbeatInterval + this.options.heartbeatTimeout);
  }

  sendPing() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const timestamp = Date.now();
    this.send({
      type: 'ping',
      timestamp,
      clientTime: timestamp,
      properties: this.pollStats()
    });
    
    // Track pending ping with timeout
    const timeoutId = setTimeout(() => {
      if (this.pendingPings.has(timestamp)) {
        this.pendingPings.delete(timestamp);
        console.info('[websocket] Ping timeout - no pong received');
      }
    }, this.options.heartbeatTimeout);

    this.pendingPings.set(timestamp, { timeoutId });
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[websocket] Cannot send - WebSocket not open');
    }
  }

  public attemptReconnect(resetReconnectAttempts: boolean = false) {
    if (this._connected) return;

    if (resetReconnectAttempts)
      this.reconnectAttempts = 0;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.warn('[websocket] Max reconnection attempts reached');
      this.onMaxReconnectAttempts();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5);

    if (this.options.debug)
      console.info(`[websocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public close() {
    this._connected = false;
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client closed');
      this.ws = null;
    }
  }
}
