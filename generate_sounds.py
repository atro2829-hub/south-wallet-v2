#!/usr/bin/env python3
"""
Generate calm, pleasant notification sounds for the South Wallet app.
Each sound uses sine waves with harmonics for a rich but gentle tone.
Output: 22050 Hz, 16-bit PCM, Mono, max amplitude 0.7
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 22050
MAX_AMPLITUDE = 0.7
BITS_PER_SAMPLE = 16

# Musical note frequencies (Hz)
NOTES = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
    'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
    'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51,
}


def generate_sine(freq, duration, amplitude=1.0, sample_rate=SAMPLE_RATE):
    """Generate a sine wave sample array."""
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        sample = amplitude * math.sin(2 * math.pi * freq * t)
        samples.append(sample)
    return samples


def generate_sine_with_harmonics(freq, duration, amplitude=1.0, harmonics=None, sample_rate=SAMPLE_RATE):
    """Generate a sine wave with harmonics for a richer sound."""
    if harmonics is None:
        harmonics = [(1, 1.0), (2, 0.3), (3, 0.1)]  # fundamental + 2 harmonics
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        sample = 0.0
        for harmonic_num, harmonic_amp in harmonics:
            sample += harmonic_amp * math.sin(2 * math.pi * freq * harmonic_num * t)
        # Normalize by sum of harmonic amplitudes
        total_amp = sum(a for _, a in harmonics)
        sample = sample / total_amp * amplitude
        samples.append(sample)
    return samples


def apply_envelope(samples, attack=0.01, decay=0.05, sustain_level=0.7, release=0.1, sample_rate=SAMPLE_RATE):
    """Apply ADSR envelope to samples."""
    num_samples = len(samples)
    attack_samples = int(attack * sample_rate)
    decay_samples = int(decay * sample_rate)
    release_samples = int(release * sample_rate)
    
    result = samples[:]
    for i in range(num_samples):
        if i < attack_samples:
            # Attack: ramp up
            factor = i / max(attack_samples, 1)
        elif i < attack_samples + decay_samples:
            # Decay: ramp down to sustain level
            decay_progress = (i - attack_samples) / max(decay_samples, 1)
            factor = 1.0 - (1.0 - sustain_level) * decay_progress
        elif i < num_samples - release_samples:
            # Sustain: hold at sustain level
            factor = sustain_level
        else:
            # Release: ramp down to zero
            release_progress = (i - (num_samples - release_samples)) / max(release_samples, 1)
            factor = sustain_level * (1.0 - release_progress)
        
        result[i] = samples[i] * max(factor, 0.0)
    
    return result


def apply_exponential_decay(samples, decay_rate=3.0, sample_rate=SAMPLE_RATE):
    """Apply exponential decay envelope - good for bell/ding sounds."""
    num_samples = len(samples)
    result = samples[:]
    duration = num_samples / sample_rate
    for i in range(num_samples):
        t = i / sample_rate
        factor = math.exp(-decay_rate * t)
        result[i] = samples[i] * factor
    return result


def apply_fade_in(samples, duration=0.01, sample_rate=SAMPLE_RATE):
    """Apply fade-in to avoid clicks."""
    fade_samples = int(duration * sample_rate)
    result = samples[:]
    for i in range(min(fade_samples, len(result))):
        result[i] = result[i] * (i / fade_samples)
    return result


def apply_fade_out(samples, duration=0.02, sample_rate=SAMPLE_RATE):
    """Apply fade-out to avoid clicks."""
    fade_samples = int(duration * sample_rate)
    result = samples[:]
    for i in range(min(fade_samples, len(result))):
        idx = len(result) - 1 - i
        result[idx] = result[idx] * (i / fade_samples)
    return result


def mix_samples(*sample_lists):
    """Mix multiple sample arrays together (all must be same length or will be padded with zeros)."""
    max_len = max(len(s) for s in sample_lists)
    result = [0.0] * max_len
    for samples in sample_lists:
        for i in range(len(samples)):
            result[i] += samples[i]
    return result


def concatenate_samples(*sample_lists):
    """Concatenate multiple sample arrays."""
    result = []
    for samples in sample_lists:
        result.extend(samples)
    return result


def add_silence(samples, duration, sample_rate=SAMPLE_RATE):
    """Add silence to the beginning or end of samples."""
    silence = [0.0] * int(sample_rate * duration)
    return silence + samples


def normalize_samples(samples, max_amp=MAX_AMPLITUDE):
    """Normalize samples so the peak is at max_amp."""
    peak = max(abs(s) for s in samples) if samples else 1.0
    if peak == 0:
        return samples
    factor = max_amp / peak
    return [s * factor for s in samples]


def samples_to_wav(samples, filepath, sample_rate=SAMPLE_RATE):
    """Convert sample array to WAV file."""
    # Clip samples
    samples = [max(-1.0, min(1.0, s)) for s in samples]
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(BITS_PER_SAMPLE // 8)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Convert float samples to 16-bit integers
        data = b''
        for sample in samples:
            int_sample = int(sample * (2 ** (BITS_PER_SAMPLE - 1) - 1))
            int_sample = max(-(2 ** (BITS_PER_SAMPLE - 1)), min(2 ** (BITS_PER_SAMPLE - 1) - 1, int_sample))
            data += struct.pack('<h', int_sample)
        
        wav_file.writeframes(data)
    
    file_size = os.path.getsize(filepath)
    print(f"  Created: {filepath} ({file_size} bytes, {len(samples)/sample_rate:.2f}s)")


def generate_success():
    """Pleasant ascending chime - C5-E5-G5 major chord arpeggio, ~1s"""
    print("Generating success.wav (C5-E5-G5 arpeggio)...")
    
    # Each note plays with overlap for a chime effect
    note_duration = 0.6
    note_spacing = 0.2  # Time between note starts
    
    harmonics = [(1, 1.0), (2, 0.25), (3, 0.08), (4, 0.03)]
    
    # C5
    c5 = generate_sine_with_harmonics(NOTES['C5'], note_duration, 0.8, harmonics)
    c5 = apply_exponential_decay(c5, decay_rate=4.0)
    c5 = add_silence(c5, 0.0)
    
    # E5 (starts 0.2s later)
    e5 = generate_sine_with_harmonics(NOTES['E5'], note_duration, 0.8, harmonics)
    e5 = apply_exponential_decay(e5, decay_rate=4.0)
    e5 = add_silence(e5, note_spacing)
    
    # G5 (starts 0.4s later)
    g5 = generate_sine_with_harmonics(NOTES['G5'], note_duration, 0.9, harmonics)
    g5 = apply_exponential_decay(g5, decay_rate=3.5)
    g5 = add_silence(g5, note_spacing * 2)
    
    # High C6 (starts 0.55s later, softer, adds sparkle)
    c6 = generate_sine_with_harmonics(NOTES['C6'], 0.5, 0.4, harmonics)
    c6 = apply_exponential_decay(c6, decay_rate=5.0)
    c6 = add_silence(c6, note_spacing * 2.75)
    
    mixed = mix_samples(c5, e5, g5, c6)
    mixed = apply_fade_out(mixed, 0.05)
    mixed = normalize_samples(mixed)
    return mixed


def generate_deposit():
    """Gentle cash-register style ding, ~0.5s"""
    print("Generating deposit.wav (gentle ding)...")
    
    # A bright but soft ding - uses E5 with quick attack and moderate decay
    harmonics = [(1, 1.0), (2, 0.4), (3, 0.15), (5, 0.05)]
    
    ding = generate_sine_with_harmonics(NOTES['E5'], 0.5, 0.9, harmonics)
    ding = apply_envelope(ding, attack=0.003, decay=0.05, sustain_level=0.5, release=0.15)
    ding = apply_exponential_decay(ding, decay_rate=5.5)
    
    # Add a subtle octave higher for sparkle
    sparkle = generate_sine_with_harmonics(NOTES['E6'], 0.3, 0.25, [(1, 1.0), (2, 0.2)])
    sparkle = apply_exponential_decay(sparkle, decay_rate=7.0)
    
    mixed = mix_samples(ding, sparkle)
    mixed = apply_fade_out(mixed, 0.03)
    mixed = normalize_samples(mixed)
    return mixed


def generate_transfer():
    """Soft whoosh with chime, ~0.8s"""
    print("Generating transfer.wav (whoosh + chime)...")
    
    # Whoosh sound: filtered noise-like effect using multiple detuned oscillators
    whoosh_duration = 0.5
    whoosh_samples = int(SAMPLE_RATE * whoosh_duration)
    whoosh = []
    for i in range(whoosh_samples):
        t = i / SAMPLE_RATE
        # Multiple detuned frequencies create a swooshing texture
        s = 0.0
        s += 0.3 * math.sin(2 * math.pi * 300 * t + 3 * math.sin(2 * math.pi * 50 * t))
        s += 0.2 * math.sin(2 * math.pi * 450 * t + 2 * math.sin(2 * math.pi * 80 * t))
        s += 0.15 * math.sin(2 * math.pi * 600 * t + 1.5 * math.sin(2 * math.pi * 120 * t))
        whoosh.append(s)
    
    # Apply envelope that rises then falls quickly
    for i in range(len(whoosh)):
        t = i / SAMPLE_RATE
        # Bell-shaped curve
        envelope = math.exp(-((t - 0.15) ** 2) / (2 * 0.08 ** 2))
        whoosh[i] *= envelope * 0.5
    
    whoosh = apply_fade_in(whoosh, 0.01)
    whoosh = apply_fade_out(whoosh, 0.02)
    
    # Chime at the end
    harmonics = [(1, 1.0), (2, 0.3), (3, 0.1)]
    chime = generate_sine_with_harmonics(NOTES['G5'], 0.5, 0.7, harmonics)
    chime = apply_exponential_decay(chime, decay_rate=4.5)
    chime = add_silence(chime, 0.3)
    
    mixed = mix_samples(whoosh, chime)
    mixed = apply_fade_out(mixed, 0.03)
    mixed = normalize_samples(mixed)
    return mixed


def generate_withdraw():
    """Descending gentle tone, ~0.6s"""
    print("Generating withdraw.wav (descending tone)...")
    
    # Descending from E5 to C5
    duration = 0.6
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    harmonics = [(1, 1.0), (2, 0.2), (3, 0.08)]
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration  # 0 to 1
        
        # Frequency descends from E5 to C5
        freq = NOTES['E5'] + (NOTES['C5'] - NOTES['E5']) * progress
        
        sample = 0.0
        total_amp = sum(a for _, a in harmonics)
        for harmonic_num, harmonic_amp in harmonics:
            sample += harmonic_amp * math.sin(2 * math.pi * freq * harmonic_num * t)
        sample = sample / total_amp
        
        # Exponential decay
        envelope = math.exp(-3.5 * t) * 0.8
        samples.append(sample * envelope)
    
    samples = apply_fade_out(samples, 0.03)
    samples = normalize_samples(samples)
    return samples


def generate_notification():
    """Simple clean ping, ~0.4s"""
    print("Generating notification.wav (clean ping)...")
    
    harmonics = [(1, 1.0), (2, 0.15), (3, 0.05)]
    
    ping = generate_sine_with_harmonics(NOTES['A5'], 0.4, 0.8, harmonics)
    ping = apply_exponential_decay(ping, decay_rate=7.0)
    ping = apply_fade_in(ping, 0.002)
    ping = apply_fade_out(ping, 0.02)
    ping = normalize_samples(ping)
    return ping


def generate_order():
    """Quick double-ping, ~0.5s"""
    print("Generating order.wav (double-ping)...")
    
    harmonics = [(1, 1.0), (2, 0.2), (3, 0.06)]
    
    # First ping - slightly higher
    ping1 = generate_sine_with_harmonics(NOTES['D5'], 0.25, 0.7, harmonics)
    ping1 = apply_exponential_decay(ping1, decay_rate=7.0)
    
    # Short silence
    silence = [0.0] * int(SAMPLE_RATE * 0.08)
    
    # Second ping - slightly lower
    ping2 = generate_sine_with_harmonics(NOTES['C5'], 0.3, 0.75, harmonics)
    ping2 = apply_exponential_decay(ping2, decay_rate=6.5)
    
    combined = concatenate_samples(ping1, silence, ping2)
    combined = apply_fade_in(combined, 0.002)
    combined = apply_fade_out(combined, 0.02)
    combined = normalize_samples(combined)
    return combined


def generate_promo():
    """Happy jingle - ascending notes, ~1.2s"""
    print("Generating promo.wav (happy ascending jingle)...")
    
    harmonics = [(1, 1.0), (2, 0.25), (3, 0.08)]
    
    # Ascending sequence: C5, D5, E5, G5, C6 - happy major scale fragment
    note_sequence = ['C5', 'D5', 'E5', 'G5', 'C6']
    note_durations = [0.15, 0.15, 0.15, 0.2, 0.55]  # Last note sustains longer
    note_spacing = 0.15  # Time between note onsets
    note_amplitudes = [0.6, 0.65, 0.7, 0.75, 0.85]
    
    all_notes = []
    current_offset = 0.0
    
    for i, (note_name, dur, amp) in enumerate(zip(note_sequence, note_durations, note_amplitudes)):
        note = generate_sine_with_harmonics(NOTES[note_name], dur, amp, harmonics)
        note = apply_exponential_decay(note, decay_rate=3.5)
        note = add_silence(note, current_offset)
        all_notes.append(note)
        current_offset += note_spacing
    
    mixed = mix_samples(*all_notes)
    mixed = apply_fade_in(mixed, 0.005)
    mixed = apply_fade_out(mixed, 0.04)
    mixed = normalize_samples(mixed)
    return mixed


def generate_security():
    """Alert but not alarming tone, ~0.6s"""
    print("Generating security.wav (alert tone)...")
    
    # Two-tone alert: a slightly dissonant but gentle interval
    # Using a minor third interval (C5 to Eb5/D#5) which creates gentle tension
    harmonics = [(1, 1.0), (2, 0.15), (3, 0.05)]
    
    # First tone
    tone1 = generate_sine_with_harmonics(NOTES['C5'], 0.25, 0.7, harmonics)
    tone1 = apply_envelope(tone1, attack=0.005, decay=0.03, sustain_level=0.6, release=0.08)
    
    # Short gap
    silence = [0.0] * int(SAMPLE_RATE * 0.06)
    
    # Second tone - a fourth up (F5) - creates a gentle "attention" feel
    tone2 = generate_sine_with_harmonics(NOTES['F5'], 0.35, 0.75, harmonics)
    tone2 = apply_envelope(tone2, attack=0.005, decay=0.03, sustain_level=0.6, release=0.12)
    
    combined = concatenate_samples(tone1, silence, tone2)
    combined = apply_fade_in(combined, 0.003)
    combined = apply_fade_out(combined, 0.02)
    combined = normalize_samples(combined)
    return combined


def main():
    output_dirs = [
        '/home/z/my-project/public/sounds',
        '/home/z/my-project/south-admin/public/sounds',
        '/home/z/my-project/south-dev/public/sounds',
    ]
    
    # Create output directories if they don't exist
    for d in output_dirs:
        os.makedirs(d, exist_ok=True)
    
    # Generate all sounds
    sounds = {
        'success.wav': generate_success,
        'deposit.wav': generate_deposit,
        'transfer.wav': generate_transfer,
        'withdraw.wav': generate_withdraw,
        'notification.wav': generate_notification,
        'order.wav': generate_order,
        'promo.wav': generate_promo,
        'security.wav': generate_security,
    }
    
    for filename, generator_func in sounds.items():
        print(f"\n--- {filename} ---")
        samples = generator_func()
        
        for output_dir in output_dirs:
            filepath = os.path.join(output_dir, filename)
            samples_to_wav(samples, filepath)
    
    print("\n✅ All sounds generated successfully!")
    print(f"   Total: {len(sounds)} sound files × {len(output_dirs)} directories = {len(sounds) * len(output_dirs)} files")


if __name__ == '__main__':
    main()
