import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/apis/queries/keys";
import { usePlexOAuth } from "@/hooks/usePlexOAuth";
import { usePlexServers } from "@/hooks/usePlexServers";
import { useFormValues } from "@/pages/Settings/utilities/FormValues";

export const PlexSettings: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Access form context to reset staged changes after OAuth
  let form: ReturnType<typeof useFormValues> | null = null;
  try {
    form = useFormValues();
  } catch {
    // Form context not available (PlexSettings used outside settings page)
    form = null;
  }
  
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
      // Invalidate all settings and system queries to ensure UI reflects OAuth changes
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.System],
      });
      
      // Reset form to clear any staged changes since OAuth changes are already saved
      if (form) {
        setTimeout(() => {
          form.reset();
        }, 100);
      }
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

  const [localSelectedServerId, setLocalSelectedServerId] =
    useState<string>("");
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
      const server = servers.find(
        (s) => s.machineIdentifier === localSelectedServerId,
      );
      if (server && server.bestConnection) {
        await selectServer(localSelectedServerId);
        setSelectedServer(server);
        setServerSaved(true);
      }
    } catch (error) {
      // Failed to select server - error handled in UI
    } finally {
      setIsSelectingServer(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    // Invalidate all system queries to refresh all settings after logout
    queryClient.invalidateQueries({
      queryKey: [QueryKeys.System],
    });
    
    // Reset form to clear any staged changes since logout changes are already saved
    if (form) {
      setTimeout(() => {
        form.reset();
      }, 100);
    }
  };

  const renderAuthSection = () => {
    if (authLoading && !isPolling) {
      return <Text>Loading...</Text>;
    }

    if (isPolling && pinData) {
      return (
        <Paper withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={4}>Plex OAuth (recommended)</Title>
            <Stack gap="sm">
              <Text size="lg" fw={600}>
                Complete Authentication
              </Text>
              <Text>
                PIN Code:{" "}
                <Text component="span" fw={700}>
                  {pinData.code}
                </Text>
              </Text>
              <Text size="sm">
                Complete the authentication in the opened window.
              </Text>
              <Button
                onClick={cancelAuth}
                variant="light"
                color="gray"
                size="sm"
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Paper>
      );
    }

    if (!isAuthenticated) {
      return (
        <Paper withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={4}>Plex OAuth (recommended)</Title>
            <Stack gap="sm">
              <Text size="sm">
                Connect your Plex account to enable secure, automated
                integration with Bazarr.
              </Text>
              {authError && (
                <Alert color="red" variant="light">
                  {authError}
                  {errorCode && <Text size="xs"> (Code: {errorCode})</Text>}
                </Alert>
              )}
              <Button
                onClick={() => startAuth()}
                variant="filled"
                color="brand"
                size="md"
                style={{ alignSelf: "flex-start" }}
              >
                Connect to Plex
              </Button>
            </Stack>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Plex OAuth (recommended)</Title>
          <Alert color="brand" variant="light">
            Connected as {username} ({email})
          </Alert>
          <Button
            onClick={handleLogout}
            variant="light"
            color="gray"
            size="sm"
            style={{ alignSelf: "flex-start" }}
          >
            Disconnect from Plex
          </Button>
        </Stack>
      </Paper>
    );
  };

  const renderServerSection = () => {
    if (!isAuthenticated) return null;

    return (
      <Paper withBorder radius="md" p="lg" style={{ marginTop: "20px" }}>
        <Stack gap="lg">
          <Title order={4}>Plex Servers</Title>

          {serversError && (
            <Alert color="red" variant="light">
              Failed to load servers: {serversError}
            </Alert>
          )}

          {serversLoading ? (
            <Stack gap="sm">
              <Text>Loading servers...</Text>
            </Stack>
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
                  data={servers.map((server) => ({
                    value: server.machineIdentifier,
                    label: `${server.name} (${server.platform} - v${server.version})${!server.bestConnection ? " (Unavailable)" : ""}`,
                    disabled: !server.bestConnection,
                  }))}
                  value={localSelectedServerId}
                  onChange={(value: string | null) =>
                    setLocalSelectedServerId(value || "")
                  }
                  style={{ flex: 1 }}
                  searchable
                />
                <Button
                  variant="filled"
                  color="brand"
                  disabled={!localSelectedServerId || isSelectingServer}
                  loading={isSelectingServer}
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
                  ↻
                </ActionIcon>
              </Group>

              {serverSaved && selectedServer && (
                <Alert color="brand" variant="light">
                  Server saved: "{selectedServer.name}" (v
                  {servers.find(
                    (s) =>
                      s.machineIdentifier === selectedServer.machineIdentifier,
                  )?.version ||
                    selectedServer.version ||
                    "Unknown"}
                  )
                </Alert>
              )}

              {localSelectedServerId && (
                <Card withBorder p="md" radius="md">
                  <Text size="sm" fw={600} mb="xs">
                    Available Connections:
                  </Text>
                  <Stack gap="xs">
                    {servers
                      .filter(
                        (s) => s.machineIdentifier === localSelectedServerId,
                      )
                      .map((server) =>
                        server.connections.map((conn, idx: number) => (
                          <Group gap="xs" key={idx}>
                            <Text
                              size="sm"
                              c={conn.available ? "brand" : "red"}
                            >
                              {conn.available ? "✓" : "✗"}
                            </Text>
                            <Text size="sm">
                              {conn.uri}
                              {conn.local && " (Local)"}
                              {conn.latency && ` - ${conn.latency}ms`}
                            </Text>
                          </Group>
                        )),
                      )}
                  </Stack>
                </Card>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Stack gap="lg">
      {renderAuthSection()}
      {renderServerSection()}
    </Stack>
  );
};

export default PlexSettings;
