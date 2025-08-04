# coding=utf-8

import time
import requests
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from functools import wraps
import jwt
from cryptography.fernet import Fernet
from datetime import datetime, timedelta

from .exceptions import *
from bazarr.app.config import settings
from bazarr.app.database import TableUser, database

# Generate encryption key for token storage
ENCRYPTION_KEY = settings.get('plex.encryption_key') or Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

plex_auth_bp = Blueprint('plex_auth', __name__, url_prefix='/api/plex/oauth')

def encrypt_token(token):
    """Encrypt Plex token for secure storage."""
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token):
    """Decrypt Plex token."""
    try:
        return cipher_suite.decrypt(encrypted_token.encode()).decode()
    except Exception:
        raise InvalidTokenError("Failed to decrypt token")

def validate_plex_token(token):
    """Validate token with Plex API."""
    try:
        headers = {
            'X-Plex-Token': token,
            'Accept': 'application/json'
        }
        response = requests.get(
            'https://plex.tv/api/v2/user',
            headers=headers,
            timeout=10
        )
        if response.status_code == 401:
            raise InvalidTokenError()
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise PlexConnectionError(f"Failed to validate token: {str(e)}")

def require_valid_plex_token(f):
    """Decorator to ensure valid Plex token."""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        user = database.execute(
            database.select(TableUser).where(TableUser.id == current_user.id)
        ).scalar()
        
        if not user or not user.plex_token:
            return jsonify({'error': 'No Plex token found'}), 401
        
        try:
            decrypted_token = decrypt_token(user.plex_token)
            # Check if token needs refresh (older than 24 hours)
            if user.plex_token_updated and \
               datetime.utcnow() - user.plex_token_updated > timedelta(hours=24):
                decrypted_token = refresh_token(decrypted_token)
                user.plex_token = encrypt_token(decrypted_token)
                user.plex_token_updated = datetime.utcnow()
                database.commit()
            
            request.plex_token = decrypted_token
            return f(*args, **kwargs)
        except PlexAuthError as e:
            return jsonify({'error': e.message, 'code': e.error_code}), e.status_code
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 500
    
    return decorated_function

@plex_auth_bp.route('/pin', methods=['POST'])
def create_pin():
    """Create Plex OAuth PIN following Overseerr pattern."""
    try:
        client_id = request.json.get('clientId', generate_client_id())
        
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Plex-Product': 'Bazarr',
            'X-Plex-Version': current_app.version,
            'X-Plex-Client-Identifier': client_id,
            'X-Plex-Platform': 'Web',
            'X-Plex-Platform-Version': '1.0',
            'X-Plex-Device': 'Bazarr',
            'X-Plex-Device-Name': 'Bazarr Web'
        }
        
        response = requests.post(
            'https://plex.tv/api/v2/pins',
            headers=headers,
            json={'strong': True},
            timeout=10
        )
        response.raise_for_status()
        
        pin_data = response.json()
        
        # Store PIN temporarily with expiration
        cache_pin(pin_data['id'], {
            'code': pin_data['code'],
            'client_id': client_id,
            'expires_at': time.time() + 600  # 10 minutes
        })
        
        return jsonify({
            'pinId': pin_data['id'],
            'code': pin_data['code'],
            'clientId': client_id,
            'authUrl': f"https://app.plex.tv/auth#?clientID={client_id}&code={pin_data['code']}&context[device][product]=Bazarr"
        })
        
    except requests.exceptions.RequestException as e:
        raise PlexConnectionError(f"Failed to create PIN: {str(e)}")

@plex_auth_bp.route('/pin/<pin_id>/check', methods=['GET'])
def check_pin(pin_id):
    """Check PIN status following PlexJS pattern."""
    try:
        cached_pin = get_cached_pin(pin_id)
        if not cached_pin:
            return jsonify({'error': 'PIN not found or expired'}), 404
        
        headers = {
            'Accept': 'application/json',
            'X-Plex-Client-Identifier': cached_pin['client_id']
        }
        
        response = requests.get(
            f'https://plex.tv/api/v2/pins/{pin_id}',
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        pin_data = response.json()
        
        if pin_data.get('authToken'):
            # Validate token immediately
            user_data = validate_plex_token(pin_data['authToken'])
            
            # Store encrypted token
            encrypted_token = encrypt_token(pin_data['authToken'])
            
            # Update user record
            user = database.execute(
                database.select(TableUser).where(TableUser.id == current_user.id)
            ).scalar()
            
            user.plex_token = encrypted_token
            user.plex_token_updated = datetime.utcnow()
            user.plex_username = user_data.get('username')
            user.plex_email = user_data.get('email')
            database.commit()
            
            # Clean up PIN
            delete_cached_pin(pin_id)
            
            return jsonify({
                'authToken': '***',  # Never send actual token to frontend
                'authenticated': True,
                'username': user_data.get('username'),
                'email': user_data.get('email')
            })
        
        return jsonify({
            'authenticated': False,
            'code': pin_data.get('code')
        })
        
    except requests.exceptions.RequestException as e:
        raise PlexConnectionError(f"Failed to check PIN: {str(e)}")

@plex_auth_bp.route('/validate', methods=['GET'])
@require_valid_plex_token
def validate_token():
    """Validate current user's Plex token."""
    try:
        user_data = validate_plex_token(request.plex_token)
        return jsonify({
            'valid': True,
            'username': user_data.get('username'),
            'email': user_data.get('email')
        })
    except PlexAuthError as e:
        return jsonify({
            'valid': False,
            'error': e.message,
            'code': e.error_code
        }), 200  # Return 200 to distinguish from other errors

@plex_auth_bp.route('/servers', methods=['GET'])
@require_valid_plex_token
def get_servers():
    """Get Plex servers following Overseerr pattern."""
    try:
        headers = {
            'X-Plex-Token': request.plex_token,
            'Accept': 'application/json'
        }
        
        # Get servers from plex.tv
        response = requests.get(
            'https://plex.tv/api/v2/resources',
            headers=headers,
            params={'includeHttps': 1, 'includeRelay': 1},
            timeout=10
        )
        response.raise_for_status()
        
        servers = []
        for device in response.json():
            if device.get('provides') == 'server' and device.get('owned'):
                # Test each connection
                connections = []
                for conn in device.get('connections', []):
                    if test_plex_connection(conn['uri'], request.plex_token):
                        connections.append({
                            'uri': conn['uri'],
                            'protocol': conn.get('protocol'),
                            'address': conn.get('address'),
                            'port': conn.get('port'),
                            'local': conn.get('local', False)
                        })
                
                if connections:
                    servers.append({
                        'name': device['name'],
                        'machineIdentifier': device['clientIdentifier'],
                        'connections': connections,
                        'version': device.get('productVersion'),
                        'platform': device.get('platform'),
                        'device': device.get('device')
                    })
        
        return jsonify({'servers': servers})
        
    except requests.exceptions.RequestException as e:
        raise PlexConnectionError(f"Failed to get servers: {str(e)}")

@plex_auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Clear Plex authentication."""
    try:
        user = database.execute(
            database.select(TableUser).where(TableUser.id == current_user.id)
        ).scalar()
        
        user.plex_token = None
        user.plex_token_updated = None
        user.plex_username = None
        user.plex_email = None
        database.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to logout'}), 500

def refresh_token(token):
    """Refresh Plex token using ping endpoint."""
    try:
        headers = {
            'X-Plex-Token': token,
            'Accept': 'application/json'
        }
        
        # Use ping endpoint to refresh token
        response = requests.get(
            'https://plex.tv/api/v2/ping',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 401:
            raise TokenExpiredError()
        
        response.raise_for_status()
        
        # Token is still valid, return as-is
        return token
        
    except requests.exceptions.RequestException as e:
        raise PlexConnectionError(f"Failed to refresh token: {str(e)}")

def test_plex_connection(uri, token):
    """Test connection to a Plex server."""
    try:
        headers = {
            'X-Plex-Token': token,
            'Accept': 'application/json'
        }
        
        response = requests.get(
            f"{uri}/identity",
            headers=headers,
            timeout=5,
            verify=False  # Many Plex servers use self-signed certs
        )
        
        return response.status_code == 200
    except:
        return False

# Error handlers
@plex_auth_bp.errorhandler(PlexAuthError)
def handle_plex_error(e):
    return jsonify({
        'error': e.message,
        'code': e.error_code
    }), e.status_code
