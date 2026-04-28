import type { WebSocket } from "ws";

export type ResponseMessage = {
  type: "response";
  requestId: string;
  ok: boolean;
  message: string;
};

export type LocationsResponseMessage = {
  type: "locations_response";
  requestId: string;
  locations: string[];
};

// Singleton en memoria del proceso Node.js
export const connectionRegistry = new Map<string, WebSocket>();

// Map de Promises pendientes: requestId → { resolve, reject }
export const pendingRequests = new Map<
  string,
  {
    resolve: (msg: ResponseMessage | LocationsResponseMessage) => void;
    reject: (err: Error) => void;
  }
>();
