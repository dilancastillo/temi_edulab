import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import {
  connectionRegistry,
  pendingRequests,
  type ResponseMessage,
  type LocationsResponseMessage,
} from "./ws-registry.js";

type RegisterMessage = { type: "register"; robotId: string };

type IncomingMessage_ =
  | RegisterMessage
  | ResponseMessage
  | LocationsResponseMessage;

export function handleWsConnection(ws: WebSocket, _req: IncomingMessage): void {
  let robotId: string | null = null;

  ws.once("message", (data) => {
    let msg: IncomingMessage_;
    try {
      msg = JSON.parse(data.toString()) as IncomingMessage_;
    } catch {
      ws.close(4001, "Invalid JSON");
      return;
    }

    if (msg.type !== "register" || !msg.robotId || msg.robotId.trim() === "") {
      ws.close(4001, "Missing or empty robotId");
      return;
    }

    robotId = msg.robotId;

    // If already registered, close the previous connection
    const existing = connectionRegistry.get(robotId);
    if (existing && existing !== ws) {
      existing.close(1000, "Replaced by new connection");
    }

    connectionRegistry.set(robotId, ws);

    // Handle subsequent messages
    ws.on("message", (rawData) => {
      let incoming: IncomingMessage_;
      try {
        incoming = JSON.parse(rawData.toString()) as IncomingMessage_;
      } catch {
        return;
      }

      if (
        incoming.type === "response" ||
        incoming.type === "locations_response"
      ) {
        const pending = pendingRequests.get(incoming.requestId);
        if (pending) {
          pendingRequests.delete(incoming.requestId);
          pending.resolve(incoming);
        }
      }
    });

    ws.on("close", () => {
      if (robotId && connectionRegistry.get(robotId) === ws) {
        connectionRegistry.delete(robotId);
      }
    });
  });
}
