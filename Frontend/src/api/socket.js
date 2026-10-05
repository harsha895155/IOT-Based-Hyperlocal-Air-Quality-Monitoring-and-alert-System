import { io } from 'socket.io-client';
import { API_URL } from './client';

// A single shared socket instance for the whole app — components
// subscribe/unsubscribe to events rather than each opening their own
// connection.
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, { autoConnect: true, reconnection: true });
  }
  return socket;
}
