"""Original deterministic lo-fi score; no recordings, samples or third party music.
Creates gapless PCM masters and local Ogg/Vorbis assets. Music and score: CC0 1.0.
"""
import json, math, pathlib, sys, wave, subprocess
import numpy as np
sys.path.insert(0, str(pathlib.Path('output/tools').resolve()))
import imageio_ffmpeg

RATE = 22050
tracks = json.loads(pathlib.Path('shared/lofi-tracks.json').read_text(encoding='utf-8'))
out = pathlib.Path('public/audio'); out.mkdir(parents=True, exist_ok=True)
masters = pathlib.Path('output/revisio-v3/audio'); masters.mkdir(parents=True, exist_ok=True)
report = []
for index, track in enumerate(tracks):
    beat = 60 / track['bpm']; length = round(24 * 4 * beat * RATE)
    mix = np.zeros((length,2), dtype=np.float64)
    rng = np.random.default_rng(20261010 + index)
    def add(signal, at, amplitude, pan=0):
        start = round(at * RATE); positions = (start + np.arange(len(signal))) % length
        mix[positions,0] += signal * amplitude * math.sqrt((1-pan)/2)
        mix[positions,1] += signal * amplitude * math.sqrt((1+pan)/2)
    def key(midi, at, duration, amplitude, pan=0, pad=False):
        t = np.arange(round(duration*RATE)) / RATE; freq = 440 * 2**((midi-69)/12)
        if pad:
            env = np.minimum(t/.25,1) * np.maximum(0,1-t/duration)**1.3
            signal = (np.sin(2*np.pi*freq*t) + .12*np.sin(2*np.pi*freq*2*t)) * env
        else:
            env = (1-np.exp(-t/.008)) * np.exp(-t/(duration/4)) * np.minimum((duration-t)/.04,1)
            signal = (np.sin(2*np.pi*freq*t + .008*np.sin(2*np.pi*3*t)) + .18*np.sin(2*np.pi*freq*2*t)*np.exp(-t/.45) + .025*np.sin(2*np.pi*freq*3*t)*np.exp(-t/.15)) * env
        add(signal,at,amplitude,pan)
    for bar in range(24):
        chord = track['chords'][bar % 4]; at = bar * 4 * beat
        for voice, note in enumerate(chord):
            key(note, at + voice*.012, 3.5*beat, .052, (voice-2)*.19)
            key(note+12, at, 4.8*beat, .009, (2-voice)*.12, True)
        for position in [0,2.5]: key(chord[0]-12, at+position*beat, 1.6*beat, .095)
        for step in range(8):
            swing = .055*beat if step % 2 else 0
            when = at + step*beat/2 + swing
            note = track['melody'][(step + (bar//4)*2) % 8]
            if note >= 0 and (bar % 4 != 3 or step < 5): key(chord[note]+12,when,1.6*beat,.028,(step%3-1)*.3)
            t = np.arange(round(.07*RATE))/RATE
            noise = rng.standard_normal(t.size)
            hat = np.diff(noise,prepend=0)*np.exp(-t/.018)
            add(hat,when,.004 if step%2 else .006,.28)
        for b in [0,2]:
            t=np.arange(round(.27*RATE))/RATE
            phase=2*np.pi*(44*t + 48*.045*(1-np.exp(-t/.045)))
            kick=np.sin(phase)*np.exp(-t/.065)*(1-np.exp(-t/.003))
            add(kick,at+b*beat,.13)
        for b in [1,3]:
            t=np.arange(round(.18*RATE))/RATE; noise=rng.standard_normal(t.size)
            snare=np.convolve(noise,np.ones(9)/9,mode='same')*np.exp(-t/.045)*(1-np.exp(-t/.002))
            add(snare,at+b*beat+.012,.035,-.12)
    dry=mix.copy()
    for delay,gain in [(.173,.12),(.271,.09),(.389,.06)]:
        mix += np.roll(dry,round(delay*RATE),axis=0)[:,::-1]*gain
    mix=np.tanh(mix*1.2)
    mix *= .78/max(np.max(np.abs(mix)),.01)
    pcm=np.round(mix*32767).astype('<i2')
    wav=masters/(track['id']+'.wav')
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(pcm.tobytes())
    target=out/(track['id']+'.ogg')
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-i',str(wav),'-c:a','libvorbis','-q:a','4','-y',str(target)],check=True)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-i',str(wav),'-c:a','libmp3lame','-q:a','3','-y',str(target.with_suffix('.mp3'))],check=True)
    rms=float(np.sqrt(np.mean(mix**2)))
    entry={'id':track['id'],'seconds':length/RATE,'peak':float(np.max(np.abs(mix))),'rms_db':20*math.log10(rms),'loop_boundary_delta':float(np.max(np.abs(mix[0]-mix[-1]))),'finite':bool(np.isfinite(mix).all()),'bytes':target.stat().st_size}
    report.append(entry); print(json.dumps(entry),flush=True)
(masters/'quality.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
# Five excerpts, one per composition, for a single listening review.
chunks=[]
for track in tracks:
    with wave.open(str(masters/(track['id']+'.wav')),'rb') as f:
        f.setpos(8*RATE); chunks.append(f.readframes(5*RATE))
with wave.open(str(masters/'mostra-cinc-lofi.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(b''.join(chunks))
