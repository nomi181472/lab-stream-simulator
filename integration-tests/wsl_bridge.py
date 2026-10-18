import socket
import threading
import subprocess
import time

host_ip = subprocess.check_output("ip route | awk '/default/ {print $3}'", shell=True).decode().strip()
print(f"Forwarding localhost:8000, 8554, 1935 -> {host_ip}")

def forward(src_port, dst_port):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", src_port))
    server.listen(50)
    while True:
        try:
            client_sock, _ = server.accept()
            def handle(c):
                try:
                    dest = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    dest.connect((host_ip, dst_port))
                    def p2d():
                        try:
                            while True:
                                data = c.recv(4096)
                                if not data:
                                    break
                                dest.sendall(data)
                        except Exception:
                            pass
                        finally:
                            try: dest.shutdown(socket.SHUT_WR)
                            except Exception: pass
                    def d2p():
                        try:
                            while True:
                                data = dest.recv(4096)
                                if not data:
                                    break
                                c.sendall(data)
                        except Exception:
                            pass
                        finally:
                            try: c.shutdown(socket.SHUT_WR)
                            except Exception: pass
                    t1 = threading.Thread(target=p2d, daemon=True)
                    t2 = threading.Thread(target=d2p, daemon=True)
                    t1.start()
                    t2.start()
                except Exception as ex:
                    c.close()
            threading.Thread(target=handle, args=(client_sock,), daemon=True).start()
        except Exception:
            pass

for p in [8000, 8554, 1935]:
    t = threading.Thread(target=forward, args=(p, p), daemon=True)
    t.start()

while True:
    time.sleep(1)
