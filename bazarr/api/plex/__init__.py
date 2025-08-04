# coding=utf-8
"""Plex API module for Bazarr."""

from flask_restx import Namespace

# Create namespace for Plex API
api_ns_plex = Namespace('Plex Authentication', description='Plex OAuth and server management')

# Import OAuth routes after namespace is created
from .oauth import *  # noqa

# Export for API registration
api_ns_list_plex = [api_ns_plex]
