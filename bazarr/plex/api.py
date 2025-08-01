# coding=utf-8
from flask import Blueprint, redirect, request, jsonify
from .service import PlexService

plex_api = Blueprint('plex_api', __name__)

@plex_api.route('/api/plex/oauth/login')
def plex_login():
    return redirect(PlexService.start_oauth())

@plex_api.route('/api/plex/oauth/callback')
def plex_callback():
    code = request.args.get('code')
    if not code:
        return 'Missing code', 400
    token_obj = PlexService.exchange_code_for_token(code)
    if not token_obj:
        return 'Failed to authenticate with Plex', 400
    return redirect('/settings/plex')

@plex_api.route('/api/plex/servers')
def plex_servers():
    servers = PlexService.get_servers()
    if servers is None:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'servers': [s.to_dict() for s in servers]})

@plex_api.route('/api/plex/server', methods=['POST'])
def plex_select_server():
    data = request.json
    success = PlexService.save_selected_server(data)
    return jsonify({'success': success})
