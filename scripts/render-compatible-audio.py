"""Build and fully decode local MP3 alternatives for all study tracks, including Safari/iOS."""
from pathlib import Path
import concurrent.futures, hashlib, json, re, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'output/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
originals = json.loads((ROOT / 'shared/lofi-tracks.json').read_text(encoding='utf-8'))
additions = json.loads((ROOT / 'shared/music-tracks.json').read_text(encoding='utf-8'))
tracks = originals + additions
report_dir = ROOT / 'output/security-compat'
report_dir.mkdir(parents=True, exist_ok=True)

def render(track):
    source = ROOT / 'public/audio' / (track['id'] + '.ogg')
    target = source.with_suffix('.mp3')
    duration = track.get('duration', '0:00').split(':')
    encoding = ['-b:a', '96k'] if int(duration[0])*60 + int(duration[1]) > 600 else ['-q:a', '3']
    subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-i', str(source), '-vn', '-ar', '44100', '-c:a', 'libmp3lame', *encoding, '-metadata', 'title='+track['title'], '-metadata', 'artist='+track.get('author', 'La Net'), '-metadata', 'license='+track.get('licenseUrl', 'https://creativecommons.org/publicdomain/zero/1.0/'), '-y', str(target)], check=True)
    decoded = subprocess.run([str(FFMPEG), '-hide_banner', '-i', str(target), '-f', 'null', '-'], check=True, capture_output=True, text=True)
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', decoded.stderr)
    assert match, track['id']
    seconds = int(match[1])*3600 + int(match[2])*60 + float(match[3])
    assert seconds > 60 and 100000 < target.stat().st_size < 25 * 1024 * 1024
    result = dict(id=track['id'], bytes=target.stat().st_size, seconds=seconds, fully_decoded=True, sha256=hashlib.sha256(target.read_bytes()).hexdigest())
    print(track['id'] + ': MP3 complet i descodificat.', flush=True)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    reports = list(pool.map(render, tracks))
(report_dir / 'mp3-verification.json').write_text(json.dumps(reports, indent=2)+'\n', encoding='utf-8')
