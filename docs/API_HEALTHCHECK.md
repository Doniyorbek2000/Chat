# VOXO API Health Check and Monitoring

---

## Health Check Endpoint

### `GET /health`

Returns the current status of the API and its dependencies.

**Request:**
```bash
curl -sf https://api.voxo.uz/health
```

**Response (healthy):**
```json
{
  "status": "ok",
  "uptime": 3600.42,
  "timestamp": "2026-06-05T10:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

**Response (degraded):**
```json
{
  "status": "degraded",
  "uptime": 7200.10,
  "timestamp": "2026-06-05T10:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "error",
    "storage": "ok"
  }
}
```

HTTP status code is `200` when healthy, `503` when degraded or down.

**Nginx configuration:** The `/health` location is exempt from rate limiting and access logs are disabled to avoid noise.

---

## Liveness vs Readiness

| Endpoint | Purpose | Rate Limited |
|----------|---------|--------------|
| `GET /health` | Full dependency check | No |
| `GET /health/live` | Process alive (no DB check) | No |
| `GET /health/ready` | Ready to serve traffic | No |

Use `/health/live` for Docker `HEALTHCHECK` and Kubernetes liveness probes. Use `/health/ready` for readiness probes.

**Docker Compose healthcheck:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-sf", "http://localhost:3000/health/live"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 30s
```

---

## External Uptime Monitoring

### UptimeRobot (recommended for small deployments)

1. Create a free account at https://uptimerobot.com
2. Add a new monitor:
   - Type: `HTTPS`
   - URL: `https://api.voxo.uz/health`
   - Interval: `5 minutes`
   - Alert threshold: `2 failures`
3. Add alert contacts: email + Telegram

### Betterstack (recommended for production)

```bash
# Betterstack heartbeat (run from cron every 5 min)
curl -sf https://uptime.betterstack.com/api/v1/heartbeat/YOUR_HEARTBEAT_KEY
```

---

## Internal Health Check Script

```bash
#!/bin/bash
# Run on the server to check all services
set -e

API_URL="${API_URL:-https://api.voxo.uz}"

echo "=== Checking API health ==="
response=$(curl -sf "$API_URL/health")
status=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")

if [ "$status" != "ok" ]; then
  echo "ALERT: API status is $status"
  echo "$response"
  exit 1
fi

echo "API: OK"
echo "Response: $response"

echo "=== Checking nginx ==="
docker compose -f /opt/voxo/docker-compose.prod.yml exec nginx nginx -t && echo "Nginx config: OK"

echo "=== Container status ==="
docker compose -f /opt/voxo/docker-compose.prod.yml ps

echo "=== Disk usage ==="
df -h /

echo "=== All checks passed ==="
```

Save as `/opt/voxo/scripts/healthcheck.sh` and run from cron:
```bash
*/5 * * * * root bash /opt/voxo/scripts/healthcheck.sh >> /var/log/voxo-health.log 2>&1
```

---

## Alerting

### Telegram Notifications via Webhook

Add to your monitoring script to send Telegram alerts on failure:

```bash
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"

send_alert() {
  local message="$1"
  curl -sf -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=🚨 VOXO ALERT: $message" \
    -d "parse_mode=HTML"
}

# Usage
send_alert "API health check failed at $(date)"
```

---

## Log Monitoring

```bash
# Watch nginx access log for 4xx/5xx errors
docker compose -f /opt/voxo/docker-compose.prod.yml exec nginx \
  tail -f /var/log/nginx/access.log | grep -E ' [45][0-9]{2} '

# Watch backend error log
docker compose -f /opt/voxo/docker-compose.prod.yml logs -f voxo-backend \
  | grep -E 'ERROR|WARN|error|warn'

# Count request rates (last 100 lines)
docker compose -f /opt/voxo/docker-compose.prod.yml exec nginx \
  tail -100 /var/log/nginx/access.log \
  | awk '{print $9}' | sort | uniq -c | sort -rn
```

---

## Performance Baselines

Expected response times under normal load:

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `GET /health` | < 5ms | < 20ms | < 50ms |
| `POST /api/v1/auth/login` | < 100ms | < 300ms | < 500ms |
| `GET /api/v1/users/me` | < 30ms | < 100ms | < 200ms |
| WebSocket connect | < 50ms | < 150ms | < 300ms |

If p95 exceeds these thresholds, check:
1. Database query times via `EXPLAIN ANALYZE`
2. Redis cache hit rate
3. Container CPU/memory via `docker stats`
