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
    pollingAttemptRef.current = 0;
    if (authWindowRef.current && !authWindowRef.current.closed) {
      authWindowRef.current.close();
    }
  }, []);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/plex/oauth/validate');
      
      if (response.data.valid) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          username: response.data.username,
          email: response.data.email
        });
        return true;
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: response.data.error,
          errorCode: response.data.code
        });
        return false;
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check authentication status'
      });
      return false;
    }
  }, []);

  // Create PIN
  const createPin = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const response = await axios.post('/api/plex/oauth/pin');
      const data: PinResponse = response.data;
      
      setPinData(data);
      return data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create PIN';
      const errorCode = error.response?.data?.code;
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        errorCode
      }));
      
      if (onAuthError) {
        onAuthError({ message: errorMessage, code: errorCode });
      }
      
      throw error;
    }
  }, [onAuthError]);

  // Check PIN status
  const checkPin = useCallback(async (pinId: string) => {
    try {
      const response = await axios.get(`/api/plex/oauth/pin/${pinId}/check`);
      
      if (response.data.authenticated) {
        cleanup();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          username: response.data.username,
          email: response.data.email
        });
        
        if (onAuthSuccess) {
          onAuthSuccess(response.data);
        }
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Handle specific error codes
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'PIN_EXPIRED') {
        cleanup();
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication PIN has expired. Please try again.',
          errorCode
        }));
        
        if (onAuthError) {
          onAuthError({ message: 'PIN expired', code: errorCode });
        }
        
        return true; // Stop polling
      }
      
      // Don't stop polling for other errors
      return false;
    }
  }, [cleanup, onAuthSuccess, onAuthError]);

  // Start polling
  const startPolling = useCallback((pinId: string) => {
    if (pollingIntervalRef.current) {
      return; // Already polling
    }

    pollingAttemptRef.current = 0;

    pollingIntervalRef.current = setInterval(async () => {
      pollingAttemptRef.current++;
      
      // Check if we've exceeded max attempts
      if (pollingAttemptRef.current >= maxPollingAttempts) {
        cleanup();
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication timeout. Please try again.',
          errorCode: 'AUTH_TIMEOUT'
        }));
        
        if (onAuthError) {
          onAuthError({ message: 'Authentication timeout', code: 'AUTH_TIMEOUT' });
        }
        
        return;
      }
      
      // Check PIN status
      const shouldStop = await checkPin(pinId);
      if (shouldStop) {
        cleanup();
      }
    }, pollingInterval);
  }, [checkPin, cleanup, maxPollingAttempts, pollingInterval, onAuthError]);

  // Start authentication
  const startAuth = useCallback(async () => {
    try {
      cleanup();
      const pin = await createPin();
      
      // Open auth window
      const width = 600;
      const height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      
      authWindowRef.current = window.open(
        pin.authUrl,
        'PlexAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Start polling
      startPolling(pin.pinId);
      
      return pin;
    } catch (error) {
      // Error already handled in createPin
      return null;
    }
  }, [createPin, startPolling, cleanup]);

  // Logout
  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await axios.post('/api/plex/oauth/logout');
      setAuthState({
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to logout'
      }));
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...authState,
    pinData,
    startAuth,
    checkAuthStatus,
    logout,
    isPolling: pollingIntervalRef.current !== null
  };
};
