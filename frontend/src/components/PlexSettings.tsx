import { useEffect, useState } from "react";
import React from "react";
import { usePlexOAuth } from "@/hooks/usePlexOAuth";
import { usePlexServers } from "@/hooks/usePlexServers";

// You can replace these with your UI library components
interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary";
  loading?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled,
  variant = "primary",
  loading,
  children,
  style,
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`btn btn-${variant}`}
    style={style}
  >
    {loading ? "Loading..." : children}
  </button>
);

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, children, onClose }) => (
  <div className={`alert alert-${type}`}>
    {children}
    {onClose && (
      <button onClick={onClose} className="close">
        &times;
      </button>
    )}
  </div>
);

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
      // Authentication successful
      // Fetch servers after successful auth
      fetchServers();
    },
    onAuthError: () => {
      // Authentication failed
    },
  });

  const {
    servers,
    isLoading: serversLoading,
    error: serversError,
    fetchServers,
    selectServer,
  } = usePlexServers();

  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [isSelectingServer, setIsSelectingServer] = useState(false);

  // Fetch servers when authenticated
  useEffect(() => {
    if (isAuthenticated && servers.length === 0) {
      fetchServers();
    }
  }, [isAuthenticated, servers.length, fetchServers]);

  const handleServerSelect = async () => {
    if (!selectedServerId) return;

    setIsSelectingServer(true);
    try {
      await selectServer(selectedServerId);
      // Show success message or update UI
      alert("Server selected successfully!");
    } catch (error) {
      alert(
        `Failed to select server: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSelectingServer(false);
    }
  };

  const renderAuthSection = () => {
    if (authLoading && !isPolling) {
      return <div>Loading...</div>;
    }

    if (isPolling && pinData) {
      return (
        <div className="auth-polling">
          <h4>Complete Authentication</h4>
          <p>
            PIN Code: <strong>{pinData.code}</strong>
          </p>
          <p>Complete the authentication in the opened window.</p>
          <Button onClick={cancelAuth} variant="secondary">
            Cancel
          </Button>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="auth-section">
          <h4>Connect to Plex</h4>
          <p>Connect your Plex account to enable integration with Bazarr.</p>
          {authError && (
            <Alert type="error">
              {authError}
              {errorCode && <small> (Code: {errorCode})</small>}
            </Alert>
          )}
          <Button onClick={() => startAuth()} variant="primary">
            Connect to Plex
          </Button>
        </div>
      );
    }

    return (
      <div className="auth-info">
        <Alert type="success">
          Connected as <strong>{username}</strong> ({email})
        </Alert>
        <Button onClick={logout} variant="danger">
          Disconnect from Plex
        </Button>
      </div>
    );
  };

  const renderServerSection = () => {
    if (!isAuthenticated) return null;

    return (
      <div className="server-section" style={{ marginTop: "20px" }}>
        <h4>Plex Servers</h4>

        {serversError && (
          <Alert type="error">Failed to load servers: {serversError}</Alert>
        )}

        {serversLoading ? (
          <div>Loading servers...</div>
        ) : servers.length === 0 ? (
          <div>
            <p>No servers found.</p>
            <Button onClick={fetchServers} variant="secondary">
              Refresh
            </Button>
          </div>
        ) : (
          <div>
            <div className="server-select">
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                disabled={isSelectingServer}
                style={{ marginRight: "10px" }}
              >
                <option value="">Select a server...</option>
                {servers.map((server) => (
                  <option
                    key={server.machineIdentifier}
                    value={server.machineIdentifier}
                    disabled={!server.bestConnection}
                  >
                    {server.name} ({server.platform} - v{server.version})
                    {!server.bestConnection && " (Unavailable)"}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleServerSelect}
                disabled={!selectedServerId || isSelectingServer}
                loading={isSelectingServer}
                variant="primary"
              >
                Select Server
              </Button>
              <Button
                onClick={fetchServers}
                variant="secondary"
                style={{ marginLeft: "10px" }}
              >
                Refresh
              </Button>
            </div>

            {selectedServerId && (
              <div className="server-details" style={{ marginTop: "10px" }}>
                {servers
                  .filter((s) => s.machineIdentifier === selectedServerId)
                  .map((server) => (
                    <div key={server.machineIdentifier}>
                      <h5>Connections:</h5>
                      <ul>
                        {server.connections.map((conn, idx) => (
                          <li key={idx}>
                            {conn.protocol}://{conn.address}:{conn.port}
                            {conn.local && " (Local)"}
                            {conn.available ? " ✓" : " ✗"}
                            {conn.latency && ` - ${conn.latency}ms`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="plex-settings">
      <h3>Plex Integration</h3>
      {renderAuthSection()}
      {renderServerSection()}
    </div>
  );
};

export default PlexSettings;
