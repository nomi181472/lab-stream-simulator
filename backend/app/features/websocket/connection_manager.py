"""
WebSocket Connection Manager.
Manages active WebSocket connections with bounded queues, backpressure handling, and versioned JSON broadcasts.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Set
from fastapi import WebSocket

from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="websocket")


class WebSocketConnectionManager:
    def __init__(self, queue_maxsize: int = 256):
        self.active_connections: Set[WebSocket] = set()
        self.client_queues: Dict[WebSocket, asyncio.Queue] = {}
        self.client_tasks: Dict[WebSocket, asyncio.Task] = {}
        self.queue_maxsize = queue_maxsize

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        queue: asyncio.Queue = asyncio.Queue(maxsize=self.queue_maxsize)
        self.active_connections.add(websocket)
        self.client_queues[websocket] = queue
        self.client_tasks[websocket] = asyncio.create_task(self._sender_loop(websocket, queue))
        logger.info(f"WebSocket client connected. Active clients: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        queue = self.client_queues.pop(websocket, None)
        task = self.client_tasks.pop(websocket, None)
        if task and not task.done():
            task.cancel()
        logger.info(f"WebSocket client disconnected. Active clients: {len(self.active_connections)}")

    async def _sender_loop(self, websocket: WebSocket, queue: asyncio.Queue) -> None:
        """Dedicated sender loop per client. If queue is full, drops old messages (backpressure protection)."""
        try:
            while True:
                msg = await queue.get()
                await websocket.send_text(msg)
                queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug(f"Client sender loop terminated: {e}")
            await self.disconnect(websocket)

    async def broadcast_event(self, event_type: str, camera_id: str, payload: Dict[str, Any]) -> None:
        """Broadcast versioned JSON message to all subscribed clients."""
        envelope = {
            "type": event_type,
            "version": 1,
            "camera_id": camera_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **payload,
        }
        raw = json.dumps(envelope)

        disconnected = []
        for ws, queue in list(self.client_queues.items()):
            try:
                if queue.full():
                    # Backpressure handling: drop oldest message to prevent slow clients from blocking
                    try:
                        _ = queue.get_nowait()
                        queue.task_done()
                    except asyncio.QueueEmpty:
                        pass
                queue.put_nowait(raw)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            await self.disconnect(ws)


ws_manager = WebSocketConnectionManager()
