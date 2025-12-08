import { useCallback, useRef, useEffect } from 'react';
import { create } from 'zustand';

/**
 * Sound settings store for global mute state
 */
interface SoundSettings {
    isMuted: boolean;
    volume: number;
    toggleMute: () => void;
    setVolume: (volume: number) => void;
}

export const useSoundSettings = create<SoundSettings>((set) => ({
    isMuted: localStorage.getItem('mtg-sound-muted') === 'true',
    volume: parseFloat(localStorage.getItem('mtg-sound-volume') || '0.5'),

    toggleMute: () => set((state) => {
        const newMuted = !state.isMuted;
        localStorage.setItem('mtg-sound-muted', String(newMuted));
        return { isMuted: newMuted };
    }),

    setVolume: (volume) => {
        localStorage.setItem('mtg-sound-volume', String(volume));
        set({ volume });
    },
}));

/**
 * Audio synthesizer using Web Audio API
 * Generates simple sounds without requiring external files
 */
function createAudioContext(): AudioContext | null {
    try {
        return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
        console.warn('Web Audio API not supported');
        return null;
    }
}

type SoundType = 'cardSnap' | 'shuffle' | 'draw' | 'click' | 'untap' | 'dice' | 'life' | 'graveyard' | 'exile' | 'coin';

/**
 * Sound engine hook using Web Audio API for synthesized sounds
 */
export function useSoundEngine() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const { isMuted, volume } = useSoundSettings();

    // Initialize audio context on first user interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = createAudioContext();
            }
        };

        // Initialize on any user interaction
        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, []);

    const play = useCallback((sound: SoundType) => {
        if (isMuted || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = volume;

        switch (sound) {
            case 'cardSnap': {
                // Crisp snap sound - short burst with quick decay
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.value = 2000;
                filter.Q.value = 10;

                osc.type = 'square';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

                gainNode.gain.setValueAtTime(volume * 0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

                osc.connect(filter);
                filter.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }

            case 'shuffle': {
                // Riffle shuffle sound - multiple short bursts
                for (let i = 0; i < 12; i++) {
                    const t = now + i * 0.03;
                    const noise = ctx.createOscillator();
                    const noiseGain = ctx.createGain();

                    noise.type = 'sawtooth';
                    noise.frequency.value = 100 + Math.random() * 200;

                    noiseGain.gain.setValueAtTime(volume * 0.15, t);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

                    noise.connect(noiseGain);
                    noiseGain.connect(ctx.destination);
                    noise.start(t);
                    noise.stop(t + 0.04);
                }
                break;
            }

            case 'draw': {
                // Subtle slide/whoosh sound
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, now);
                filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

                gainNode.gain.setValueAtTime(volume * 0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(filter);
                filter.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }

            case 'click': {
                // Mechanical click for counters
                const osc = ctx.createOscillator();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);

                gainNode.gain.setValueAtTime(volume * 0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                osc.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.04);
                break;
            }

            case 'untap': {
                // Subtle untap sound - gentle rising tone
                const osc = ctx.createOscillator();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);

                gainNode.gain.setValueAtTime(volume * 0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                osc.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.12);
                break;
            }

            case 'dice': {
                // Dice rolling sound - rattling effect
                for (let i = 0; i < 8; i++) {
                    const t = now + i * 0.04;
                    const osc = ctx.createOscillator();
                    const oscGain = ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.value = 400 + Math.random() * 600;

                    oscGain.gain.setValueAtTime(volume * 0.2, t);
                    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

                    osc.connect(oscGain);
                    oscGain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.06);
                }
                break;
            }

            case 'coin': {
                // Coin flip sound - metallic ping
                const osc = ctx.createOscillator();
                const osc2 = ctx.createOscillator();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(2000, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2500, now);
                osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.25);

                gainNode.gain.setValueAtTime(volume * 0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(gainNode);
                osc2.connect(gainNode);
                osc.start(now);
                osc2.start(now);
                osc.stop(now + 0.35);
                osc2.stop(now + 0.3);
                break;
            }

            case 'life': {
                // Life change - heartbeat-like pulse
                const osc = ctx.createOscillator();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

                gainNode.gain.setValueAtTime(volume * 0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

                osc.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }

            case 'graveyard': {
                // Dark, ominous sound for graveyard
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.value = 400;

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

                gainNode.gain.setValueAtTime(volume * 0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(filter);
                filter.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.35);
                break;
            }

            case 'exile': {
                // Ethereal whoosh for exile
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();

                filter.type = 'highpass';
                filter.frequency.value = 800;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

                gainNode.gain.setValueAtTime(volume * 0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

                osc.connect(filter);
                filter.connect(gainNode);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            }
        }
    }, [isMuted, volume]);

    return { play };
}

export default useSoundEngine;
