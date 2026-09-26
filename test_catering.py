"""Isolated catering persistence tests; never writes to the application database."""
import json
import sqlite3
import unittest
from contextlib import contextmanager
from unittest.mock import patch
import server


class CateringTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript('CREATE TABLE catering_partner_onboarding(account_id INTEGER PRIMARY KEY,details_json TEXT,application_status TEXT,updated_at INTEGER); CREATE TABLE vendor_certificates(account_id INTEGER);')
        self.handler = object.__new__(server.SHAKALPAHandler)
        self.handler.require_vendor = lambda: {'id': 1}
        self.handler.origin_is_valid = lambda: True
        self.handler.send_json = lambda data, code=200: setattr(self, 'result', (data, code))
        @contextmanager
        def connection():
            yield self.db
        self.patch = patch.object(server, 'connection', connection)
        self.patch.start()
        self.schema = json.loads((server.ROOT / 'catering-schema.json').read_text())

    def tearDown(self):
        self.patch.stop()
        self.db.close()

    def save(self, payload):
        self.handler.read_json = lambda: payload
        self.handler.vendor_catering_onboarding(save=True)
        return self.result

    def valid(self):
        data = {f[0]: ('2' if f[3] == 'number' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
        data.update(services=['Wedding Catering'], wedding='Wedding package', expiry='2099-01-01', submit=True, agreements={p[0]: True for p in self.schema['policies']})
        return data

    def test_draft_round_trip(self):
        self.assertEqual(self.save({'services':['Home Catering'], 'home':'At home'})[1], 200)
        self.handler.vendor_catering_onboarding()
        self.assertEqual(self.result[0]['details']['home'], 'At home')
        self.assertEqual(self.result[0]['status'], 'Draft')

    def test_public_schema_route(self):
        self.handler.path = '/catering-schema.json'
        self.handler.do_GET()
        self.assertEqual(self.result[1], 200)
        self.assertEqual(self.result[0]['services'], self.schema['services'])

    def test_empty_submission_rejected(self):
        self.assertEqual(self.save({'services':['Wedding Catering'], 'submit':True})[1], 400)

    def test_document_required(self):
        self.assertIn('Upload', self.save(self.valid())[0]['error'])

    def test_submit_and_account_isolation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        self.assertEqual(self.save(self.valid())[0]['status'], 'Application Submitted')
        self.handler.require_vendor = lambda: {'id':2}
        self.handler.vendor_catering_onboarding()
        self.assertEqual(self.result[0]['details'], {})

    def test_capacity_and_service_rules(self):
        data = self.valid(); data['maxGuests']='1'
        self.assertIn('Maximum', self.save(data)[0]['error'])
        data=self.valid(); data['services']=['Outdoor Catering']
        self.assertIn('Outdoor', self.save(data)[0]['error'])

    def test_origin_and_invalid_payload(self):
        self.assertEqual(self.save([])[1], 400)
        self.handler.origin_is_valid=lambda:False
        self.assertEqual(self.save(self.valid())[1], 403)


if __name__ == '__main__':
    unittest.main()
