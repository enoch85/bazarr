"""Plex authentication exceptions."""

class PlexAuthError(Exception):
    """Base exception for Plex authentication errors."""
    def __init__(self, message, status_code=500, error_code=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class InvalidTokenError(PlexAuthError):
    """Raised when Plex token is invalid."""
    def __init__(self, message="Invalid Plex token"):
        super().__init__(message, status_code=401, error_code="INVALID_TOKEN")

class TokenExpiredError(PlexAuthError):
    """Raised when Plex token has expired."""
    def __init__(self, message="Plex token has expired"):
        super().__init__(message, status_code=401, error_code="TOKEN_EXPIRED")

class PlexConnectionError(PlexAuthError):
    """Raised when cannot connect to Plex."""
    def __init__(self, message="Cannot connect to Plex"):
        super().__init__(message, status_code=503, error_code="CONNECTION_ERROR")

class PlexServerNotFoundError(PlexAuthError):
    """Raised when Plex server not found."""
    def __init__(self, message="Plex server not found"):
        super().__init__(message, status_code=404, error_code="SERVER_NOT_FOUND")

class PlexPinExpiredError(PlexAuthError):
    """Raised when PIN has expired."""
    def __init__(self, message="PIN has expired"):
        super().__init__(message, status_code=410, error_code="PIN_EXPIRED")

class PlexAuthTimeoutError(PlexAuthError):
    """Raised when authentication times out."""
    def __init__(self, message="Authentication timeout"):
        super().__init__(message, status_code=408, error_code="AUTH_TIMEOUT")
