"use client";

import { useState } from "react";
import { sendOnvifSoap } from "@/lib/api";
import { Send, CheckCircle2, AlertTriangle, Copy, Terminal } from "lucide-react";

const SAMPLE_PAYLOADS = {
  GetDeviceInformation: {
    endpoint: "device_service" as const,
    action: "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>`,
  },
  GetProfiles: {
    endpoint: "media_service" as const,
    action: "http://www.onvif.org/ver10/media/wsdl/GetProfiles",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>`,
  },
  GetStreamUri: {
    endpoint: "media_service" as const,
    action: "http://www.onvif.org/ver10/media/wsdl/GetStreamUri",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetStreamUri>
      <trt:ProfileToken>Profile_Main</trt:ProfileToken>
    </trt:GetStreamUri>
  </soap:Body>
</soap:Envelope>`,
  },
  GetSnapshotUri: {
    endpoint: "media_service" as const,
    action: "http://www.onvif.org/ver10/media/wsdl/GetSnapshotUri",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetSnapshotUri>
      <trt:ProfileToken>Profile_Main</trt:ProfileToken>
    </trt:GetSnapshotUri>
  </soap:Body>
</soap:Envelope>`,
  },
  GetCapabilities: {
    endpoint: "device_service" as const,
    action: "http://www.onvif.org/ver10/device/wsdl/GetCapabilities",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetCapabilities/>
  </soap:Body>
</soap:Envelope>`,
  },
};

interface ProtocolInspectorProps {
  cameraId?: string;
  profileToken?: string;
}

export default function ProtocolInspector({ cameraId, profileToken }: ProtocolInspectorProps = {}) {
  const [selectedOp, setSelectedOp] = useState<keyof typeof SAMPLE_PAYLOADS>("GetDeviceInformation");
  const [customXml, setCustomXml] = useState(SAMPLE_PAYLOADS.GetDeviceInformation.xml);
  const [responseXml, setResponseXml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectOp = (op: keyof typeof SAMPLE_PAYLOADS) => {
    setSelectedOp(op);
    setCustomXml(SAMPLE_PAYLOADS[op].xml);
    setResponseXml(null);
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const { endpoint, action } = SAMPLE_PAYLOADS[selectedOp];
      const res = await sendOnvifSoap(endpoint, action, customXml);
      setResponseXml(res);
    } catch (err: any) {
      setResponseXml(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (responseXml) {
      navigator.clipboard.writeText(responseXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" /> ONVIF SOAP / XML Protocol Console
          </h3>
          <p className="text-sm text-muted-foreground">
            Execute real SOAP requests against genuine StreamLab ONVIF endpoints.
          </p>
        </div>

        {/* Operation Quick Selector */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(SAMPLE_PAYLOADS).map((key) => (
            <button
              key={key}
              onClick={() => handleSelectOp(key as keyof typeof SAMPLE_PAYLOADS)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedOp === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Pane */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>SOAP Request Payload ({SAMPLE_PAYLOADS[selectedOp].endpoint})</span>
          </div>
          <textarea
            value={customXml}
            onChange={(e) => setCustomXml(e.target.value)}
            rows={14}
            className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-all"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Executing Query..." : `Send ${selectedOp} Request`}
          </button>
        </div>

        {/* Response Pane */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Server XML Response</span>
            {responseXml && (
              <button onClick={handleCopy} className="flex items-center gap-1 hover:text-foreground">
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <div className="w-full h-[325px] overflow-auto bg-slate-950 font-mono text-xs text-emerald-400 p-4 rounded-lg border border-border">
            {responseXml ? (
              <pre className="whitespace-pre-wrap">{responseXml}</pre>
            ) : (
              <span className="text-muted-foreground italic">Execute a SOAP query to inspect real server response.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProtocolInspector };
