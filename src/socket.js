import { io } from 'socket.io-client';

// Use same host in browser or fallback to port 5000 in dev
const socketUrl = window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;

export const socket = io(socketUrl, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
