# coding=utf-8
import os
import requests

PLEX_CLIENT_ID = os.getenv('PLEX_CLIENT_ID', 'bazarr')
PLEX_CLIENT_SECRET = os.getenv('PLEX_CLIENT_SECRET', '')
# In development, frontend runs on 5173, in production use the default port
PLEX_REDIRECT_URI = os.getenv('PLEX_REDIRECT_URI', 'http://localhost:5173/api/plex/oauth/callback' if os.getenv('NODE_ENV') == 'development' else 'http://localhost:6767/api/plex/oauth/callback')
PLEX_OAUTH_URL = 'https://plex.tv/users/sign_in.json'
PLEX_RESOURCES_URL = 'https://plex.tv/api/v2/resources?includeHttps=1'

class PlexServerConnection:
    def __init__(self, name, address, port, uri, local, ssl):
        self.name = name
        self.address = address
        self.port = port
        self.uri = uri
        self.local = local
        self.ssl = ssl

    def to_dict(self):
        return {
            'name': self.name,
            'address': self.address,
            'port': self.port,
            'uri': self.uri,
            'local': self.local,
            'ssl': self.ssl,
        }

class PlexServerToken:
    def __init__(self, token):
        self.token = token

    def to_dict(self):
        return {'token': self.token}

class PlexService:
    @staticmethod
    def start_oauth():
        from flask import request
        # Build redirect URI dynamically based on the current request
        if request and request.host:
            scheme = request.scheme if request.scheme else 'http'
            redirect_uri = f'{scheme}://{request.host}/api/plex/oauth/callback'
        else:
            # Fallback to environment variable
            redirect_uri = PLEX_REDIRECT_URI
        
        oauth_url = f'https://plex.tv/auth#?clientID={PLEX_CLIENT_ID}&code={PLEX_CLIENT_SECRET}&redirect={redirect_uri}'
        return oauth_url

    @staticmethod
    def exchange_code_for_token(code):
        from flask import session, request
        from app.config import settings, save_settings
        
        # Build redirect URI dynamically based on the current request
        if request and request.host:
            scheme = request.scheme if request.scheme else 'http'
            redirect_uri = f'{scheme}://{request.host}/api/plex/oauth/callback'
        else:
            # Fallback to environment variable
            redirect_uri = PLEX_REDIRECT_URI
        
        resp = requests.post(PLEX_OAUTH_URL, headers={
            'X-Plex-Client-Identifier': PLEX_CLIENT_ID,
            'X-Plex-Product': 'Bazarr',
            'X-Plex-Version': '1.0',
            'X-Plex-Device': 'Bazarr',
            'X-Plex-Platform': 'Linux',
            'X-Plex-Platform-Version': 'Ubuntu',
            'Accept': 'application/json',
        }, data={
            'code': code,
            'client_id': PLEX_CLIENT_ID,
            'client_secret': PLEX_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        })
        if resp.status_code != 200:
            return None
        token = resp.json().get('user', {}).get('authToken')
        if token:
            session['plex_token'] = token
            settings.plex.token = token
            save_settings(settings)
            return PlexServerToken(token)
        return None

    @staticmethod
    def get_servers():
        from flask import session
        from app.config import settings
        
        token = session.get('plex_token') or getattr(settings.plex, 'token', None)
        if not token:
            return None
        resp = requests.get(PLEX_RESOURCES_URL, headers={
            'X-Plex-Token': token,
            'Accept': 'application/json',
        })
        if resp.status_code != 200:
            return None
        # Parse JSON response
        try:
            resources = resp.json()
            servers = []
            for resource in resources:
                if resource.get('provides') == 'server' and resource.get('owned', False):
                    connections = resource.get('connections', [])
                    for conn in connections:
                        servers.append(PlexServerConnection(
                            name=resource.get('name'),
                            address=conn.get('address'),
                            port=str(conn.get('port', 32400)),
                            uri=conn.get('uri'),
                            local=str(conn.get('local', False)).lower(),
                            ssl=conn.get('protocol') == 'https',
                        ))
            return servers
        except (ValueError, KeyError) as e:
            return None

    @staticmethod
    def save_selected_server(data):
        from app.config import settings, save_settings
        
        settings.plex.ip = data.get('address')
        settings.plex.port = data.get('port')
        settings.plex.ssl = data.get('ssl')
        save_settings(settings)
        return True
