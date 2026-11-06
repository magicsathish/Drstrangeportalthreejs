/**
 * Zero-dependency Web Audio API procedural sound synthesizer for Doctor Strange
 * portal resonance and dimensional traversal feedback.
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a mystical harmonic chord + eldritch whoosh when physically walking through a portal
   */
  public playPortalTraversalWhoosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic chord oscillators (D5, A5, F#5, C#6 mystical lydian resonance)
    const freqs = [293.66, 440.0, 554.37, 659.25];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freqs[i] * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(freqs[i], now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.02, now + 0.85);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.065 / freqs.length, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.92);
    }
  }
}
