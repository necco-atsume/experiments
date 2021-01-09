import YM2612 from "./ym2612";

const CLOCK_RATE_HZ = 7670448;
const SAMPLE_RATE_HZ = 44100;
const DAC_PRECISION_BITS = 9;

interface ReadWriteable {
    read: (address: number) => number;
    write: (address: number, value: number) => void;

};

interface MappedValue<T> {
    get(): T;
    set(value: T): void;
    bits: () => number;
};

type Bit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Test whether a given bit is set in a value. */ 
const test = (bit: Bit, value: number) => ((0x01 << bit) & value) !== 0;
/** Sets a bit in a given value to on or off. */
const setBit = (bit: Bit, value: number, bitStatus: boolean) => {
    const  mask = 0x01 << bit;

    if (!bitStatus) {
        // Flip the bit off.
        const invMask = ~mask & 0xFF;
        return value & invMask;
    } else {
        return value | mask;
    }

};

/** JS wrapper over a flag in the YM2612's memory map. */
export class MappedFlag implements MappedValue<boolean> {

    constructor(private readonly _chip: ReadWriteable, private readonly _addr: number, private readonly _bit: Bit, defaultValue?: boolean) {
        if (defaultValue != null) {
            this.set(defaultValue);
        }
    }

    bits(): number {
        return 1;
    }

    get(): boolean {
        const value = this._chip.read(this._addr);
        return test(this._bit, value);
    }
    set(value: boolean): void {
        const oldValue = this._chip.read(this._addr);
        const newValue = setBit(this._bit, oldValue, value);
        console.log(`writing 0x${newValue.toString(16)} to 0x${this._addr.toString(16)}`);
        this._chip.write(this._addr, newValue);
    }
}

interface Location {
    address: number;
    start: Bit;
    end: Bit;
}

const mask = (range: Location): number => {
    const { start, end } = range;
    return ((((0 >= start) && (0 <= end)) ? 0x01 : 0)
          | (((1 >= start) && (1 <= end)) ? 0x02 : 0)
          | (((2 >= start) && (2 <= end)) ? 0x04 : 0)
          | (((3 >= start) && (3 <= end)) ? 0x08 : 0)
          | (((4 >= start) && (4 <= end)) ? 0x10 : 0)
          | (((5 >= start) && (5 <= end)) ? 0x20 : 0)
          | (((6 >= start) && (6 <= end)) ? 0x40 : 0)
          | (((7 >= start) && (7 <= end)) ? 0x80 : 0));
}

const invMask = (range : Location): number => {
    const { start, end } = range;
    return ((((0 >= start) && (0 <= end)) ? 0 : 0x01)
          | (((1 >= start) && (1 <= end)) ? 0 : 0x02)
          | (((2 >= start) && (2 <= end)) ? 0 : 0x04)
          | (((3 >= start) && (3 <= end)) ? 0 : 0x08)
          | (((4 >= start) && (4 <= end)) ? 0 : 0x10)
          | (((5 >= start) && (5 <= end)) ? 0 : 0x20)
          | (((6 >= start) && (6 <= end)) ? 0 : 0x40)
          | (((7 >= start) && (7 <= end)) ? 0 : 0x80));
}

const bits = (n: number) => Math.pow(2, n) - 1;

/** Generic wrapper over a number in the YM2612's memory map. These can optionally span multiple bytes. */
export class MappedNumber implements MappedValue<number> {
    constructor(private readonly _chip: ReadWriteable, private readonly lsbOrByte: Location, private readonly msb?: Location, defaultValue?: number) {
        if (defaultValue != null) {
            this.set(defaultValue);
        }
    }

    bits(): number {
        const lo = this.lsbOrByte.end - this.lsbOrByte.start + 1;
        const hi = (this.msb != null) ? this.msb.end - this.msb.start + 1: 0;
        return lo + hi;
    }

    get(): number {
        // Read out the int value
        const lsb = ((mask(this.lsbOrByte) & this._chip.read(this.lsbOrByte.address)) >> this.lsbOrByte.start) & 0xFF;

        // If it spans two addresses combine them.
        let msb = 0;
        if (this.msb != null) {
            // eslint-disable-next-line
            msb = ((mask(this.msb) & this._chip.read(this.msb.address))  >> this.msb.start & 0xFF);
            // Shift it out so we can OR these two together and get the 'actual' value.
            msb = msb << (1 + this.lsbOrByte.end - this.lsbOrByte.start);
        }

        return msb | lsb;
    }
    set(value: number): void {
        const writeRegion = (loc: Location, val: number) => {
            // First prepare the bits to write, and shift them into place relative to tbe byte they'll be written into.
            // (We assume that it's pre-shifted so the bits in `loc` are correct.)
            const valueMask = bits(loc.end - loc.start + 1);
            const toReplace = (val & valueMask) << loc.start;

            // Now grab the old value. We only want to overwrite the bits that are mapped, so we'll need to combine the two.
            const writeMask = invMask(loc);
            const prev = (this._chip.read(loc.address)) & writeMask;

            // Finally combine and write it out.
            const combined = prev | toReplace;
            this._chip.write(loc.address, combined);
        }

        if (this.msb != null && this.msb.address < this.lsbOrByte.address) { 
            writeRegion(this.lsbOrByte, value);
        }

        if (this.msb != null) {

            // Shift the lsb out, so we're only looking at the msb.
            // Note: Watch for negatives here. We can rely on this bc the ym2612 doesn't use any, but mask out the sign bit anyways.
            const lsbSize = this.lsbOrByte.end - this.lsbOrByte.start + 1;
            const shifted = (value & 0x7FFF_FFFF) >> lsbSize; 

            writeRegion(this.msb, shifted);
        }

        if (this.msb == null || this.msb.address > this.lsbOrByte.address) { 
            writeRegion(this.lsbOrByte, value);
        }

    }
}

export class Operator {

    Level: MappedNumber;
    Attack: MappedNumber;
    Decay: MappedNumber;
    Sustain: MappedNumber;
    Release: MappedNumber;

    Scaling: MappedNumber;
    SustainLevel: MappedNumber;

    Detune: MappedNumber;
    Multiple: MappedNumber;
    FmEnable: MappedFlag;

    // Aka. SSG-EG.
    CustomEnvelope: MappedNumber;
    CustomEnvelopeEnable: MappedFlag;

    constructor(private readonly _chip: YM2612, private readonly _offset: number) {
        this.Detune = new MappedNumber(_chip, { address: 0x30 + _offset, start: 4, end: 6});
        this.Multiple = new MappedNumber(_chip, { address: 0x30 + _offset, start: 0, end: 3});
        this.Level = new MappedNumber(_chip, { address: 0x40 + _offset, start: 0, end: 6 });
        this.Scaling = new MappedNumber(_chip, { address: 0x50 + _offset, start: 6, end: 7 });
        this.FmEnable = new MappedFlag(_chip, 0x60 + _offset, 7);

        this.Attack = new MappedNumber(_chip, { address: 0x50 + _offset, start: 0, end: 4 });
        this.Decay = new MappedNumber(_chip, { address: 0x60 + _offset, start: 0, end: 4 });
        this.Sustain = new MappedNumber(_chip, { address: 0x70 + _offset, start: 0, end: 4 });
        this.Release = new MappedNumber(_chip, { address: 0x80 + _offset, start: 0, end: 3 });

        this.SustainLevel = new MappedNumber(_chip, { address: 0x80 + _offset, start: 4, end: 7 });

        this.CustomEnvelope = new MappedNumber(_chip, { address: 0x90 + _offset, start: 0, end: 2 });
        this.CustomEnvelopeEnable = new MappedFlag(_chip, 0x90 + _offset, 3);
    }

}

export class Channel {

    public Operator1: Operator;
    public Operator2: Operator;
    public Operator3: Operator;
    public Operator4: Operator;

    public Frequency: MappedNumber;
    public Octave: MappedNumber;

    public Algorithm: MappedNumber;
    public Feedback: MappedNumber;

    public Left: MappedFlag;
    public Right: MappedFlag;

    public AmplitudeModulationSensitivity: MappedNumber;
    public PhaseModulationSensitivity: MappedNumber;

    
    constructor(private readonly _chip: YM2612, private readonly _channel: number) {
        const operatorBase = (_channel < 4) ? (_channel - 1) : ((_channel - 1) | 0x100);

        this.Operator1 = new Operator(_chip, operatorBase);
        this.Operator2 = new Operator(_chip, operatorBase + 0x8);
        this.Operator3 = new Operator(_chip, operatorBase + 0x4);
        this.Operator4 = new Operator(_chip, operatorBase + 0xC);

        this.Frequency = new MappedNumber(_chip, 
            { address: 0xA0 + operatorBase, start: 0, end: 7 },
            { address: 0xA0 + operatorBase + 4, start: 0, end: 2 });

        this.Octave = new MappedNumber(_chip,
            { address: 0xA0 + operatorBase + 4, start: 3, end: 5 });

        this.Algorithm = new MappedNumber(_chip,
            { address: 0xB0 + operatorBase, start: 0, end: 2 });

        this.Feedback = new MappedNumber(_chip,
            { address: 0xB0 + operatorBase, start: 3, end: 5 });

        this.Left = new MappedFlag(_chip, 0xB4 + operatorBase, 7);
        this.Right = new MappedFlag(_chip, 0xB4 + operatorBase, 6);

        this.AmplitudeModulationSensitivity = new MappedNumber(_chip, { address: 0xB4 + operatorBase, start: 4, end: 5 });
        this.PhaseModulationSensitivity = new MappedNumber(_chip, { address: 0xB4 + operatorBase, start: 0, end: 2 });
    }
}
export default class SynthContext {
    // TODO: This is weird, fix it.
    chip: YM2612;

    LfoEnable: MappedFlag;
    LfoFreq: MappedNumber;
    TimerAFrequency: MappedNumber;
    TimerBFrequency: MappedNumber;
    TimerALoad: MappedFlag;
    TimerBLoad: MappedFlag;
    TimerAEnable: MappedFlag;
    TimerBEnable: MappedFlag;
    TimerARst: MappedFlag;
    TimerBRst: MappedFlag;

    // TODO: Allow disabling polyphony and using the special channel 3 mode.
    Channel3Mode: MappedNumber;

    Channel: MappedNumber;

    OperatorS1Enable: MappedFlag;
    OperatorS2Enable: MappedFlag;
    OperatorS3Enable: MappedFlag;
    OperatorS4Enable: MappedFlag;

    DacOutput: MappedNumber;

    DacEnable: MappedFlag;

    ChannelOne: Channel;
    ChannelTwo: Channel;
    ChannelThree: Channel;
    ChannelFour: Channel;
    ChannelFive: Channel;
    ChannelSix: Channel;

    constructor(chip: YM2612, notifyUpdate: () => void) {
        this.chip = chip;

        // HACK: Monkeypatch write()  here so we can force an update every time a value changes.
        // TOOD: Do this cleanly..

        const prev = this.chip.write.bind(this.chip);
        this.chip.write = (a, v) => {
            if (this.chip.read(a) !== v && ![0x28, 0xa0, 0xa4].includes(a)) {
                notifyUpdate();
            }
            prev(a, v);
        };

        this.LfoEnable = new MappedFlag(this.chip, 0x22, 3);
        this.LfoFreq = new MappedNumber(this.chip, { address: 0x22, start: 0, end: 2 });

        this.TimerAFrequency = new MappedNumber(this.chip, { address: 0x25, start: 0, end: 1 }, { address: 0x24, start: 0, end: 7 });
        this.TimerBFrequency = new MappedNumber(this.chip, { address: 0x26, start: 0, end: 7 });

        this.TimerALoad = new MappedFlag(this.chip, 0x27, 0);
        this.TimerBLoad = new MappedFlag(this.chip, 0x27, 1);
        this.TimerAEnable = new MappedFlag(this.chip, 0x27, 2);
        this.TimerBEnable = new MappedFlag(this.chip, 0x27, 3);
        this.TimerARst = new MappedFlag(this.chip, 0x27, 4);
        this.TimerBRst = new MappedFlag(this.chip, 0x27, 5);

        this.Channel3Mode = new MappedNumber(this.chip, { address: 0x27, start: 6, end: 7 });

        this.Channel = new MappedNumber(this.chip, { address: 0x28, start: 0, end: 7 });

        this.OperatorS1Enable = new MappedFlag(this.chip, 0x28, 4);
        this.OperatorS2Enable = new MappedFlag(this.chip, 0x28, 5);
        this.OperatorS3Enable = new MappedFlag(this.chip, 0x28, 6);
        this.OperatorS4Enable = new MappedFlag(this.chip, 0x28, 7);

        this.DacOutput = new MappedNumber(this.chip, { address: 0x2A, start: 0, end: 7 });

        this.DacEnable = new MappedFlag(this.chip, 0x2B, 7);

        this.ChannelOne = new Channel(chip, 1);
        this.ChannelTwo = new Channel(chip, 2);
        this.ChannelThree = new Channel(chip, 3);
        this.ChannelFour = new Channel(chip, 4);
        this.ChannelFive = new Channel(chip, 5);
        this.ChannelSix = new Channel(chip, 6);

        // TODO: Support Special Channel3 Mode.
        // Since this is just used as a synth, every channel should have the same voices.
        chip.init(CLOCK_RATE_HZ, SAMPLE_RATE_HZ);
        chip.config(DAC_PRECISION_BITS);
        chip.reset();
        chip.write(0x28, 0);
    }


}
