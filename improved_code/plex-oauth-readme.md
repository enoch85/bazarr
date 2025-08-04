# Plex OAuth Implementation Guide for Bazarr

This guide provides enhanced security and functionality improvements for the Plex OAuth implementation in PR #2983.

## Overview

The improvements focus on:
- **Security**: Token encryption, secure storage, and proper session management
- **Error Handling**: Comprehensive exception handling with proper HTTP status codes
- **Token Management**: Automatic refresh and validation
- **User Experience**: Better frontend state management and error feedback

## File Structure

```
bazarr/
├── api/
│   └── plex/
│       ├── __init__.py
│       ├── oauth.py (enhanced existing file)
│       ├── exceptions.py (new)
│       ├── security.py (new)
│       └── cache.py (new)
├── app/
│   ├── config.py (add Plex configuration)
│   └── database.py (add Plex OAuth fields)
└── frontend/
    └── src/
        ├── hooks/
        │   ├── usePlexOAuth.ts (enhanced)
        │   └── usePlexServers.ts (enhanced)
        └── components/
            └── PlexSettings.tsx (example component)
```

## Key Security Features

### 1. Token Encryption
- All Plex tokens are encrypted using Fernet symmetric encryption before storage
- Encryption key is generated on first run and stored in configuration
- Tokens are never sent to the frontend after initial authentication

### 2. CSRF Protection
- State tokens can be implemented for OAuth flow (optional)
- PIN-based authentication provides inherent CSRF protection

### 3. Rate Limiting
- Configurable rate limiting for API endpoints
- Prevents brute force attempts

### 4. Secure Session Management
- Tokens are validated on each request
- Automatic token refresh every 24 hours
- Proper cleanup of expired sessions

## Implementation Steps

### 1. Backend Setup

1. **Add Exception Classes** (`exceptions.py`)
   - Provides typed exceptions for better error handling
   - Each exception has appropriate HTTP status code

2. **Add Security Utilities** (`security.py`)
   - TokenManager for encryption/decryption
   - Rate limiting functionality
   - Security helpers

3. **Add Cache System** (`cache.py`)
   - Thread-safe PIN caching
   - Automatic cleanup of expired entries

4. **Enhance OAuth Routes** (`oauth.py`)
   - Add to existing oauth.py file
   - Implement secure token storage
   - Add validation endpoints
   - Proper error handling

### 2. Database Updates

1. **Add Plex OAuth fields to User model**
   ```python
   plex_token = Column(Text)  # Encrypted
   plex_token_updated = Column(DateTime)
   plex_username = Column(String(255))
   plex_email = Column(String(255))
   plex_user_id = Column(String(255))
   plex_servers = Column(JSON)
   ```

2. **Run database migration**
   - Use Alembic or your migration tool
   - See database schema file for migration script

### 3. Configuration Updates

1. **Add Plex configuration section**
   - OAuth settings
   - Encryption key management
   - Backward compatibility settings

2. **Run migration on startup**
   ```python
   from bazarr.app.config import initialize_plex
   initialize_plex()
   ```

### 4. Frontend Integration

1. **Use Enhanced Hooks**
   - `usePlexOAuth`: Handles authentication flow
   - `usePlexServers`: Manages server selection

2. **Implement UI Components**
   - See PlexSettings.tsx for example
   - Adapt to your UI framework

## API Endpoints

### Authentication Endpoints

- `POST /api/plex/oauth/pin` - Create authentication PIN
- `GET /api/plex/oauth/pin/{pinId}/check` - Check PIN status
- `GET /api/plex/oauth/validate` - Validate current token
- `POST /api/plex/oauth/logout` - Clear authentication

### Server Management

- `GET /api/plex/oauth/servers` - List available servers
- `POST /api/plex/select-server` - Select a server

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | Token is invalid or revoked |
| `TOKEN_EXPIRED` | Token has expired |
| `CONNECTION_ERROR` | Cannot connect to Plex |
| `SERVER_NOT_FOUND` | Server not found |
| `PIN_EXPIRED` | Authentication PIN expired |
| `AUTH_TIMEOUT` | Authentication timeout |

## Best Practices

1. **Never expose tokens to frontend**
   - Always return masked tokens (`***`)
   - Handle tokens server-side only

2. **Validate tokens regularly**
   - Check token validity on app startup
   - Refresh tokens before expiration

3. **Handle errors gracefully**
   - Provide clear error messages
   - Log errors for debugging
   - Fallback to legacy auth if needed

4. **Test connection before saving**
   - Verify server accessibility
   - Measure latency for better UX

## Migration from API Key

The implementation automatically migrates existing API key users:

1. Old `plex.apikey` is moved to `plex.legacy_token`
2. Auth method is set to `token` for backward compatibility
3. Users can continue using existing setup
4. OAuth is available as opt-in upgrade

## Security Considerations

1. **Token Storage**
   - Always encrypt tokens at rest
   - Use secure key management
   - Rotate encryption keys periodically

2. **Network Security**
   - Use HTTPS for all communications
   - Verify SSL certificates (except self-signed Plex servers)
   - Implement request timeouts

3. **Access Control**
   - Validate user permissions
   - Implement proper session management
   - Log authentication events

## Testing

1. **Unit Tests**
   - Test token encryption/decryption
   - Test error handling
   - Test cache functionality

2. **Integration Tests**
   - Test full OAuth flow
   - Test server discovery
   - Test token refresh

3. **Security Tests**
   - Test rate limiting
   - Test invalid token handling
   - Test CSRF protection

## Troubleshooting

### Common Issues

1. **"Failed to decrypt token"**
   - Check encryption key in config
   - Verify token format
   - Check for corruption

2. **"PIN expired"**
   - Increase PIN TTL if needed
   - Check clock synchronization
   - Verify cache functionality

3. **"Cannot connect to Plex"**
   - Check network connectivity
   - Verify Plex.tv is accessible
   - Check firewall rules

### Debug Mode

Enable debug logging for troubleshooting:
```python
import logging
logging.getLogger('bazarr.plex').setLevel(logging.DEBUG)
```

## Future Enhancements

1. **OAuth2 State Parameter**
   - Add CSRF state token validation
   - Store state in session

2. **Token Rotation**
   - Implement token rotation on refresh
   - Add token versioning

3. **Multi-Factor Support**
   - Handle Plex 2FA requirements
   - Add backup authentication methods

4. **Metrics and Monitoring**
   - Track authentication success/failure rates
   - Monitor token refresh patterns
   - Alert on suspicious activity
