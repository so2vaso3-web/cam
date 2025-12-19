import os
import json
import http.server
from urllib.parse import urlparse
from socketserver import ThreadingMixIn

# Serve from current directory
# Railway và các platform khác sẽ cung cấp PORT qua environment variable
PORT = int(os.environ.get('PORT', 8000))
IP_LOG_FILE = os.path.join(os.getcwd(), "ip_logs.json")

def load_ip_logs():
    if not os.path.exists(IP_LOG_FILE):
        return []
    try:
        with open(IP_LOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_ip_logs(data):
    try:
        with open(IP_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving IP logs:", e)

class ThreadingSimpleServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler với headers chống cache và API log IP"""
    
    def end_headers(self):
        # Thêm headers chống cache cho tất cả file
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Tắt log messages để console sạch hơn
        pass
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/ips":
            # Trả về danh sách IP đã log
            data = load_ip_logs()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
        return super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/log-ip":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length) if content_length > 0 else b"{}"
                payload = json.loads(body.decode('utf-8') or "{}")
            except Exception:
                payload = {}
            # Lấy IP client (ưu tiên từ payload nếu gửi kèm)
            client_ip = payload.get("ip") or self.client_address[0] or "unknown"
            if client_ip:
                logs = load_ip_logs()
                existing = next((item for item in logs if item.get("ip") == client_ip), None)
                from datetime import datetime
                now = datetime.utcnow().isoformat()
                if existing:
                    existing["lastAccess"] = now
                    existing["count"] = existing.get("count", 1) + 1
                else:
                    logs.append({
                        "ip": client_ip,
                        "firstAccess": now,
                        "lastAccess": now,
                        "count": 1
                    })
                save_ip_logs(logs)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "ip": client_ip}).encode('utf-8'))
            return
        return super().do_POST()

Handler = NoCacheHTTPRequestHandler

with ThreadingSimpleServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Serving directory: {os.getcwd()}")
    print("Cache disabled - files will always be fresh")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()
