# coding=utf-8

import os
import requests
from flask import Blueprint, redirect, request, session, jsonify
from app.config import settings, save_settings

plex_oauth = Blueprint('plex_oauth', __name__)

PLEX_CLIENT_ID = os.getenv('PLEX_CLIENT_ID', 'bazarr')
PLEX_CLIENT_SECRET = os.getenv('PLEX_CLIENT_SECRET', '')
PLEX_REDIRECT_URI = os.getenv('PLEX_REDIRECT_URI', 'http://localhost:6767/api/plex/oauth/callback')
PLEX_OAUTH_URL = 'https://plex.tv/users/sign_in.json'
PLEX_RESOURCES_URL = 'https://plex.tv/api/resources?includeHttps=1'

@plex_oauth.route('/api/plex/oauth/login')
def plex_login():
    # Redirect user to Plex.tv OAuth
    oauth_url = f'https://plex.tv/auth#?clientID={PLEX_CLIENT_ID}&code={PLEX_CLIENT_SECRET}&redirect={PLEX_REDIRECT_URI}'
    return redirect(oauth_url)

@plex_oauth.route('/api/plex/oauth/callback')
def plex_callback():
    # Handle Plex OAuth callback
    code = request.args.get('code')
    if not code:
        return 'Missing code', 400
    # Exchange code for token
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
        return 'Failed to authenticate with Plex', 400
    token = resp.json().get('user', {}).get('authToken')
    if not token:
        return 'No token received', 400
    session['plex_token'] = token
    # Optionally save to settings
    settings.plex_token = token
    save_settings(settings)
    return redirect('/settings/plex')

@plex_oauth.route('/api/plex/servers')
def plex_servers():
    token = session.get('plex_token') or getattr(settings, 'plex_token', None)
    if not token:
        return jsonify({'error': 'Not authenticated'}), 401
    resp = requests.get(PLEX_RESOURCES_URL, headers={
        'X-Plex-Token': token,
        'Accept': 'application/xml',
    })
    if resp.status_code != 200:
        return jsonify({'error': 'Failed to fetch servers'}), 400
    # Parse XML and extract servers
    import xml.etree.ElementTree as ET
    root = ET.fromstring(resp.text)
    servers = []
    for device in root.findall('.//Device'):
        for conn in device.findall('Connection'):
            servers.append({
                'name': device.get('name'),
                'address': conn.get('address'),
                'port': conn.get('port'),
                'uri': conn.get('uri'),
                'local': conn.get('local'),
                'ssl': conn.get('protocol') == 'https',
            })
    return jsonify({'servers': servers})

@plex_oauth.route('/api/plex/server', methods=['POST'])
def plex_select_server():
    data = request.json
    settings.plex_ip = data.get('address')
    settings.plex_port = data.get('port')
    settings.plex_ssl = data.get('ssl')
    save_settings(settings)
    return jsonify({'success': True})
