package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/sirupsen/logrus"
)

// MetricData represents collected system metrics
type MetricData struct {
	Timestamp   time.Time `json:"timestamp"`
	NodeID      string    `json:"node_id"`
	CPU         CPUInfo   `json:"cpu"`
	Memory      MemInfo   `json:"memory"`
	Network     NetInfo   `json:"network"`
}

type CPUInfo struct {
	UsagePercent float64 `json:"usage_percent"`
	LoadAvg      []float64 `json:"load_avg"`
	Cores        int     `json:"cores"`
}

type MemInfo struct {
	Total       uint64  `json:"total"`
	Available   uint64  `json:"available"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type NetInfo struct {
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
}

type Agent struct {
	nodeID     string
	collector  *MetricCollector
	server     *http.Server
	logger     *logrus.Logger
}

type MetricCollector struct {
	lastNetStats map[string]net.IOCountersStat
}

func NewAgent(nodeID string) *Agent {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	return &Agent{
		nodeID:    nodeID,
		collector: NewMetricCollector(),
		logger:    logger,
	}
}

func NewMetricCollector() *MetricCollector {
	return &MetricCollector{
		lastNetStats: make(map[string]net.IOCountersStat),
	}
}

func (a *Agent) collectMetrics() (*MetricData, error) {
	// Collect CPU metrics
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU metrics: %w", err)
	}

	loadAvg, err := cpu.LoadAvg()
	if err != nil {
		return nil, fmt.Errorf("failed to get load average: %w", err)
	}

	cpuCount, err := cpu.Counts(true)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU count: %w", err)
	}

	// Collect memory metrics
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get memory metrics: %w", err)
	}

	// Collect network metrics
	netStats, err := net.IOCounters(true)
	if err != nil {
		return nil, fmt.Errorf("failed to get network metrics: %w", err)
	}

	// Calculate network deltas
	var netInfo NetInfo
	for _, stat := range netStats {
		if stat.Name == "eth0" || stat.Name == "en0" { // Primary interface
			if lastStat, exists := a.collector.lastNetStats[stat.Name]; exists {
				netInfo.BytesSent = stat.BytesSent - lastStat.BytesSent
				netInfo.BytesRecv = stat.BytesRecv - lastStat.BytesRecv
				netInfo.PacketsSent = stat.PacketsSent - lastStat.PacketsSent
				netInfo.PacketsRecv = stat.PacketsRecv - lastStat.PacketsRecv
			}
			a.collector.lastNetStats[stat.Name] = stat
			break
		}
	}

	metrics := &MetricData{
		Timestamp: time.Now(),
		NodeID:    a.nodeID,
		CPU: CPUInfo{
			UsagePercent: cpuPercent[0],
			LoadAvg:      []float64{loadAvg.Load1, loadAvg.Load5, loadAvg.Load15},
			Cores:        cpuCount,
		},
		Memory: MemInfo{
			Total:       memInfo.Total,
			Available:   memInfo.Available,
			Used:        memInfo.Used,
			UsedPercent: memInfo.UsedPercent,
		},
		Network: netInfo,
	}

	return metrics, nil
}

func (a *Agent) metricsHandler(w http.ResponseWriter, r *http.Request) {
	metrics, err := a.collectMetrics()
	if err != nil {
		a.logger.WithError(err).Error("Failed to collect metrics")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

func (a *Agent) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"node_id": a.nodeID,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (a *Agent) Start(port string) error {
	router := mux.NewRouter()
	router.HandleFunc("/metrics", a.metricsHandler).Methods("GET")
	router.HandleFunc("/health", a.healthHandler).Methods("GET")

	a.server = &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	a.logger.WithField("port", port).Info("Starting CloudPulse agent")
	return a.server.ListenAndServe()
}

func main() {
	nodeID := os.Getenv("NODE_ID")
	if nodeID == "" {
		hostname, err := os.Hostname()
		if err != nil {
			log.Fatal("Failed to get hostname and NODE_ID not set")
		}
		nodeID = hostname
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	agent := NewAgent(nodeID)
	log.Fatal(agent.Start(port))
}
