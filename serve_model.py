#!/usr/bin/env python3
"""
Simple static file server with CORS enabled.
Serves test.html plus the models/ directory for WebGPU testing.
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class CorsRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.path = "/test.html"
        super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


def run_server(models_dir: str = "models", host: str = "localhost", port: int = 8000):
    root_path = Path(__file__).resolve().parent
    models_path = (root_path / models_dir).resolve()
    if not models_path.exists():
        raise FileNotFoundError(f"Models directory not found: {models_path}")

    handler = lambda *args, **kwargs: CorsRequestHandler(
        *args, directory=str(root_path), **kwargs
    )

    server = ThreadingHTTPServer((host, port), handler)
    print(f"Serving test page at http://{host}:{port}/test.html")
    print(f"Serving models at http://{host}:{port}/models/")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    run_server()
