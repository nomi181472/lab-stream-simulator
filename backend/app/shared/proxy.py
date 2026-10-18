"""
TCP Proxy for forwarding incoming LAN traffic to localhost services (e.g. Next.js on 127.0.0.1:3000).
Runs seamlessly across Windows and WSL without requiring admin privileges.
"""

import asyncio
import subprocess
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="proxy")


def get_target_host() -> str:
    # Under WSL2, connect directly to WSL's eth0 IP so that Windows loopback doesn't intercept
    try:
        out = subprocess.check_output(
            ["wsl", "-e", "bash", "-c", "ip -4 addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1"],
            timeout=2,
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        if out:
            return out
    except Exception:
        pass
    return "127.0.0.1"


class TCPProxy:
    def __init__(self, listen_host: str = "0.0.0.0", listen_port: int = 3000, target_port: int = 3000):
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.target_port = target_port
        self.server: asyncio.Server | None = None

    async def _pipe(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        try:
            while not reader.at_eof():
                data = await reader.read(65536)
                if not data:
                    break
                writer.write(data)
                await writer.drain()
        except Exception:
            pass
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def _handle_client(self, client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter):
        peer = client_writer.get_extra_info("peername")
        # If the client is already connecting on loopback, let standard loopback route it
        try:
            target_reader, target_writer = await asyncio.open_connection(self.target_host, self.target_port)
            asyncio.create_task(self._pipe(client_reader, target_writer))
            asyncio.create_task(self._pipe(target_reader, client_writer))
        except Exception as e:
            logger.debug(f"Failed to forward connection from {peer} to {self.target_host}:{self.target_port}: {e}")
            try:
                client_writer.close()
                await client_writer.wait_closed()
            except Exception:
                pass

    async def start(self):
        self.target_host = get_target_host()
        try:
            # Bind to 0.0.0.0 on listen_port if not already occupied
            self.server = await asyncio.start_server(
                self._handle_client,
                self.listen_host,
                self.listen_port,
                reuse_address=True,
            )
            logger.info(f"TCP Proxy active: {self.listen_host}:{self.listen_port} -> {self.target_host}:{self.target_port}")
        except OSError as e:
            logger.info(f"Port {self.listen_port} already bound ({e}); proxy not needed or handled by host.")

    async def stop(self):
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None


frontend_proxy = TCPProxy(listen_host="0.0.0.0", listen_port=3000, target_port=3000)
