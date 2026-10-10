import { io } from 'socket.io-client';
import { API_URL } from './client';

// A single shared socket instance for the whole app — components
// subscribe/unsubscribe to events rather than each opening their own
// connection.
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, { autoConnect: true, reconnection: true });
    socket.on('connect', () => {
      const token = localStorage.getItem('airguard_token');
      if (token) {
        socket.emit('authenticate', token);
      }
    });
  }
  return socket;
}
