
import React from 'react';

interface ConnectionStatusProps {
  proxyConnected: boolean | null;
}

export function ConnectionStatus({ proxyConnected }: ConnectionStatusProps) {
  return (
    <div className="p-3 border-t flex items-center space-x-2">
      <span className={`h-2 w-2 rounded-full ${
        proxyConnected === true ? 'bg-green-500' : 
        proxyConnected === false ? 'bg-red-500' : 
        'bg-yellow-500 animate-pulse'
      }`}></span>
      <span className="text-sm text-muted-foreground">
        PDF Proxy Service: {
          proxyConnected === true ? 'Available' : 
          proxyConnected === false ? 'Unavailable' : 
          'Checking...'
        }
        {proxyConnected === true && ' (used for server-side extraction)'}
      </span>
    </div>
  );
}
