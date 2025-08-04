import { useState, useCallback } from 'react';
import axios from 'axios';

interface PlexServerConnection {
  uri: string;
  protocol: string;
  address: string;
  port: number;
  local: boolean;
  available?: boolean;
  latency?: number;
}

interface PlexServer {
  name: string;
  machineIdentifier: string;
  connections: PlexServerConnection[];
  version: string;
  platform: string;
  device: string;
  bestConnection?: PlexServerConnection;
}

interface UsePlexServersState {
  servers: PlexServer[];
  isLoading: boolean;
  error?: string;
}

export const usePlexServers = () => {
  const [state, setState] = useState<UsePlexServersState>({
    servers: [],
    isLoading: false
  });

  const getBestConnection = (connections: PlexServerConnection[]): PlexServerConnection | null => {
    // Filter available connections
    const availableConnections = connections.filter(c => c.available);
    if (availableConnections.length === 0) return null;
    
    // Sort by: local first, then by latency
    return availableConnections.sort((a, b) => {
      // Prioritize local connections
      if (a.local && !b.local) return -1;
      if (!a.local && b.local) return 1;
      
      // Then sort by latency (if available)
      const aLatency = a.latency || 999999;
      const bLatency = b.latency || 999999;
      return aLatency - bLatency;
    })[0];
  };

  const testConnection = async (connection: PlexServerConnection): Promise<void> => {
    try {
      const startTime = Date.now();
      const response = await axios.post('/api/plex/test-connection', {
        uri: connection.uri
      });
      
      connection.latency = Date.now() - startTime;
      connection.available = response.data.success;
    } catch {
      connection.available = false;
      connection.latency = undefined;
    }
  };

  const fetchServers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const response = await axios.get('/api/plex/oauth/servers');
      const servers: PlexServer[] = response.data.servers;
      
      // Test connections in parallel for each server
      await Promise.all(
        servers.map(async (server) => {
          await Promise.all(
            server.connections.map(conn => testConnection(conn))
          );
          
          // Set best connection for each server
          server.bestConnection = getBestConnection(server.connections);
        })
      );
      
      // Sort servers: ones with available connections first
      const sortedServers = servers.sort((a, b) => {
        const aHasConnection = !!a.bestConnection;
        const bHasConnection = !!b.bestConnection;
        
        if (aHasConnection && !bHasConnection) return -1;
        if (!aHasConnection && bHasConnection) return 1;
        return 0;
      });
      
      setState({
        servers: sortedServers,
        isLoading: false
      });
    } catch (error: any) {
      setState({
        servers: [],
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch servers'
      });
    }
  }, []);

  const refreshServers = () => {
    return fetchServers();
  };

  const selectServer = async (machineIdentifier: string) => {
    const server = state.servers.find(s => s.machineIdentifier === machineIdentifier);
    if (!server || !server.bestConnection) {
      throw new Error('Server not found or no available connection');
    }
    
    try {
      const response = await axios.post('/api/plex/select-server', {
        machineIdentifier,
        name: server.name,
        connection: {
          uri: server.bestConnection.uri,
          local: server.bestConnection.local
        }
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Failed to select server'
      );
    }
  };

  return {
    servers: state.servers,
    isLoading: state.isLoading,
    error: state.error,
    fetchServers,
    refreshServers,
    selectServer
  };
};
