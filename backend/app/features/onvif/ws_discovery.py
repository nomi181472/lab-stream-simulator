"""
WS-Discovery Responder.
Implements OASIS WS-Discovery UDP multicast (239.255.255.250:3702) and unicast ProbeMatches responder.
"""

import asyncio
import socket
import struct
import uuid
import xml.etree.ElementTree as ET
from typing import Optional

from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="ws_discovery")


class WSDiscoveryProtocol(asyncio.DatagramProtocol):
    def __init__(self, device_uuid: str):
        self.device_uuid = device_uuid
        self.transport: Optional[asyncio.DatagramTransport] = None

    def connection_made(self, transport: asyncio.DatagramTransport):  # type: ignore
        self.transport = transport
        logger.info(f"WS-Discovery service listening on UDP port {settings.WS_DISCOVERY_PORT}")

    def datagram_received(self, data: bytes, addr: tuple):
        try:
            xml_str = data.decode(errors="replace")
            if "Probe" in xml_str and "ProbeMatches" not in xml_str:
                self.handle_probe(xml_str, addr)
        except Exception as e:
            logger.debug(f"WS-Discovery datagram parsing error: {e}")

    def handle_probe(self, xml_str: str, addr: tuple):
        try:
            root = ET.fromstring(xml_str)
        except Exception:
            return

        # Extract MessageID for RelatesTo
        msg_id_elem = root.find(".//{*}MessageID")
        relates_to = msg_id_elem.text if msg_id_elem is not None else f"urn:uuid:{uuid.uuid4()}"

        host = settings.ADVERTISED_HOST
        xaddr = f"http://{host}:{settings.API_PORT}/onvif/device_service"

        scopes = (
            "onvif://www.onvif.org/type/video_encoder "
            "onvif://www.onvif.org/type/audio_encoder "
            "onvif://www.onvif.org/hardware/StreamLab-Virtual "
            "onvif://www.onvif.org/name/StreamLab-Camera "
            "onvif://www.onvif.org/location/Laboratory"
        )

        probe_matches_xml = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" '
            f'xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" '
            f'xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
            f'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
            f'<soap:Header>'
            f'<wsa:MessageID>urn:uuid:{uuid.uuid4()}</wsa:MessageID>'
            f'<wsa:RelatesTo>{relates_to}</wsa:RelatesTo>'
            f'<wsa:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:To>'
            f'<wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/ProbeMatches</wsa:Action>'
            f'</soap:Header>'
            f'<soap:Body>'
            f'<wsd:ProbeMatches>'
            f'<wsd:ProbeMatch>'
            f'<wsa:EndpointReference><wsa:Address>urn:uuid:{self.device_uuid}</wsa:Address></wsa:EndpointReference>'
            f'<wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>'
            f'<wsd:Scopes>{scopes}</wsd:Scopes>'
            f'<wsd:XAddrs>{xaddr}</wsd:XAddrs>'
            f'<wsd:MetadataVersion>1</wsd:MetadataVersion>'
            f'</wsd:ProbeMatch>'
            f'</wsd:ProbeMatches>'
            f'</soap:Body>'
            f'</soap:Envelope>'
        )

        resp_bytes = probe_matches_xml.encode("utf-8")
        if self.transport:
            self.transport.sendto(resp_bytes, addr)
            logger.info(f"Sent WS-Discovery ProbeMatches to {addr[0]}:{addr[1]}")


class WSDiscoveryServer:
    def __init__(self):
        self.device_uuid = str(uuid.uuid4())
        self.transport = None
        self.protocol = None

    async def start(self):
        if not settings.WS_DISCOVERY_ENABLED:
            return

        loop = asyncio.get_running_loop()

        # Create dual-bound UDP socket for multicast discovery
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        try:
            # Join multicast group
            mreq = struct.pack("4sl", socket.inet_aton(settings.WS_DISCOVERY_MULTICAST_GROUP), socket.INADDR_ANY)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        except Exception as e:
            logger.warning(f"Could not join multicast group {settings.WS_DISCOVERY_MULTICAST_GROUP}: {e}")

        try:
            sock.bind(("", settings.WS_DISCOVERY_PORT))
            sock.setblocking(False)

            self.transport, self.protocol = await loop.create_datagram_endpoint(
                lambda: WSDiscoveryProtocol(self.device_uuid),
                sock=sock,
            )
            logger.info("WS-Discovery server started successfully.")
        except Exception as e:
            logger.warning(f"Could not start WS-Discovery UDP listener on port {settings.WS_DISCOVERY_PORT}: {e}")

    async def stop(self):
        if self.transport:
            self.transport.close()
            logger.info("WS-Discovery server stopped.")


ws_discovery_server = WSDiscoveryServer()
