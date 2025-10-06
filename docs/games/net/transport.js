// Stub transport for future online mode
export function connectOnline(){ console.warn('Online mode coming soon'); return { connected:false }; }
export function sendMessage(msg){ console.warn('sendMessage stub', msg); }
export function onMessage(handler){ console.warn('onMessage stub'); return () => {}; }
export function disconnect(){ console.warn('disconnect stub'); }


