import os
import sys

# Lấy đường dẫn tuyệt đối của file này
current_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(current_dir)

# Import và chạy server
import http.server
import socketserver

PORT = int(os.environ.get('PORT', 8000))

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler với headers chống cache"""
    
    def end_headers(self):
        # Thêm headers chống cache cho tất cả file
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Thêm CORS headers nếu cần
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Tắt log messages để console sạch hơn
        pass

Handler = NoCacheHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Serving directory: {os.getcwd()}")
    print("Cache disabled - files will always be fresh")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()
