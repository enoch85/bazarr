# coding=utf-8

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
