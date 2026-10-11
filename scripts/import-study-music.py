"""Import complete licensed tracks from the official source, with auditable local formats.
Use --genre focus --report-dir output/focus-music to add only the new Focus selection.
Existing files/reports outside the selection remain untouched. No production media requests.
"""
import argparse, concurrent.futures, hashlib, json, pathlib, re, subprocess, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('ffmpeg', nargs='?', default=str(ROOT / 'output/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'))
parser.add_argument('--genre')
parser.add_argument('--report-dir', default='output/music-library')
parser.add_argument('--workers', type=int, choices=range(1, 9), default=3)
args = parser.parse_args()
FFMPEG = pathlib.Path(args.ffmpeg)
tracks = json.loads((ROOT / 'shared/music-tracks.json').read_text(encoding='utf-8'))
selection = [t for t in tracks if not args.genre or t['genre'] == args.genre]
if not selection:
    raise ValueError('No tracks selected')
cache = ROOT / '.cache/music-downloads'
cache.mkdir(parents=True, exist_ok=True)
out = ROOT / 'public/audio'
report_dir = ROOT / args.report_dir
report_dir.mkdir(parents=True, exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path, expected):
    result = subprocess.run([str(FFMPEG), '-hide_banner', '-i', str(path), '-f', 'null', '-'], check=True, capture_output=True, text=True)
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
    if not match:
        raise ValueError('Missing decoded duration: ' + path.name)
    seconds = int(match[1])*3600 + int(match[2])*60 + float(match[3])
    if abs(seconds - expected) > 5 or not 100000 < path.stat().st_size < 25 * 1024 * 1024:
        raise ValueError('Incomplete or oversized recording: ' + path.name)
    return dict(bytes=path.stat().st_size, seconds=seconds, sha256=sha(path), fully_decoded=True)

def import_track(track):
    if not track['download'].startswith('https://incompetech.com/music/royalty-free/mp3-royaltyfree/'):
        raise ValueError('Unexpected music source')
    source = cache / (track['id'] + '.mp3')
    if not source.exists():
        print(track['id'] + ': descarregant des de la font oficial...', flush=True)
        temporary = source.with_suffix('.part')
        offset = temporary.stat().st_size if temporary.exists() else 0
        request = urllib.request.Request(track['download'], headers={'Range': f'bytes={offset}-'} if offset else {})
        with urllib.request.urlopen(request, timeout=60) as response:
            if not response.geturl().startswith('https://incompetech.com/'):
                raise ValueError('Unexpected download redirect')
            if offset and response.status == 206 and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                raise ValueError('Unexpected resumed range')
            resumed = offset and response.status == 206
            received = offset if resumed else 0
            with temporary.open('ab' if resumed else 'wb') as target:
                while chunk := response.read(1024 * 1024):
                    target.write(chunk)
                    received += len(chunk)
                    if received > 300 * 1024 * 1024:
                        raise ValueError('Unexpected source size')
                    if received % (10 * 1024 * 1024) == 0:
                        print(f"{track['id']}: {received // (1024*1024)} MiB rebuts", flush=True)
            temporary.replace(source)
    minutes, remainder = map(int, track['duration'].split(':'))
    expected = minutes * 60 + remainder
    long_track = expected > 10 * 60
    metadata = ['-metadata', 'title='+track['title'], '-metadata', 'artist='+track['author'], '-metadata', 'license='+track['licenseUrl']]
    ogg = out / (track['id'] + '.ogg')
    subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-i', str(source), '-vn', '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '2' if long_track else '4', *metadata, '-y', str(ogg)], check=True)
    ogg_report = decode(ogg, expected)
    mp3 = ogg.with_suffix('.mp3')
    encoding = ['-b:a', '96k'] if long_track else ['-q:a', '3']
    subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-i', str(ogg), '-vn', '-ar', '44100', '-c:a', 'libmp3lame', *encoding, *metadata, '-y', str(mp3)], check=True)
    mp3_report = decode(mp3, expected)
    report = dict(id=track['id'], source=track['source'], license=track['license'], original_sha256=sha(source), **ogg_report, mp3=mp3_report)
    print(track['id'] + ': Ogg i MP3 complets i descodificats.', flush=True)
    return report

with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
    reports = list(pool.map(import_track, selection))
(report_dir / 'audio-import.json').write_text(json.dumps(reports, indent=2)+'\n', encoding='utf-8')
# Maintain the library manifest without regenerating established recordings.
master_path = ROOT / 'output/music-library/audio-import.json'
previous = json.loads(master_path.read_text(encoding='utf-8')) if master_path.exists() else []
by_id = {row['id']: row for row in previous + reports}
master_path.parent.mkdir(parents=True, exist_ok=True)
master_path.write_text(json.dumps([by_id[t['id']] for t in tracks if t['id'] in by_id], indent=2)+'\n', encoding='utf-8')
mp3_path = ROOT / 'output/security-compat/mp3-verification.json'
mp3_previous = json.loads(mp3_path.read_text(encoding='utf-8')) if mp3_path.exists() else []
mp3_by_id = {row['id']: row for row in mp3_previous + [dict(id=row['id'], **row['mp3']) for row in reports]}
mp3_path.parent.mkdir(parents=True, exist_ok=True)
mp3_path.write_text(json.dumps(list(mp3_by_id.values()), indent=2)+'\n', encoding='utf-8')
credits = '\n\n'.join(f"{t['title']} — {t['author']}\nComposició: {t['composer']}\nFont: {t['source']}\nLlicència: {t['license']} — {t['licenseUrl']}\nCanvis: {t['changes']}" for t in tracks)
originals = json.loads((ROOT / 'shared/lofi-tracks.json').read_text(encoding='utf-8'))
original_credit = 'Peces originals de La Net: ' + ', '.join(t['title'] for t in originals) + '.\nCC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/\nPartitures: shared/lofi-tracks.json; generador: scripts/render-lofi.py.\n\n'
(out / 'CREDITS.txt').write_text('La Net · crèdits musicals\n\n'+original_credit+'Llicència del catàleg oficial: https://incompetech.com/music/royalty-free/licenses/\nComprovada el 2026-10-11.\n\n'+credits+'\n\nFormats: Ogg/Vorbis i MP3 per a compatibilitat amb Safari/iOS. Peces completes; volum normalitzat.\n', encoding='utf-8')
