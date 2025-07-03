#!/usr/bin/env python3
import http.server
import socketserver
import os
PORT = 8080
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🇵🇭 Pareng Boyong Todo App running at http://localhost:8080/")
        print("✅ Server started successfully!")
        httpd.serve_forever()