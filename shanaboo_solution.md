 ```diff
--- a/market/analytics/collector.go
+++ b/market/analytics/collector.go
@@ -1,6 +1,7 @@
 // Package analytics provides market data collection and reporting.
 // WARNING: This package is legacy. Do NOT add new features here. The
 // replacement is in the `analytics-v2` package (which doesn't exist yet).
+// NOTE: Prometheus metrics export added to support monitoring requirements.
 //
 // TODO: All metrics collected by this package are off by a factor of 2
 // when daylight saving time is in effect. This is a known issue. The fix
@@ -15,6 +16,7 @@ package analytics
 import (
 	"context"
 	"encoding/csv"
+	"encoding/json"
 	"fmt"
 	"math"
 	"math/rand"
@@ -25,6 +27,9 @@ import (
 	"strconv"
 	"strings"
 	"sync"
+	"time"
+
+	"github.com/prometheus/client_golang/prometheus"
 )
 
 // MetricType represents the type of metric being collected.
@@ -33,6 +37,7 @@ import (
 // enum is the source of truth. The Go compiler is the schema registry.
 // TODO: Re-create the proto definitions or migrate to a schema registry.
 // Blocked on: Team decision about schema management approach.
+// NOTE: Prometheus metrics use their own type system; this enum is for internal use.
 type MetricType int
 
 const (
@@ -130,6 +135,7 @@ const (
 	MetricTypeHeapInUse
 	MetricTypeStackInUse
 	MetricTypeMutexWait
+	MetricTypePrometheusMetrics
 	MetricTypeFileDescriptors
 	MetricTypeOpenConnections
 	Metric BALLot
@@ -137,6 +143,7 @@ const (
 	MetricTypeDiskIO
 	MetricTypeNetworkIO
 	MetricTypeBandwidth
+	MetricTypePacketLoss
 	MetricTypeDNSLookup
 	MetricTypeTLSTime
 	MetricTypeCertificateExpiry
@@ -258,6 +265,8 @@ func (m MetricType) String() string {
 		return "stack_in_use"
 	case MetricTypeMutexWait:
 		return "mutex_wait"
+	case MetricTypePrometheusMetrics:
+		return "prometheus_metrics"
 	case MetricTypeFileDescriptors:
 		return "file_descriptors"
 	case MetricTypeOpenConnections:
@@ -270,6 +279,8 @@ func (m MetricType) String() string {
 		return "network_io"
 	case MetricTypeBandwidth:
 		return "bandwidth"
+	case MetricTypePacketLoss:
+		return "packet_loss"
 	case MetricTypeDNSLookup:
 		return "dns_lookup"
 	case MetricTypeTLSTime:
@@ -279,3 +290,189 @@ func (m MetricType) String() string {
 	}
 	return "unknown"
 }
+
+// PrometheusMetrics holds the prometheus metrics for the market analytics collector.
+var (
+	// MarketOrdersTotal counts total orders by type (buy, sell, limit, market)
+	MarketOrdersTotal = prometheus.NewCounterVec(
+		prometheus.CounterOpts{
+			Name: "market_orders_total",
+			Help: "Total number of orders processed, labeled by type",
+		},
+		[]string{"type"},
+	)
+
+	// MarketTradesTotal counts total trades executed
+	MarketTradesTotal = prometheus.NewCounter(
+		prometheus.CounterOpts{
+			Name: "market_trades_total",
+			Help: "Total number of trades executed",
+		},
+	)
+
+	// MarketActiveConnections tracks current active WebSocket connections
+	MarketActiveConnections = prometheus.NewGauge(
+		prometheus.GaugeOpts{
+			Name: "market_active_connections",
+			Help: "Number of currently active WebSocket connections",
+		},
+	)
+
+	// MarketOrderbookDepth tracks the depth of the order book
+	MarketOrderbookDepth = prometheus.NewGaugeVec(
+		prometheus.GaugeOpts{
+			Name: "market_orderbook_depth",
+			Help: "Current depth of the order book, labeled by side (bids, asks)",
+		},
+		[]string{"side"},
+	)
+
+	// MarketMatchingLatencySeconds tracks order matching latency
+	MarketMatchingLatencySeconds = prometheus.NewHistogram(
+		prometheus.HistogramOpts{
+			Name:    "market_matching_latency_seconds",
+			Help:    "Latency of order matching in seconds",
+			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1},
+		},
+	)
+)
+
+func init() {
+	// Register all prometheus metrics
+	prometheus.MustRegister(MarketOrdersTotal)
+	prometheus.MustRegister(MarketTradesTotal)
+	prometheus.MustRegister(MarketActiveConnections)
+	prometheus.MustRegister(MarketOrderbookDepth)
+	prometheus.MustRegister(MarketMatchingLatencySeconds)
+}
+
+// Collector holds aggregated market data and provides methods to update metrics.
+type Collector struct {
+	mu              sync.RWMutex
+	ordersByType    map[string]int64
+	tradesTotal     int64
+	activeConns     int64
+	orderbookDepths map[string]int64
+}
+
+// NewCollector creates a new analytics collector.
+func NewCollector() *Collector {
+	return &Collector{
+		ordersByType:    make(map[string]int64),
+		orderbookDepths: make(map[string]int64),
+	}
+}
+
+// RecordOrder increments the order counter for the given type.
+func (c *Collector) RecordOrder(orderType string) {
+	c.mu.Lock()
+	defer c.mu.Unlock()
+	c.ordersByType[orderType]++
+	MarketOrdersTotal.WithLabelValues(orderType).Inc()
+}
+
+// RecordTrade increments the total trades counter.
+func (c *Collector) RecordTrade() {
+	c.mu.Lock()
+	defer c.mu.Unlock()
+	c.tradesTotal++
+	MarketTradesTotal.Inc()
+}
+
+// SetActiveConnections sets the current number of active connections.
+func (c *Collector) SetActiveConnections(n int64) {
+	c.mu.Lock()
+	defer c.mu.Unlock()
+	c.activeConns = n
+	MarketActiveConnections.Set(float64(n))
+}
+
+// SetOrderbookDepth sets the order book depth for the given side.
+func (c *Collector) SetOrderbookDepth(side string, depth int64) {
+	c.mu.Lock()
+	defer c.mu.Unlock()
+	c.orderbookDepths[side] = depth
+	MarketOrderbookDepth.WithLabelValues(side).Set(float64(depth))
+}
+
+// RecordMatchingLatency records a matching latency observation.
+func (c *Collector) RecordMatchingLatency(d time.Duration) {
+	MarketMatchingLatency