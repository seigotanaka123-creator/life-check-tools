const CONTROL_SOUND_URL = new URL('./audio/retro-anime-system02-3-catcher-control.mp3', import.meta.url).href;

// One voice for the physical press, independent of automatic claw animation.
export class CatcherControlSound {
  constructor(getVolume = () => 1) {
    this.getVolume = getVolume;
    this.owners = new Set();
    this.disposed = false;
    this.context = null;
    this.buffer = null;
    this.source = null;
    this.loading = null;
    this.prepare();
  }

  prepare() {
    if (this.disposed || this.buffer || this.loading) return this.loading;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context ||= new AudioContext();
      this.gain ||= this.context.createGain();
      if (!this.connected) {
        this.gain.connect(this.context.destination);
        this.connected = true;
      }
      this.loading = fetch(CONTROL_SOUND_URL)
        .then(response => { if (!response.ok) throw new Error('Sound HTTP ' + response.status); return response.arrayBuffer(); })
        .then(bytes => this.context.decodeAudioData(bytes))
        .then(buffer => { if (!this.disposed) { this.buffer = buffer; this.update(); } })
        .catch(() => { /* A missing sound must not block the controls. */ })
        .finally(() => { this.loading = null; });
    } catch (_) { /* Audio is optional on unsupported devices. */ }
    return this.loading;
  }

  begin(owner) {
    if (this.disposed || document.hidden) return;
    this.owners.add(owner);
    this.prepare();
    // Resume in the input event; a late completion only checks the current hold.
    try { this.context?.resume()?.then(() => this.update()).catch(() => {}); } catch (_) {}
    this.update();
  }

  end(owner) {
    this.owners.delete(owner);
    if (!this.owners.size) this.silence();
  }

  update() {
    let volume = 0;
    try { volume = Math.max(0, Math.min(1, Number(this.getVolume()) || 0)); } catch (_) {}
    if (this.disposed || !this.owners.size || document.hidden || volume === 0) {
      this.silence();
      return;
    }
    if (!this.buffer || this.context?.state !== 'running') return;
    this.gain.gain.value = volume * 0.55;
    if (this.source) return;
    try {
      const source = this.context.createBufferSource();
      source.buffer = this.buffer;
      source.loop = true;
      source.connect(this.gain);
      this.source = source;
      source.onended = () => { source.disconnect(); if (this.source === source) this.source = null; };
      source.start();
    } catch (_) { this.silence(); }
  }

  silence() {
    if (this.gain) this.gain.gain.value = 0;
    const source = this.source;
    this.source = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch (_) {}
      source.disconnect();
    }
  }

  stop() {
    this.owners.clear();
    this.silence();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.gain?.disconnect();
    try { this.context?.close()?.catch(() => {}); } catch (_) {}
    this.buffer = null;
  }
}
