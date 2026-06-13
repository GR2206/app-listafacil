import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'assets', 'sounds');

function writeToneMp3(filename, frequency, durationMs) {
  const sampleRate = 44100;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const pcm = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / 120, (sampleCount - i) / 180);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.42;
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), i * 2);
  }

  const wav = encodeWav(pcm, sampleRate);
  writeFileSync(join(outDir, filename), wav);
}

function encodeWav(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize;

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

mkdirSync(outDir, { recursive: true });
writeToneMp3('click.wav', 1320, 70);
writeToneMp3('success.wav', 880, 160);
writeToneMp3('delete.wav', 360, 180);

console.log('Generated click.wav, success.wav, delete.wav');
