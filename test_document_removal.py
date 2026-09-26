import json
import sqlite3
import unittest
from contextlib import contextmanager
from unittest.mock import patch
import server


class DocumentRemovalTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
          CREATE TABLE vendor_certificates(id INTEGER PRIMARY KEY, account_id INTEGER, original_name TEXT, storage_name TEXT, media_type TEXT, uploaded_at INTEGER);
          CREATE TABLE removed_vendor_certificates(id INTEGER PRIMARY KEY, account_id INTEGER, record_json TEXT, removed_at INTEGER);
          INSERT INTO vendor_certificates VALUES (1, 10, 'proof.pdf', 'private.pdf', 'application/pdf', 0);
          CREATE TABLE vendor_profiles(account_id INTEGER, approval_status TEXT);
          CREATE TABLE vendor_profile_changes(account_id INTEGER, approval_status TEXT);
        ''')
        for kind in ('electrical','plumbing','furniture','catering','meal','grocery','fresh_food','household','retail'):
            self.db.execute(f'CREATE TABLE {kind}_partner_onboarding(account_id INTEGER, application_status TEXT)')
        self.db.commit()
        @contextmanager
        def connection():
            with self.db:
                yield self.db
        self.patcher = patch.object(server, 'connection', connection); self.patcher.start()
        self.handler = object.__new__(server.SHAKALPAHandler)
        self.handler.require_vendor = lambda: {'id':10}
        self.handler.origin_is_valid = lambda: True
        self.handler.read_json = lambda: {'id':1}
        self.handler.send_json = lambda data, code=200: setattr(self, 'result', (data,code))

    def tearDown(self):
        self.patcher.stop(); self.db.close()

    def test_remove_archives_and_hides_download(self):
        self.handler.vendor_remove_document()
        self.assertEqual(self.result[1],200)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM vendor_certificates').fetchone()[0],0)
        record=self.db.execute('SELECT record_json FROM removed_vendor_certificates').fetchone()[0]
        self.assertEqual(json.loads(record)['storage_name'],'private.pdf')
        self.assertIsNone(self.handler.certificate_from_query(server.urlparse('/api/vendor/certificate?id=1'),10))

    def test_other_account_cannot_remove(self):
        self.handler.require_vendor=lambda:{'id':11}
        self.handler.vendor_remove_document(); self.assertEqual(self.result[1],404)

    def test_reviewed_profiles_locked(self):
        for status in ('Submitted','Approved'):
            self.db.execute('DELETE FROM vendor_profiles')
            self.db.execute('INSERT INTO vendor_profiles VALUES (10,?)',(status,)); self.db.commit()
            self.handler.vendor_remove_document(); self.assertEqual(self.result[1],409)

    def test_service_submission_locked(self):
        self.db.execute("INSERT INTO catering_partner_onboarding VALUES (10,'Application Submitted')"); self.db.commit()
        self.handler.vendor_remove_document(); self.assertEqual(self.result[1],409)

    def test_bad_origin_and_id(self):
        self.handler.origin_is_valid=lambda:False
        self.handler.vendor_remove_document(); self.assertEqual(self.result[1],403)
        self.handler.origin_is_valid=lambda:True
        self.handler.read_json=lambda:{'id':True}
        self.handler.vendor_remove_document(); self.assertEqual(self.result[1],400)

    def test_list_scoped_to_owner(self):
        self.handler.vendor_documents()
        self.assertEqual(self.result[0]['documents'],[{'id':1,'name':'proof.pdf'}])
        self.handler.require_vendor=lambda:{'id':11}
        self.handler.vendor_documents(); self.assertEqual(self.result[0]['documents'],[])

if __name__ == '__main__':
    unittest.main()
