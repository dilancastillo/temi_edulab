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

declare global {
  var __connectionRegistry: Map<string, WebSocket> | undefined;
  var __pendingRequests: Map<string, {
    resolve: (msg: ResponseMessage | LocationsResponseMessage) => void;
    reject: (err: Error) => void;
  }> | undefined;
}

global.__connectionRegistry ??= new Map<string, WebSocket>();
global.__pendingRequests ??= new Map();

export const connectionRegistry = global.__connectionRegistry;
export const pendingRequests = global.__pendingRequests;
