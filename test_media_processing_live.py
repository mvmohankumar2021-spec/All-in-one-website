"""Real FFmpeg tests against generated fixtures, not user uploads."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from media_processing import media_binary, process_video


@unittest.skipUnless(media_binary('ffmpeg') and media_binary('ffprobe'), 'FFmpeg is not installed')
class LiveMediaTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)

    def tearDown(self): self.temp.cleanup()

    def generate(self, name, duration=1, size='1920x1080'):
        path = self.root / name
        subprocess.run([media_binary('ffmpeg'), '-v', 'error', '-f', 'lavfi', '-i', f'color=c=blue:s={size}:r=10', '-t', str(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(path)], check=True, capture_output=True)
        return path

    def probe(self, path):
        return json.loads(subprocess.check_output([media_binary('ffprobe'), '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))

    def test_real_resize_and_music(self):
        source = self.generate('video.mp4')
        track = Path(__file__).parent / 'assets/music/envision.mp3'
        result = self.probe(process_video(source, '9:16', music=track, credit='Test CC BY attribution'))
        video = next(s for s in result['streams'] if s['codec_type'] == 'video')
        self.assertEqual((video['width'], video['height']), (720, 1280))
        self.assertTrue(any(s['codec_type'] == 'audio' for s in result['streams']))
        self.assertEqual(result['format']['tags']['comment'], 'Test CC BY attribution')

    def test_reel_rejected_landscape_allowed(self):
        source = self.generate('long.mp4', 61, '32x32')
        with self.assertRaisesRegex(ValueError, '60 seconds'): process_video(source, '9:16')
        result = self.probe(process_video(source, '16:9'))
        self.assertGreater(float(result['format']['duration']), 60)

    def test_image_music_is_ten_seconds(self):
        source = self.root / 'image.png'
        subprocess.run([media_binary('ffmpeg'), '-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=100x100', '-frames:v', '1', str(source)], check=True, capture_output=True)
        result = self.probe(process_video(source, '16:9', music=Path(__file__).parent / 'assets/music/envision.mp3', still_image=True))
        self.assertAlmostEqual(float(result['format']['duration']), 10, places=1)


if __name__ == '__main__': unittest.main()
