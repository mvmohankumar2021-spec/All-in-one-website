"""Isolated tests; never modifies the application database or user uploads."""
import json
import sqlite3
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import urlparse
import server
import media_processing


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:'); self.db.row_factory = sqlite3.Row
        self.db.executescript("CREATE TABLE accounts(id INTEGER PRIMARY KEY,first_name TEXT,last_name TEXT,role TEXT,email TEXT); INSERT INTO accounts VALUES(1,'Member','One','Customer','private@example.com'); INSERT INTO accounts VALUES(2,'Partner','Two','Vendor','secret@example.com');")
        @contextmanager
        def connection(): yield self.db
        self.patcher = patch.object(server, 'connection', connection); self.patcher.start()
        self.handler = object.__new__(server.SHAKALPAHandler)
        self.handler.current_account = lambda: {'id': 1, 'role': 'Customer'}
        self.handler.origin_is_valid = lambda: True
        self.handler.send_json = lambda data, code=200: setattr(self, 'result', (data, code))
        self.handler.ensure_media_tables(self.db)

    def tearDown(self): self.patcher.stop(); self.db.close()

    def test_private_by_default_and_counts(self):
        self.db.execute("INSERT INTO media_follows VALUES(2,1,1)")
        self.db.execute("INSERT INTO media_posts(account_id,caption,created_at) VALUES(1,'Test',1)")
        self.handler.media_profile(urlparse('/api/media/profile?accountId=1'))
        result, status = self.result
        self.assertEqual(status, 200); self.assertEqual(result['bio'], '')
        self.assertEqual(result['counts'], {'followers': 1, 'following': 0, 'posts': 1})
        self.assertNotIn('email', result); self.assertNotIn('role', result)

    def test_save_is_owner_only_and_clearable(self):
        self.handler.read_json = lambda: {'accountId': 2, 'bio': 'Public only', 'website': 'https://example.com'}
        self.handler.media_save_profile()
        self.assertEqual(self.result[1], 200)
        self.assertEqual(self.db.execute('SELECT account_id FROM media_public_profiles').fetchone()[0], 1)
        self.handler.read_json = lambda: {}
        self.handler.media_save_profile()
        self.assertEqual(self.db.execute('SELECT bio FROM media_public_profiles').fetchone()[0], '')

    def test_unsafe_website_rejected(self):
        self.handler.read_json = lambda: {'website': 'javascript:alert(1)'}
        self.handler.media_save_profile(); self.assertEqual(self.result[1], 400)


class VideoTests(unittest.TestCase):
    def run_video(self, duration, aspect):
        probe = SimpleNamespace(stdout=json.dumps({'format': {'duration': str(duration)}, 'streams': [{'codec_type': 'video'}]}))
        with patch.dict(media_processing.os.environ, {}, clear=True), patch.object(media_processing.shutil, 'which', side_effect=lambda name: name), patch.object(media_processing.subprocess, 'run', return_value=probe) as run:
            result = media_processing.process_video(Path('test-source.mp4'), aspect)
            return result, run.call_args_list

    def test_reel_boundary(self):
        self.run_video(60, '9:16')
        with self.assertRaisesRegex(ValueError, '60 seconds'): self.run_video(60.1, '9:16')

    def test_landscape_longer_and_720p(self):
        _, calls = self.run_video(120, '16:9')
        args = calls[-1].args[0]
        self.assertIn('scale=1280:720', args[args.index('-vf') + 1])

    def test_invalid_duration(self):
        with self.assertRaises(ValueError): self.run_video(float('nan'), '9:16')

    def test_missing_processor_fails_closed(self):
        with patch.object(media_processing, 'media_binary', return_value=None):
            with self.assertRaisesRegex(ValueError, 'require FFmpeg'): media_processing.process_video(Path('not-opened.mp4'), '9:16')


if __name__ == '__main__': unittest.main()
