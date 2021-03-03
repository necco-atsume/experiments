import { WAVE100, DRUMS } from "./wavetable.js";
import { MOONSONG } from "./moonsong.js";

const SAMPLE_RATE = 44100;
const WAVETABLE_ENTRY_SIZE = 256;
const PI_NOTE_LENGTH_SAMPLES = 256;
const PITCH_BEND_NORMALIZATION_FACTOR = 1000;

const POINT_FREQUENCIES = [
  33408, //C
  35584, //C#
  37632, //D
  39808, //D#
  42112, //E
  44672, //F
  47488, //F#
  50048, //G
  52992, //G#
  56320, //A
  59648, //A#
  63232, //B
];

const KEYS_IN_OCTAVE = 12;

const OCTAVE_REPEAT_TIMES = [4, 2, 2, 2, 2, 2, 2, 2];
const OCTAVE_ADVANCE_POINTS = [1, 1, 2, 4, 8, 16, 32, 64];

const clamp = (v) => {
  if (v > 1) {
    return 1;
  } else if (v < -1) {
    return -1;
  } else {
    return v;
  }
};

class BufferStream {
  constructor(buffer) {
    this.data = buffer;
    this.position = 0;
  }

  skip = (n) => (this.position += n);

  // All are unsigned unless specified.
  nextByte = () => {
    const value = this.data[this.position];
    this.position += 1;
    return value;
  };

  nextSignedByte = () => {
    const value = this.data[this.position];
    const isNegative = (value & 0x80) == 0x80;
    if (isNegative) {
      return ((~value & 0xff) + 1) * -1;
    } else {
      return value;
    }
  };

  nextShort = () => {
    const hi = this.data[this.position];
    const lo = this.data[this.position + 1];
    const value = lo | (hi << 8);

    this.position += 2;

    return value;
  };

  nextInt = () => {
    const hihi = this.data[this.position];
    const hilo = this.data[this.position + 1];
    const lohi = this.data[this.position + 2];
    const lolo = this.data[this.position + 3];

    const value = lolo | (lohi << 8) | (hilo << 16) | (hihi << 24);

    this.position += 4;
    return value;
  };

  nextBigEndianSignedShort = () => {
    const lo = this.data[this.position];
    const hi = this.data[this.position + 1];
    const value = lo | (hi << 8);
    const isNegative = (value & 0x8000) == 0x8000;
    if (isNegative) {
      return ((~value & 0xffff) + 1) * -1;
    } else {
      return value;
    }
  };

  nextWavetable = () => {
    const table = this.data.slice(this.position, this.position + WAVETABLE_ENTRY_SIZE);
    this.position += WAVETABLE_ENTRY_SIZE;
    return table;
  };

  asDrumSample = () => {
    const samples = [];
    while (this.position < this.data.length) {
      samples.push(stream.nextBigEndianSignedShort());
    }
    return samples;
  };
}

const streamFromArrayBuffer = (buffer) => new BufferStream(buffer);

const beatToSample = (wait) => (beat) => {
  const samplesPerMsec = SAMPLE_RATE / 1000;
  const samplesPerBeat = samplesPerMsec * wait;
  return beat * samplesPerBeat;
};

// Warning: It's late and I've already written this code in OrgPlay before. Here be dragons.

const parseOrgFileFromBuffer = (buffer) => {
  let stream = streamFromArrayBuffer(buffer);

  stream.skip(6); // Header

  // Wait in msec between beats.
  const wait = stream.nextByte();

  const sampleTime = beatToSample(wait);

  stream.skip(2); // Time signature.

  const songStart = sampleTime(stream.nextInt());
  const songEnd = sampleTime(stream.nextInt());

  let instruments = [];

  // 16 Instrument blocks
  for (let i = 0; i < 16; i++) {
    const voice = stream.nextShort();
    const instrument = stream.nextByte();
    const pi = stream.nextByte() != 0;
    const noteCount = stream.nextShort();

    instruments.push({ voice, instrument, pi, noteCount });
  }

  for (let i = 0; i < 16; i++) {
    instruments[i].notes = [];

    // Org format interprets 0xff as what was on the previous note.
    let lastPitch = 0;
    let lastLength = 0;
    let lastVolume = 0;
    let lastPan = 0;

    for (let n = 0; n < instruments[i].noteCount; n++) {
      const beat = stream.nextInt(); // # of beat in the song.

      let pitch = stream.nextByte();
      if (pitch == 0xff) pitch = lastPitch;
      lastPitch = pitch;

      const length = stream.nextByte();
      if (length == 0xff) length = lastLength;
      lastLength = length;

      const volume = stream.nextByte();
      if (volume == 0xff) volume = lastVolume;
      lastVolume = volume;

      const pan = stream.nextByte();
      if (pan == 0xff) pan = lastPan;
      lastPan = pan;

      const start = sampleTime(beat);
      const end = start + sampleTime(length);

      const pitchIndex = Math.floor(pitch % KEYS_IN_OCTAVE);
      const octave = Math.floor(pitch / KEYS_IN_OCTAVE);

      const pitchBend = instrument.voice - PITCH_BEND_NORMALIZATION_FACTOR;

      speed = (POINT_FREQUENCIES[pitchIndex] + pitchBend) / SAMPLE_RATE;

      instruments[i].notes.push({
        start,
        end,
        pitch,
        volume,
        pan,
        octave,
        speed,
      });
      instruments[i].notes.sort((l, r) => l.start - r.start); // Sanity check just in case they're not sorted.
    }
  }
  return { songStart, songEnd, instruments };
};

const base64ToByteBuffer = (str) => {
  const strDecoded = atob(str);
  const bytes = [];
  for (let i = 0; i < strDecoded.length; i++) {
    bytes.push(strDecoded.charCodeAt(i));
  }
  return bytes;
};

const parseWavetable = () => {
  const instruments = [];
  const stream = new BufferStream(base64ToByteBuffer(WAVE100));
  for (let i = 0; i < 100; i++) {
    instruments.push(stream.nextWavetable().map((sbyte) => sbyte / 128)); // FIXME: Off-by-one here because this is +127/-128?
  }
  return instruments;
};

const parseDrum = (drum) => {
  const stream = new BufferStream(base64ToByteBuffer(drum));
  const sample = stream.asDrumSample().map((short) => short / 32767); // See above: Off by one?
  const doubled = sample.map((s) => [s, s]); // HACK: Drums are sampled at half the sample rate of wavetable instruments. Double up.
  return doubled.flat();
};

class OrganyaPlayer {
  constructor(song) {
    const initialState = () => ({
      noteIndex: 0,
      wavetableOffset: 0,
      samplesPlayed: 0,
    });

    this.song = song;
    this.wavetable = parseWavetable();
    this.drums = DRUMS.map(parseDrum);
    this.sample = 0;
    this.state = [];
    for (let i = 0; i < 16; i++) {
      this.state.push(initialState());
    }
  }

  runSteps = (n) => {
    const buffer = [];
    for (let i = 0; i < n; i++) {
      buffer.push(step());
    }
    return buffer;
  };

  step = () => {
    for (let i = 0; i < 16; i++) {
      if (i >= 8) {
        buffer.push(this.stepDrum(i));
      } else {
        buffer.push(this.stepInstrument(i));
      }
    }

    return clamp(buffer.reduce((l, r) => [l[0] + r[0], l[1] + r[1]], [0, 0]));
  };

  stepDrum = (_) => {
    return [0, 0];
  };

  stepInstrument = (n) => {
    const instrument = this.song.instruments[n];
    const noteIndex = this.state[n].noteIndex;

    const note = noteIndex >= instrument.notes.length ? null : instrument.notes[noteIndex];

    let left = 0;
    let right = 0;

    if (note != null && this.sample > note.start) {
      const { pi } = instrument;
      const instrumentIndex = instrument.instrument;
      const { volume, octave, speed } = note;

      const adjustedVolume = Math.pow(10, volume / 254 - 1);

      // TODO: Ensure correct panning here.
      /*
      const rightAngle = (Math.pi / 180) / 2;
      const theta = (rightAngle / 2) - ((pan / 12) * rightAngle);
      const panRight = (Math.SQRT2 / 2) * (Math.cos(theta) + Math.sin(theta));
      const panLeft = (Math.SQRT2 / 2) * (Math.cos(theta) - Math.sin(theta));
      */

      const panLeft = 1;
      const panRight = 1;

      // Play sample.

      if (!pi || samplesPlayed > PI_NOTE_LENGTH_SAMPLES) {
        // NOTE: I'm pretty sure that this Math.floor below is correct; I _think_ it was a bug in the OrgPlay source I'm transcribing.
        const absoluteSamplePosition = Math.floor((Math.floor(samplePosition) / OCTAVE_REPEAT_TIMES[octave]) * OCTAVE_ADVANCE_POINTS[octave]);
        const wavetableIndexedSamplePosition = absoluteSamplePosition % 256;
        const wavetableSample = this.wavetable[instrumentIndex][wavetableIndexedSamplePosition];

        left = wavetableSample * panLeft * adjustedVolume;
        right = wavetableSample * panRight * adjustedVolume;

        this.state[n].wavetableOffset = wavetableIndexedSamplePosition;
        // FIXME: This seems wrong - we should be scaling the delta in absolute sample position by the speed, right?
        this.state[n].wavetableOffset += Math.floor(speed);
        this.state[n].samplesPlayed++;
      }
    }

    // Advance the note index if it's finished playing.
    if (note != null && this.sample >= end) {
      this.state[n].wavetableOffset = 0;
      this.state[n].samplesPlayed = 0;
      this.state[n].noteIndex++;
    }

    return [left, right];
  };
}

class OrganyaPlayerWorklet extends AudioWorkletProcessor {
  constructor() {
    this.player = new OrganyaPlayer(parseOrgFileFromBuffer(base64ToByteBuffer(MOONSONG)));
  }

  process(input, outputs, _) {
    const bufferLength = channel[0].length;

    const buffer = this.player.runSteps(bufferLength);

    // Barf samples into the buffer.
    for (let i = 0; i < bufferLength; i++) {
      outputs[0][i] = buffer[i][0];
      oputupts[1][i] = buffer[i][1];
    }

    return true;
  }
}

registerProcessor("organya-player", OrganyaPlayerWorklet);
