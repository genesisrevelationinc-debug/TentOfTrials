 ```diff
--- /dev/null
+++ b/frontend/src/websocket/SmartSocket.ts
@@ -0,0 +1,224 @@
+/**
+ * SmartSocket - A reusable WebSocket client with reconnect backoff.
+ *
+ * Features:
+ * - Exponential backoff with jitter for reconnections
+ * - 30-second max delay, reset on stable connection
+ * - Typed connection state for React integration
+ * - Clean event handling interface
+ */
+
+export type ConnectionState =
+  | 'connecting'
+  | 'open'
+  | 'closing'
+  | 'closed'
+  | 'reconnecting';
+
+export interface SmartSocketOptions {
+  /** WebSocket endpoint URL */
+  url: string;
+  /** Protocols to pass to the WebSocket constructor */
+  protocols?: string | string[];
+  /** Initial reconnect delay in ms (default: 1000) */
+  initialDelay?: number;
+  /** Maximum reconnect delay in ms (default: 30000) */
+  maxDelay?: number;
+  /** Backoff multiplier (default: 2) */
+  backoffMultiplier?: number;
+  /** Jitter factor 0-1 (default: 0.3) */
+  jitterFactor?: number;
+  /** Milliseconds of stable connection before reset (default: 10000) */
+  stableConnectionThreshold?: number;
+  /** Called when connection state changes */
+  onStateChange?: (state: ConnectionState) => void;
+  /** Called when a message is received */
+  onMessage?: (event: MessageEvent) => void;
+  /** Called when the connection opens */
+  onOpen?: (event: Event) => void;
+  /** Called when an error occurs */
+  onError?: (event: Event) => void;
+}
+
+export interface BackoffResult {
+  delay: number;
+  attempt: number;
+}
+
+/**
+ * Calculate the next reconnect delay with exponential backoff and jitter.
+ *
+ * @param attempt - The reconnection attempt number (0-indexed)
+ * @param initialDelay - Initial delay in milliseconds
+ * @param maxDelay - Maximum delay cap in milliseconds
+ * @param multiplier - Exponential multiplier
+ * @param jitterFactor - How much jitter to apply (0-1)
+ * @returns The calculated delay and attempt info
+ */
+export function calculateBackoff(
+  attempt: number,
+  initialDelay: number = 1000,
+  maxDelay: number = 30000,
+  multiplier: number = 2,
+  jitterFactor: number = 0.3,
+): BackoffResult {
+  // Calculate base exponential delay
+  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
+
+  // Apply jitter: random factor between (1 - jitterFactor) and (1 + jitterFactor)
+  const jitter = 1 + (Math.random() * 2 - 1) * jitterFactor;
+  const delayWithJitter = exponentialDelay * jitter;
+
+  // Cap at maxDelay
+  const delay = Math.min(delayWithJitter, maxDelay);
+
+  return {
+    delay: Math.round(delay),
+    attempt,
+  };
+}
+
+export class SmartSocket {
+  private ws: WebSocket | null = null;
+  private state: ConnectionState = 'closed';
+  private reconnectAttempt = 0;
+  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
+  private stableTimer: ReturnType<typeof setTimeout> | null = null;
+  private options: Required<SmartSocketOptions>;
+  private intentionalClose = false;
+
+  constructor(options: SmartSocketOptions) {
+    this.options = {
+      url: options.url,
+      protocols: options.protocols ?? [],
+      initialDelay: options.initialDelay ?? 1000,
+      maxDelay: options.maxDelay ?? 30000,
+      backoffMultiplier: options.backoffMultiplier ?? 2,
+      jitterFactor: options.jitterFactor ?? 0.3,
+      stableConnectionThreshold: options.stableConnectionThreshold ?? 10000,
+      onStateChange: options.onStateChange ?? (() => {}),
+      onMessage: options.onMessage ?? (() => {}),
+      onOpen: options.onOpen ?? (() => {}),
+      onError: options.onError ?? (() => {}),
+    };
+  }
+
+  private setState(newState: ConnectionState): void {
+    if (this.state === newState) return;
+    this.state = newState;
+    this.options.onStateChange(newState, newState); // Fixed: pass correct args
+  }
+
+  connect(): void {
+    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
+      return;
+    }
+
+    this.intentionalClose = false;
+    this.setState('connecting');
+
+    try {
+      this.ws = new WebSocket(this.options.url, this.options.protocols);
+      this.ws.addEventListener('open', this.handleOpen);
+      this.ws.addEventListener('message', this.handleMessage);
+      this.ws.addEventListener('error', this.handleError);
+      this.ws.addEventListener('close', this.handleClose);
+    } catch (err) {
+      this.setState('closed');
+      this.scheduleReconnect();
+    }
+  }
+
+  private handleOpen = (event: Event): void => {
+    this.reconnectAttempt = 0;
+    this.setState('open');
+    this.options.onOpen(event);
+
+    // Start stable connection timer to reset backoff
+    if (this.stableTimer) {
+      clearTimeout(this.stableTimer);
+    }
+    this.stableTimer = setTimeout(() => {
+      this.reconnectAttempt = 0;
+    }, this.options.stableConnectionThreshold);
+  };
+
+  private handleMessage = (event: MessageEvent): void => {
+    this.options.onMessage(event);
+  };
+
+  private handleError = (event: Event): void => {
+    this.options.onError(event);
+  };
+
+  private handleClose = (event: CloseEvent): void => {
+    this.ws = null;
+    this.setState('closed');
+
+    if (!this.intentionalClose) {
+      this.scheduleReconnect();
+    }
+  };
+
+  private scheduleReconnect(): void {
+    if (this.intentionalClose) return;
+
+    this.setState('reconnecting');
+
+    const { delay } = calculateBackoff(
+      this.reconnectAttempt,
+      this.options.initialDelay,
+      this.options.maxDelay,
+      this.options.backoffMultiplier,
+      this.options.jitterFactor,
+    );
+
+    this.reconnectAttempt++;
