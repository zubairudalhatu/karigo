const fs = require("node:fs");
const path = require("node:path");

const sampleRate = 44_100;

function wav(samples) {
  const dataSize = samples.length * 2;
  const output = Buffer.alloc(44 + dataSize);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + dataSize, 4);
  output.write("WAVE", 8);
  output.write("fmt ", 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  return output;
}

function tone(durationSeconds, notes) {
  const samples = new Array(Math.round(durationSeconds * sampleRate)).fill(0);
  for (const note of notes) {
    const start = Math.round(note.start * sampleRate);
    const end = Math.min(samples.length, Math.round((note.start + note.duration) * sampleRate));
    for (let index = start; index < end; index += 1) {
      const local = (index - start) / sampleRate;
      const attack = Math.min(1, local / 0.025);
      const release = Math.min(1, Math.max(0, (note.duration - local) / 0.08));
      const envelope = attack * release;
      const fundamental = Math.sin(2 * Math.PI * note.frequency * local);
      const harmonic = Math.sin(2 * Math.PI * note.frequency * 2 * local) * 0.16;
      samples[index] += (fundamental + harmonic) * envelope * (note.volume ?? 0.28);
    }
  }
  return wav(samples);
}

const callNotes = [];
for (let cycle = 0; cycle < 4; cycle += 1) {
  const start = cycle * 2;
  callNotes.push(
    { start, duration: 0.34, frequency: 523.25 },
    { start: start + 0.38, duration: 0.34, frequency: 659.25 },
    { start: start + 0.76, duration: 0.54, frequency: 783.99 },
    { start: start + 1.34, duration: 0.28, frequency: 659.25, volume: 0.22 }
  );
}

const messageNotes = [
  { start: 0, duration: 0.16, frequency: 659.25, volume: 0.24 },
  { start: 0.13, duration: 0.22, frequency: 987.77, volume: 0.26 }
];

for (const app of ["customer-app", "rider-app"]) {
  const directory = path.join(__dirname, "..", "apps", app, "assets", "sounds");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "karigo-ride-call.wav"), tone(8, callNotes));
  fs.writeFileSync(path.join(directory, "karigo-message.wav"), tone(0.42, messageNotes));
}

process.stdout.write("Generated original KariGO Ride call and message notification sounds.\n");
