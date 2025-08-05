import { useEffect, useState } from "react";
import React from "react";
import { usePlexOAuth } from "@/hooks/usePlexOAuth";
import { usePlexServers } from "@/hooks/usePlexServers";
import {
  Stack,
  Text,
  Button,
  Group,
  Select,
  Alert,
  Card,
  ActionIcon,
} from "@mantine/core";
import {
  IconCheck,
  IconBrandPlex,
  IconServer,
  IconRefresh,
} from "@tabler/icons-react";

export const PlexSettings: React.FC = () => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    username,
    email,
    error: authError,
    errorCode,
    pinData,
    startAuth,
    logout,
    cancelAuth,
    isPolling,
  } = usePlexOAuth({
    onAuthSuccess: () => {
      fetchServers();
    },
    onAuthError: () => {
      // Authentication failed
    },
  });

  const {
    servers,
    selectedServer,
    isLoading: serversLoading,
    error: serversError,
    fetchServers,
    selectServer,
    getSelectedServer,
    setSelectedServer,
  } = usePlexServers();

  const [localSelectedServerId, setLocalSelectedServerId] = useState<string>("");
  const [isSelectingServer, setIsSelectingServer] = useState(false);
  const [serverSaved, setServerSaved] = useState(false);

  // Fetch servers when authenticated
  useEffect(() => {
    if (isAuthenticated && servers.length === 0) {
      fetchServers();
    }
  }, [isAuthenticated, servers.length, fetchServers]);

  // Load selected server on mount
  useEffect(() => {
    const loadSelectedServer = async () => {
      const saved = await getSelectedServer();
      if (saved) {
        setSelectedServer(saved);
        setLocalSelectedServerId(saved.machineIdentifier);
        setServerSaved(true);
      }
    };
    if (isAuthenticated) {
      loadSelectedServer();
    }
  }, [isAuthenticated, getSelectedServer, setSelectedServer]);

  const handleServerSelect = async () => {
    if (!localSelectedServerId) return;

    setIsSelectingServer(true);
    try {
      const server = servers.find((s: any) => s.machineIdentifier === localSelectedServerId);
      if (server && server.bestConnection) {
        await selectServer(localSelectedServerId);
        setSelectedServer(server);
        setServerSaved(true);
      }
    } catch (error) {
      console.error('Failed to select server:', error);
    } finally {
      setIsSelectingServer(false);
    }
  };

  const renderAuthSection = () => {
    if (authLoading && !isPolling) {
      return <Text>Loading...</Text>;
    }

    if (isPolling && pinData) {
      return (
        <Stack gap="md">
          <Group gap="sm">
            <IconBrandPlex size={28} />
            <Text size="xl" fw={700}>
              Plex OAuth (Automated setup)
            </Text>
          </Group>
          <Stack gap="sm">
            <Text size="lg" fw={600}>Complete Authentication</Text>
            <Text>
              PIN Code: <Text component="span" fw={700}>{pinData.code}</Text>
            </Text>
            <Text size="sm" style={{ opacity: 0.9 }}>
              Complete the authentication in the opened window.
            </Text>
            <Button onClick={cancelAuth} variant="white" color="dark" size="sm">
              Cancel
            </Button>
          </Stack>
        </Stack>
      );
    }

    if (!isAuthenticated) {
      return (
        <Stack gap="md">
          <Group gap="sm">
            <IconBrandPlex size={28} />
            <Text size="xl" fw={700}>
              Plex OAuth (Automated setup)
            </Text>
          </Group>
          <Stack gap="sm">
            <Text size="sm" style={{ opacity: 0.9 }}>
              Connect your Plex account to enable secure, automated integration with Bazarr.
            </Text>
            {authError && (
              <Alert color="red" variant="light">
                {authError}
                {errorCode && <Text size="xs"> (Code: {errorCode})</Text>}
              </Alert>
            )}
            <Button
              onClick={() => startAuth()}
              variant="white"
              color="dark"
              size="md"
              leftSection={<IconBrandPlex size={18} />}
              style={{ alignSelf: "flex-start" }}
            >
              Connect to Plex
            </Button>
          </Stack>
        </Stack>
      );
    }

    return (
      <Stack gap="md">
        <Group gap="sm">
          <IconBrandPlex size={28} />
          <Text size="xl" fw={700}>
            Plex OAuth (Automated setup)
          </Text>
        </Group>
        <Alert
          icon={<IconCheck size={16} />}
          color="teal"
          variant="light"
          style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "#2f9e44" }}
        >
          <Text fw={500}>
            Connected as <Text component="span" fw={700}>{username}</Text> ({email})
          </Text>
        </Alert>
        <Button
          onClick={logout}
          variant="white"
          color="dark"
          size="sm"
          style={{ alignSelf: "flex-start" }}
        >
          Disconnect from Plex
        </Button>
      </Stack>
    );
  };

  const renderServerSection = () => {
    if (!isAuthenticated) return null;

    return (
      <Card p="xl" radius="md" withBorder style={{ marginTop: "20px" }}>
        <Stack gap="lg">
          <Group gap="sm">
            <IconServer size={24} color="#667eea" />
            <Text size="xl" fw={600} c="dark.8">
              Plex Servers
            </Text>
          </Group>

          {serversError && (
            <Alert color="red" variant="light">
              Failed to load servers: {serversError}
            </Alert>
          )}

          {serversLoading ? (
            <Text>Loading servers...</Text>
          ) : servers.length === 0 ? (
            <Stack gap="sm">
              <Text>No servers found.</Text>
              <Button onClick={fetchServers} variant="light" color="gray">
                Refresh
              </Button>
            </Stack>
          ) : (
            <Stack gap="md">
              <Group gap="md" align="end">
                <Select
                  label="Select your Plex server"
                  placeholder="Choose a server..."
                  data={servers.map((server: any) => ({
                    value: server.machineIdentifier,
                    label: `${server.name} (${server.platform} - v${server.version})${!server.bestConnection ? ' (Unavailable)' : ''}`,
                    disabled: !server.bestConnection
                  }))}
                  value={localSelectedServerId}
                  onChange={(value: any) => setLocalSelectedServerId(value || "")}
                  style={{ flex: 1 }}
                  searchable
                />
                <Button
                  variant="filled"
                  color="blue"
                  disabled={!localSelectedServerId || isSelectingServer}
                  loading={isSelectingServer}
                  leftSection={<IconCheck size={16} />}
                  onClick={handleServerSelect}
                >
                  Select Server
                </Button>
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  onClick={fetchServers}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Group>

              {serverSaved && selectedServer && (
                <Alert
                  icon={<IconCheck size={16} />}
                  color="green"
                  variant="light"
                  style={{ backgroundColor: "#f3f9f3" }}
                >
                  <Group gap="xs">
                    <Text fw={500}>Server saved:</Text>
                    <Text>"{selectedServer.name}" ({selectedServer.bestConnection?.uri})</Text>
                  </Group>
                </Alert>
              )}

              {localSelectedServerId && (
                <Card p="md" radius="md" style={{ backgroundColor: "#f8f9fa" }}>
                  <Text size="sm" fw={600} mb="xs" c="dark.7">
                    Available Connections:
                  </Text>
                  <Stack gap="xs">
                    {servers
                      .filter((s: any) => s.machineIdentifier === localSelectedServerId)
                      .map((server: any) => 
                        server.connections.map((conn: any, idx: number) => (
                          <Group gap="xs" key={idx}>
                            <IconCheck size={14} color={conn.available ? "#51cf66" : "#fa5252"} />
                            <Text size="sm">
                              {conn.uri}
                              {conn.local && " (Local)"}
                              {conn.available ? " ✓" : " ✗"}
                              {conn.latency && ` - ${conn.latency}ms`}
                            </Text>
                          </Group>
                        ))
                      )}
                  </Stack>
                </Card>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    );
  };

  return (
    <div>
      {renderAuthSection()}
      {renderServerSection()}
    </div>
  );
};

export default PlexSettings;
