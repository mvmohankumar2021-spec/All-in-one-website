"""Validate actual video metadata and cap uploads at 720p; no client metadata trust."""
import json
import math
import os
from pathlib import Path
import shutil
import subprocess


def media_binary(name):
    configured = os.environ.get('SHAKALPA_' + name.upper()) or shutil.which(name)
    if configured:
        return configured
    local = Path(__file__).resolve().parent / '.tools' / 'ffmpeg'
    return next((str(path) for path in local.glob(f'*/bin/{name}.exe')), None)


def process_video(source: Path, aspect: str, music=None, still_image=False, credit='') -> Path:
    ffprobe = media_binary('ffprobe')
    ffmpeg = media_binary('ffmpeg')
    if not ffprobe or not ffmpeg:
        raise ValueError('Video uploads require FFmpeg and FFprobe on the server. Please contact the administrator.')
    flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
    target = source.with_name(source.stem + '-720p.mp4')
    try:
        probe = subprocess.run([ffprobe, '-v', 'error', '-protocol_whitelist', 'file', '-show_streams', '-show_format', '-of', 'json', str(source)], capture_output=True, text=True, timeout=30, check=True, **flags)
        data = json.loads(probe.stdout)
        video = next((stream for stream in data.get('streams', []) if stream.get('codec_type') == 'video'), None)
        duration = 10 if still_image else float(data.get('format', {}).get('duration', video.get('duration', 0) if video else 0))
        if not video or not math.isfinite(duration) or duration <= 0:
            raise ValueError('The video duration could not be verified.')
        if aspect == '9:16' and duration > 60:
            raise ValueError('Portrait reels must be 60 seconds or shorter.')
        width, height = (720, 1280) if aspect == '9:16' else (1280, 720)
        filters = f'scale={width}:{height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1'
        command = [ffmpeg, '-nostdin', '-v', 'error', '-protocol_whitelist', 'file']
        if still_image: command += ['-loop', '1', '-framerate', '30']
        command += ['-i', str(source)]
        if music: command += ['-stream_loop', '-1', '-i', str(music)]
        command += ['-map', '0:v:0', '-map', '1:a:0' if music else '0:a:0?', '-t', str(duration), '-vf', filters, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', str(target)]
        if credit: command[-1:-1] = ['-metadata', 'comment=' + credit]
        subprocess.run(command, capture_output=True, timeout=300, check=True, **flags)
        return target
    except (subprocess.SubprocessError, OSError, json.JSONDecodeError, TypeError, KeyError) as exc:
        target.unlink(missing_ok=True)
        raise ValueError('The video could not be processed. Try a valid MP4 or WebM file.') from exc
