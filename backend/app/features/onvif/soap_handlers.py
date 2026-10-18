"""
ONVIF SOAP 1.2 / XML Dispatcher and Handlers.
Implements Device and Media service operations conforming to the ONVIF Core and Media specifications.
"""

import base64
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.models import CameraModel
from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="onvif")

# XML Namespaces
NS_SOAP_12 = "http://www.w3.org/2003/05/soap-envelope"
NS_SOAP_11 = "http://schemas.xmlsoap.org/soap/envelope/"
NS_TDS = "http://www.onvif.org/ver10/device/wsdl"
NS_TRT = "http://www.onvif.org/ver10/media/wsdl"
NS_TT = "http://www.onvif.org/ver10/schema"
NS_WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
NS_WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"


class OnvifSoapHandler:
    @staticmethod
    def _create_soap_response(body_content: str, is_soap_12: bool = False) -> str:
        ns_soap = NS_SOAP_12 if is_soap_12 else NS_SOAP_11
        return (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<soap:Envelope xmlns:soap="{ns_soap}" '
            f'xmlns:tds="{NS_TDS}" xmlns:trt="{NS_TRT}" xmlns:tt="{NS_TT}">'
            f'<soap:Body>{body_content}</soap:Body>'
            f'</soap:Envelope>'
        )

    @staticmethod
    def _create_soap_fault(fault_code: str, fault_string: str, is_soap_12: bool = False) -> str:
        ns_soap = NS_SOAP_12 if is_soap_12 else NS_SOAP_11
        if is_soap_12:
            body = (
                f'<soap:Fault>'
                f'<soap:Code><soap:Value>soap:{fault_code}</soap:Value></soap:Code>'
                f'<soap:Reason><soap:Text xml:lang="en">{fault_string}</soap:Text></soap:Reason>'
                f'</soap:Fault>'
            )
        else:
            body = (
                f'<soap:Fault>'
                f'<faultcode>soap:{fault_code}</faultcode>'
                f'<faultstring>{fault_string}</faultstring>'
                f'</soap:Fault>'
            )
        return (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<soap:Envelope xmlns:soap="{ns_soap}"><soap:Body>{body}</soap:Body></soap:Envelope>'
        )

    def verify_auth(self, root: ET.Element, cam: CameraModel) -> bool:
        if not cam.auth_enabled:
            return True

        header = root.find(".//{*}Header")
        if header is None:
            return False

        security = header.find(f".//{{{NS_WSSE}}}Security")
        if security is None:
            return False

        username_token = security.find(f".//{{{NS_WSSE}}}UsernameToken")
        if username_token is None:
            return False

        username_elem = username_token.find(f"{{{NS_WSSE}}}Username")
        password_elem = username_token.find(f"{{{NS_WSSE}}}Password")
        if username_elem is None or password_elem is None:
            return False

        user = username_elem.text
        if user != cam.username:
            return False

        pass_type = password_elem.get("Type", "")
        # PasswordDigest vs PasswordText
        if "PasswordDigest" in pass_type:
            nonce_elem = username_token.find(f"{{{NS_WSSE}}}Nonce")
            created_elem = username_token.find(f"{{{NS_WSU}}}Created")
            if nonce_elem is None or created_elem is None:
                return False
            raw_nonce = base64.b64decode(nonce_elem.text)
            created_str = created_elem.text.encode("utf-8")
            pass_str = cam.password.encode("utf-8")
            expected_digest = base64.b64encode(hashlib.sha1(raw_nonce + created_str + pass_str).digest()).decode("utf-8")
            return password_elem.text == expected_digest
        else:
            return password_elem.text == cam.password

    async def handle_request(
        self,
        xml_data: bytes,
        service_type: str,
        db: AsyncSession,
        camera_id: Optional[str] = None,
    ) -> Tuple[int, str]:
        try:
            root = ET.fromstring(xml_data)
        except Exception as e:
            return 400, self._create_soap_fault("Client", f"Invalid XML: {e}")

        is_soap_12 = NS_SOAP_12 in root.tag

        # Find camera
        cam = None
        if camera_id:
            res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
            cam = res.scalar_one_or_none()
        if not cam:
            # Fall back to first available camera or default
            res = await db.execute(select(CameraModel))
            cam = res.scalars().first()

        if not cam:
            cam = CameraModel(
                id="cam-001",
                name="StreamLab Default Camera",
                manufacturer="StreamLab",
                model="SL-CAM-1080P",
                serial_number="SL-SN-000001",
                firmware_version="v2.4.0",
                rtsp_path="cameras/cam-001/main",
                snapshot_path="api/v1/cameras/cam-001/snapshot.jpg",
            )

        # Authenticate if required
        if not self.verify_auth(root, cam):
            return 401, self._create_soap_fault("Sender", "FailedAuthentication", is_soap_12)

        # Extract operation from soap:Body
        body = root.find(".//{*}Body")
        if body is None or len(body) == 0:
            return 400, self._create_soap_fault("Client", "Missing SOAP Body", is_soap_12)

        op_elem = body[0]
        op_name = op_elem.tag.split("}")[-1]

        host = cam.hostname or settings.ADVERTISED_HOST

        # Route operations
        if op_name == "GetDeviceInformation":
            content = (
                f'<tds:GetDeviceInformationResponse>'
                f'<tds:Manufacturer>{cam.manufacturer}</tds:Manufacturer>'
                f'<tds:Model>{cam.model}</tds:Model>'
                f'<tds:FirmwareVersion>{cam.firmware_version}</tds:FirmwareVersion>'
                f'<tds:SerialNumber>{cam.serial_number}</tds:SerialNumber>'
                f'<tds:HardwareId>{cam.id}</tds:HardwareId>'
                f'</tds:GetDeviceInformationResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetSystemDateAndTime":
            now = datetime.now(timezone.utc)
            content = (
                f'<tds:GetSystemDateAndTimeResponse>'
                f'<tds:SystemDateAndTime>'
                f'<tt:DateTimeType>Manual</tt:DateTimeType>'
                f'<tt:DaylightSavings>false</tt:DaylightSavings>'
                f'<tt:TimeZone><tt:TZ>UTC</tt:TZ></tt:TimeZone>'
                f'<tt:UTCDateTime>'
                f'<tt:Time><tt:Hour>{now.hour}</tt:Hour><tt:Minute>{now.minute}</tt:Minute><tt:Second>{now.second}</tt:Second></tt:Time>'
                f'<tt:Date><tt:Year>{now.year}</tt:Year><tt:Month>{now.month}</tt:Month><tt:Day>{now.day}</tt:Day></tt:Date>'
                f'</tt:UTCDateTime>'
                f'</tds:SystemDateAndTime>'
                f'</tds:GetSystemDateAndTimeResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetCapabilities":
            content = (
                f'<tds:GetCapabilitiesResponse>'
                f'<tds:Capabilities>'
                f'<tt:Device>'
                f'<tt:XAddr>http://{host}:{settings.API_PORT}/onvif/device_service</tt:XAddr>'
                f'</tt:Device>'
                f'<tt:Media>'
                f'<tt:XAddr>http://{host}:{settings.API_PORT}/onvif/media_service</tt:XAddr>'
                f'<tt:StreamingCapabilities><tt:RTPMulticast>false</tt:RTPMulticast><tt:RTP_TCP>true</tt:RTP_TCP><tt:RTP_RTSP_TCP>true</tt:RTP_RTSP_TCP></tt:StreamingCapabilities>'
                f'</tt:Media>'
                f'</tds:Capabilities>'
                f'</tds:GetCapabilitiesResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetServices":
            content = (
                f'<tds:GetServicesResponse>'
                f'<tds:Service>'
                f'<tds:Namespace>{NS_TDS}</tds:Namespace>'
                f'<tds:XAddr>http://{host}:{settings.API_PORT}/onvif/device_service</tds:XAddr>'
                f'<tds:Version><tt:Major>2</tt:Major><tt:Minor>4</tt:Minor></tds:Version>'
                f'</tds:Service>'
                f'<tds:Service>'
                f'<tds:Namespace>{NS_TRT}</tds:Namespace>'
                f'<tds:XAddr>http://{host}:{settings.API_PORT}/onvif/media_service</tds:XAddr>'
                f'<tds:Version><tt:Major>2</tt:Major><tt:Minor>4</tt:Minor></tds:Version>'
                f'</tds:Service>'
                f'</tds:GetServicesResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetScopes":
            content = (
                f'<tds:GetScopesResponse>'
                f'<tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/type/video_encoder</tt:ScopeItem></tds:Scopes>'
                f'<tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/type/audio_encoder</tt:ScopeItem></tds:Scopes>'
                f'<tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/hardware/{cam.model}</tt:ScopeItem></tds:Scopes>'
                f'<tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/name/{cam.name}</tt:ScopeItem></tds:Scopes>'
                f'</tds:GetScopesResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetHostname":
            content = (
                f'<tds:GetHostnameResponse>'
                f'<tds:HostnameInformation>'
                f'<tt:FromDHCP>false</tt:FromDHCP>'
                f'<tt:Name>{host}</tt:Name>'
                f'</tds:HostnameInformation>'
                f'</tds:GetHostnameResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetProfiles":
            content = (
                f'<trt:GetProfilesResponse>'
                f'<trt:Profiles token="Profile_Main" fixed="true">'
                f'<tt:Name>MainStream</tt:Name>'
                f'<tt:VideoSourceConfiguration token="VSC_001">'
                f'<tt:Name>VideoSourceConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:SourceToken>VideoSourceToken</tt:SourceToken>'
                f'<tt:Bounds x="0" y="0" width="{cam.resolution_width}" height="{cam.resolution_height}"/>'
                f'</tt:VideoSourceConfiguration>'
                f'<tt:VideoEncoderConfiguration token="VEC_Main">'
                f'<tt:Name>MainEncoderConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:Encoding>H264</tt:Encoding>'
                f'<tt:Resolution><tt:Width>{cam.resolution_width}</tt:Width><tt:Height>{cam.resolution_height}</tt:Height></tt:Resolution>'
                f'<tt:Quality>5.0</tt:Quality>'
                f'<tt:RateControl><tt:FrameRateLimit>{cam.fps}</tt:FrameRateLimit><tt:BitrateLimit>{cam.bitrate_kbps}</tt:BitrateLimit></tt:RateControl>'
                f'</tt:VideoEncoderConfiguration>'
                f'</trt:Profiles>'
                f'<trt:Profiles token="PROFILE_MAIN_001" fixed="true">'
                f'<tt:Name>MainStream_001</tt:Name>'
                f'<tt:VideoSourceConfiguration token="VSC_001">'
                f'<tt:Name>VideoSourceConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:SourceToken>VideoSourceToken</tt:SourceToken>'
                f'<tt:Bounds x="0" y="0" width="{cam.resolution_width}" height="{cam.resolution_height}"/>'
                f'</tt:VideoSourceConfiguration>'
                f'<tt:VideoEncoderConfiguration token="VEC_Main">'
                f'<tt:Name>MainEncoderConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:Encoding>H264</tt:Encoding>'
                f'<tt:Resolution><tt:Width>{cam.resolution_width}</tt:Width><tt:Height>{cam.resolution_height}</tt:Height></tt:Resolution>'
                f'<tt:Quality>5.0</tt:Quality>'
                f'<tt:RateControl><tt:FrameRateLimit>{cam.fps}</tt:FrameRateLimit><tt:BitrateLimit>{cam.bitrate_kbps}</tt:BitrateLimit></tt:RateControl>'
                f'</tt:VideoEncoderConfiguration>'
                f'</trt:Profiles>'
                f'<trt:Profiles token="Profile_Sub" fixed="true">'
                f'<tt:Name>SubStream</tt:Name>'
                f'<tt:VideoSourceConfiguration token="VSC_002">'
                f'<tt:Name>VideoSourceConfigSub</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:SourceToken>VideoSourceToken</tt:SourceToken>'
                f'<tt:Bounds x="0" y="0" width="640" height="360"/>'
                f'</tt:VideoSourceConfiguration>'
                f'<tt:VideoEncoderConfiguration token="VEC_Sub">'
                f'<tt:Name>SubEncoderConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:Encoding>H264</tt:Encoding>'
                f'<tt:Resolution><tt:Width>640</tt:Width><tt:Height>360</tt:Height></tt:Resolution>'
                f'<tt:Quality>4.0</tt:Quality>'
                f'<tt:RateControl><tt:FrameRateLimit>{cam.fps}</tt:FrameRateLimit><tt:BitrateLimit>512</tt:BitrateLimit></tt:RateControl>'
                f'</tt:VideoEncoderConfiguration>'
                f'</trt:Profiles>'
                f'</trt:GetProfilesResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetStreamUri":
            auth_str = f"{cam.username}:{cam.password}@" if (cam.auth_enabled and cam.username and cam.password) else ""
            stream_uri = f"rtsp://{auth_str}{host}:{settings.RTSP_PORT}/{cam.rtsp_path}"
            content = (
                f'<trt:GetStreamUriResponse>'
                f'<trt:MediaUri>'
                f'<tt:Uri>{stream_uri}</tt:Uri>'
                f'<tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>'
                f'<tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>'
                f'<tt:Timeout>PT30S</tt:Timeout>'
                f'</trt:MediaUri>'
                f'</trt:GetStreamUriResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetSnapshotUri":
            snapshot_uri = f"http://{host}:{settings.API_PORT}/{cam.snapshot_path}"
            content = (
                f'<trt:GetSnapshotUriResponse>'
                f'<trt:MediaUri>'
                f'<tt:Uri>{snapshot_uri}</tt:Uri>'
                f'<tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>'
                f'<tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>'
                f'<tt:Timeout>PT10S</tt:Timeout>'
                f'</trt:MediaUri>'
                f'</trt:GetSnapshotUriResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetVideoEncoderConfigurations":
            content = (
                f'<trt:GetVideoEncoderConfigurationsResponse>'
                f'<trt:Configurations token="VEC_Main">'
                f'<tt:Name>MainEncoderConfig</tt:Name>'
                f'<tt:UseCount>1</tt:UseCount>'
                f'<tt:Encoding>H264</tt:Encoding>'
                f'<tt:Resolution><tt:Width>{cam.resolution_width}</tt:Width><tt:Height>{cam.resolution_height}</tt:Height></tt:Resolution>'
                f'<tt:Quality>5.0</tt:Quality>'
                f'<tt:RateControl><tt:FrameRateLimit>{cam.fps}</tt:FrameRateLimit><tt:BitrateLimit>{cam.bitrate_kbps}</tt:BitrateLimit></tt:RateControl>'
                f'</trt:Configurations>'
                f'</trt:GetVideoEncoderConfigurationsResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        elif op_name == "GetVideoSources":
            content = (
                f'<trt:GetVideoSourcesResponse>'
                f'<trt:VideoSources token="VideoSourceToken">'
                f'<tt:Framerate>{cam.fps}</tt:Framerate>'
                f'<tt:Resolution><tt:Width>{cam.resolution_width}</tt:Width><tt:Height>{cam.resolution_height}</tt:Height></tt:Resolution>'
                f'</trt:VideoSources>'
                f'</trt:GetVideoSourcesResponse>'
            )
            return 200, self._create_soap_response(content, is_soap_12)

        return 501, self._create_soap_fault("Receiver", f"Action '{op_name}' not implemented in StreamLab", is_soap_12)


onvif_soap_handler = OnvifSoapHandler()
