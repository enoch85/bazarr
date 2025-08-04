import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

interface PlexAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  username?: string;
  email?: string;
  error?: string;
  errorCode?: string;
}

interface PinResponse {
  pinId: string;
  code: string;
  clientId: string;
  authUrl: string;
}

interface UsePlexOAuthOptions {
  onAuthSuccess?: (data: any) => void;
  onAuthError?: (error: any) => void;
  pollingInterval?: number;
  maxPollingAttempts?: number;
}

export const usePlexOAuth = (options: UsePlexOAuthOptions = {}) => {
  const {
    onAuthSuccess,
    onAuthError,
    pollingInterval = 2000,
    maxPollingAttempts = 150 // 5 minutes with 2-second intervals
  } = options;

  const [authState, setAuthState] = useState<PlexAuthState>({
    isAuthenticated: false,
    isLoading: false
  });
  
  const [pinData, setPinData] = useState<PinResponse | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptRef = useRef(0);
  const authWindowRef = useRef<Window | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (authWindowRef.current && !authWindowRef.current.closed) {
      authWindowRef.current.close();
    }
    pollingAttemptRef.current = 0;
  }, []);

  // Validate token on mount
  useEffect(() => {
    validateToken();
    return cleanup;
  }, [cleanup]);

  const validateToken = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const response = await axios.get('/api/plex/oauth/validate');
      
      if (response.data.valid) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          username: response.data.username,
          email: response.data.email
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: response.data.error,
          errorCode: response.data.code
        });
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  const handleAuthError = (error: any) => {
    const errorData = error.response?.data;
    const authError = {
      error: errorData?.error || error.message || 'Authentication failed',
      errorCode: errorData?.code || 'UNKNOWN_ERROR'
    };
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      ...authError
    });
    
    onAuthError?.(authError);
    cleanup();
  };

  const startAuth = async (clientId?: string) => {
    try {
      cleanup();
      setAuthState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const response = await axios.post('/api/plex/oauth/pin', { clientId });
      const pinResponse: PinResponse = response.data;
      
      setPinData(pinResponse);
      
      // Open auth window
      const authWindow = window.open(
        pinResponse.authUrl,
        'plexAuth',
        'width=600,height=700,resizable=yes,scrollbars=yes'
      );
      
      if (authWindow) {
        authWindowRef.current = authWindow;
        startPolling(pinResponse.pinId);
      } else {
        throw new Error('Failed to open authentication window');
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  const checkPin = async (pinId: string): Promise<boolean> => {
    try {
      const response = await axios.get(`/api/plex/oauth/pin/${pinId}/check`);
      
      if (response.data.authenticated) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          username: response.data.username,
          email: response.data.email
        });
        
        setPinData(null);
        onAuthSuccess?.(response.data);
        cleanup();
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Handle specific error codes
      if (error.response?.data?.code === 'PIN_EXPIRED') {
        handleAuthError(new Error('Authentication PIN has expired'));
        return true; // Stop polling
      }
      throw error;
    }
  };

  const startPolling = (pinId: string) => {
    pollingAttemptRef.current = 0;
    
    pollingIntervalRef.current = setInterval(async () => {
      pollingAttemptRef.current++;
      
      // Check if window was closed by user
      if (authWindowRef.current && authWindowRef.current.closed) {
        handleAuthError(new Error('Authentication window was closed'));
        return;
      }
      
      // Check if we've exceeded max attempts
      if (pollingAttemptRef.current >= maxPollingAttempts) {
        handleAuthError(new Error('Authentication timeout'));
        return;
      }
      
      try {
        const authenticated = await checkPin(pinId);
        if (authenticated) {
          cleanup();
        }
      } catch (error) {
        handleAuthError(error);
      }
    }, pollingInterval);
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await axios.post('/api/plex/oauth/logout');
      setAuthState({
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Force local logout even if server request fails
      setAuthState({
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  const cancelAuth = () => {
    cleanup();
    setAuthState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Authentication cancelled'
    }));
    setPinData(null);
  };

  return {
    // State
    ...authState,
    pinCode: pinData?.code,
    
    // Actions
    startAuth,
    logout,
    cancelAuth,
    validateToken,
    
    // Utils
    isPolling: !!pollingIntervalRef.current
  };
};
