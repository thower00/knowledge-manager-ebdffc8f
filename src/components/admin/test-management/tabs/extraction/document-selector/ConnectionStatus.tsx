
interface ConnectionStatusProps {
  proxyConnected: boolean | null;
}

export function ConnectionStatus({ proxyConnected }: ConnectionStatusProps) {
  return (
    <div className="px-4 py-2 border-t">
      <div className="flex items-center space-x-2">
        <span className={`h-2 w-2 rounded-full ${
          proxyConnected === true ? 'bg-green-500' : 
          proxyConnected === false ? 'bg-red-500' : 
          'bg-yellow-500 animate-pulse'
        }`}></span>
        <span className="text-sm text-muted-foreground">
          Proxy Service: {
            proxyConnected === true ? 'Available' : 
            proxyConnected === false ? 'Unavailable' : 
            'Checking...'
          }
        </span>
      </div>
    </div>
  );
}
