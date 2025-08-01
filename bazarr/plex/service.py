# coding=utf-8
import os
import requests
from app.config import settings, save_settings
from flask import session
from .models import PlexServerConnection, PlexServerToken

PLEX_CLIENT_ID = os.getenv('PLEX_CLIENT_ID', 'bazarr')
PLEX_CLIENT_SECRET = os.getenv('PLEX_CLIENT_SECRET', '')
PLEX_REDIRECT_URI = os.getenv('PLEX_REDIRECT_URI', 'http://localhost:6767/api/plex/oauth/callback')
PLEX_OAUTH_URL = 'https://plex.tv/users/sign_in.json'
PLEX_RESOURCES_URL = 'https://plex.tv/api/resources?includeHttps=1'

class PlexService:
    @staticmethod
    def start_oauth():
        oauth_url = f'https://plex.tv/auth#?clientID={PLEX_CLIENT_ID}&code={PLEX_CLIENT_SECRET}&redirect={PLEX_REDIRECT_URI}'
        return oauth_url

    @staticmethod
    def exchange_code_for_token(code):
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
            'redirect_uri': PLEX_REDIRECT_URI,
            'grant_type': 'authorization_code',
        })
        if resp.status_code != 200:
            return None
        token = resp.json().get('user', {}).get('authToken')
        if token:
            session['plex_token'] = token
            settings.plex_token = token
            save_settings(settings)
            return PlexServerToken(token)
        return None

    @staticmethod
    def get_servers():
        token = session.get('plex_token') or getattr(settings, 'plex_token', None)
        if not token:
            return None
        resp = requests.get(PLEX_RESOURCES_URL, headers={
            'X-Plex-Token': token,
            'Accept': 'application/xml',
        })
        if resp.status_code != 200:
            return None
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.text)
        servers = []
        for device in root.findall('.//Device'):
            for conn in device.findall('Connection'):
                servers.append(PlexServerConnection(
                    name=device.get('name'),
                    address=conn.get('address'),
                    port=conn.get('port'),
                    uri=conn.get('uri'),
                    local=conn.get('local'),
                    ssl=conn.get('protocol') == 'https',
                ))
        return servers

    @staticmethod
    def save_selected_server(data):
        settings.plex_ip = data.get('address')
        settings.plex_port = data.get('port')
        settings.plex_ssl = data.get('ssl')
        save_settings(settings)
        return True
