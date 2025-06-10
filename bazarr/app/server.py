# coding=utf-8

import signal
import warnings
import logging
import cherrypy

from literals import EXIT_INTERRUPT, EXIT_NORMAL
from utilities.central import restart_bazarr, stop_bazarr
from time import sleep

from api import api_bp
from .ui import ui_bp
from .get_args import args
from .config import settings, base_url
from .database import close_database
from .app import create_app

app = create_app()
app.register_blueprint(api_bp, url_prefix=base_url.rstrip('/') + '/api')
app.register_blueprint(ui_bp, url_prefix=base_url.rstrip('/'))


class Server:
    def __init__(self):
        # Mute DeprecationWarning
        warnings.simplefilter("ignore", DeprecationWarning)
        # Mute Insecure HTTPS requests made to Sonarr and Radarr
        warnings.filterwarnings('ignore', message='Unverified HTTPS request')
        # Mute Python3 BrokenPipeError
        warnings.simplefilter("ignore", BrokenPipeError)

        self.server = None
        self.server6 = None
        self.connected = False
        self.address = str(settings.general.ip)
        self.port = int(args.port) if args.port else int(settings.general.port)
        self.interrupted = False

        while not self.connected:
            sleep(0.1)
            self.configure_server()

    def configure_server(self):
        cherrypy.config.update({'log.screen': False, 'log.access_file': '', 'log.error_file': ''})
        cherrypy.config.update({'server.shutdown_timeout': 1, 'server.thread_pool': 100})
        cherrypy.log.error_log.setLevel(logging.CRITICAL)
        self.server = cherrypy._cpserver.Server()
        if self.address == '*':
            # we listen to every IPv4 available IP addresses
            self.server.socket_host = '0.0.0.0'

            # we must create a distinct server to support both IPv4 and IPv6 at the same time
            self.server6 = cherrypy._cpserver.Server()
            self.server6.socket_host = '::'
            self.server6.socket_port = self.port
        else:
            # we bind to only IPv4 or IPv6, not both at the same time
            self.server.socket_host = self.address
        self.server.socket_port = self.port

        cherrypy.tree.graft(app, script_name='/')
        self.connected = True

    def interrupt_handler(self, signum, frame):
        if not self.interrupted:
            # ignore user hammering Ctrl-C; we heard you the first time!
            self.interrupted = True
            self.shutdown(EXIT_INTERRUPT)

    def start(self):
        signal.signal(signal.SIGINT, self.interrupt_handler)
        try:
            self.server.start()
            if self.server6:
                self.server6.start()
        except (KeyboardInterrupt, SystemExit):
            self.shutdown()
        except Exception as e:
            logging.critical(f"BAZARR cannot start because of: {e}")
            self.shutdown()
        else:
            logging.info(f"BAZARR is started and waiting for requests on: {self.server.base()}")

    def close_all(self):
        logging.info("Closing database...")
        close_database()
        logging.info("Please wait while we're closing webserver...")
        # IPv6 only webserver must be stopped first if it's been started.
        if self.server6:
            self.server6.stop()
        # then we stop the main webserver
        if self.server:
            self.server.stop()

    def shutdown(self, status=EXIT_NORMAL):
        self.close_all()
        stop_bazarr(status, False)

    def restart(self):
        self.close_all()
        restart_bazarr()


webserver = Server()
