#!/usr/bin/env python3
import http.server
import socketserver
import os
PORT = 8081
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🇵🇭 Calculator App running at http://localhost:8081/")
        httpd.serve_forever()