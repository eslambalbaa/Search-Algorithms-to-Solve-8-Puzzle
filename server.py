import http.server
import socketserver
import json
import subprocess
import os

PORT = 8000

class PuzzleServerHandler(http.server.SimpleHTTPRequestHandler):
    """
    Serves static frontend files and acts as an RPC bridge
    to the compiled C++ 8-puzzle solver executable.
    """
    def do_POST(self):
        if self.path == '/run':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            algo = data.get('algo', '1')
            board = data.get('board', '7 2 4 5 0 6 8 3 1')

            # Format input expected by main.exe: algorithm choice followed by the 9 tile values
            process_input = f"{algo}\n{board}\n"

            try:
                exe_path = os.path.join('output', 'main.exe')

                # Run the solver synchronously; output is written to solution.json upon completion
                subprocess.run([exe_path], input=process_input, text=True, check=True)

                with open('solution.json', 'r') as f:
                    solution = json.load(f)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(solution).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_response = {"error": str(e)}
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), PuzzleServerHandler) as httpd:
        print(f"Server active! Open your browser to: http://localhost:{PORT}")
        httpd.serve_forever()
