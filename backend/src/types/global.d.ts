// backend/src/types/global.d.ts
import { WebSocketService } from '../services/WebSocketService';

declare global {
  var webSocketService: WebSocketService;
}

export {};