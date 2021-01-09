import SynthContext, { Channel, Operator } from "./synth";

export const applyPianoPreset = (synth: SynthContext) => {
    synth.LfoEnable.set(false);
    synth.Channel3Mode.set(0);
    synth.Channel.set(0);
    synth.DacEnable.set(false);
  
    synth.ChannelOne.Operator1.Detune.set(0x07);
    synth.ChannelOne.Operator3.Detune.set(0x00);
    synth.ChannelOne.Operator2.Detune.set(0x03);
    synth.ChannelOne.Operator4.Detune.set(0x00);
  
    synth.ChannelOne.Operator1.Multiple.set(0x01);
    synth.ChannelOne.Operator3.Multiple.set(0x0d);
    synth.ChannelOne.Operator2.Multiple.set(0x03);
    synth.ChannelOne.Operator4.Multiple.set(0x01);
    
    synth.ChannelOne.Operator1.Level.set(0x23);
    synth.ChannelOne.Operator3.Level.set(0x2D);
    synth.ChannelOne.Operator2.Level.set(0x26);
    synth.ChannelOne.Operator4.Level.set(0x00);
  
    synth.ChannelOne.Operator1.Attack.set(0x1F);
    synth.ChannelOne.Operator3.Attack.set(0x19);
    synth.ChannelOne.Operator2.Attack.set(0x1F);
    synth.ChannelOne.Operator4.Attack.set(0x14);
  
    synth.ChannelOne.Operator1.Scaling.set(0x01);
    synth.ChannelOne.Operator3.Scaling.set(0x02);
    synth.ChannelOne.Operator2.Scaling.set(0x01);
    synth.ChannelOne.Operator4.Scaling.set(0x02);
  
    synth.ChannelOne.Operator1.Decay.set(0x05);
    synth.ChannelOne.Operator3.Decay.set(0x05);
    synth.ChannelOne.Operator2.Decay.set(0x05);
    synth.ChannelOne.Operator4.Decay.set(0x07);
  
    synth.ChannelOne.Operator1.Sustain.set(0x02);
    synth.ChannelOne.Operator3.Sustain.set(0x02);
    synth.ChannelOne.Operator2.Sustain.set(0x02);
    synth.ChannelOne.Operator4.Sustain.set(0x02);
  
    synth.ChannelOne.Operator1.Release.set(0x01);
    synth.ChannelOne.Operator3.Release.set(0x01);
    synth.ChannelOne.Operator2.Release.set(0x01);
    synth.ChannelOne.Operator4.Release.set(0x06);
  
    synth.ChannelOne.Operator1.SustainLevel.set(0x01);
    synth.ChannelOne.Operator3.SustainLevel.set(0x01);
    synth.ChannelOne.Operator2.SustainLevel.set(0x01);
    synth.ChannelOne.Operator4.SustainLevel.set(0x0A); 
  
    synth.Channel.set(0x00); 
    synth.ChannelOne.Feedback.set(0b110);
    synth.ChannelOne.Algorithm.set(0b010);
    synth.ChannelOne.Left.set(true);
    synth.ChannelOne.Right.set(true);
  
    synth.ChannelOne.Octave.set(0b0100);
    synth.ChannelOne.Frequency.set(0b010_0110_1001);
  
    synth.Channel.set(0x00); 
};

type OperatorSettings = {
    am: boolean;
    tl: number;
    a: number;
    d: number;
    s: number;
    d2: number;
    r: number;
    mult: number;  
    rs: number;
    dt: number; 
    ssg?: number;
};

type PatchSettings = {
    fms: number,
    ams: number,
    fb: number,
    alg: number,
    operators: {
        // TODO: Allow disable here.
        one: OperatorSettings,
        two: OperatorSettings,
        three: OperatorSettings,
        four: OperatorSettings,
    }
};

export const Presets: { [key: string]: PatchSettings } = {
    // Copied from Deflemask 'green hill zone' demo arrangement.
    marbleBass: {
        fms: 0,
        ams: 0,
        fb: 4,
        alg: 0,
        operators: {
            one: {
                tl: 25,
                am: false,
                a: 31,
                d: 7,
                s: 2,
                d2: 7,
                r: 0,
                mult: 6,
                dt: 3,
                rs: 3,
            },
            two: {
                tl: 55,
                am: false,
                a: 31, 
                d: 6, 
                s: 1, 
                d2: 6, 
                r: 0, 
                mult: 5,
                rs: 3,
                dt: 3,
            },
            three: {
                tl: 19,
                am: false,
                a: 31,
                d: 9,
                s: 1,
                d2: 6,
                r: 0,
                mult: 0,
                rs: 2,
                dt: 3,
            },
            four: {
                tl: 11,
                am: false,
                a: 31,
                d: 6,
                s: 15,
                d2: 8,
                r: 8,
                mult: 1,
                rs: 2,
                dt: 3
            }
        }
    }
};

export const applyPresetFromJson = (json: string, context: SynthContext) => {
    const patch = JSON.parse(json) as PatchSettings;

    // FIXME: Repliacate for each channel.
    applyPreset(context)(patch);
}

export const applyPreset = (context: SynthContext) => (patch: PatchSettings) => {
    const updateChannel = (c: Channel) => {
        c.PhaseModulationSensitivity.set(patch.fms);
        c.AmplitudeModulationSensitivity.set(patch.ams);
        c.Feedback.set(patch.fb);
        c.Algorithm.set(patch.alg);

        const updateOperator = (op: Operator, s: OperatorSettings) => {
            op.FmEnable.set(!s.am);
            op.Attack.set(s.a);
            op.Decay.set(s.d);
            op.Sustain.set(s.s);
            op.Release.set(s.r);
            op.SustainLevel.set(s.d2);
            op.Level.set(s.tl);
            op.Multiple.set(s.mult);
            op.Detune.set(s.dt);
            op.Scaling.set(s.rs);

            if (s.ssg != null) {
                op.CustomEnvelopeEnable.set(true);
                op.CustomEnvelope.set(s.ssg);
            } else {
                op.CustomEnvelopeEnable.set(false);
            }
        }

        updateOperator(c.Operator1, patch.operators.one);
        updateOperator(c.Operator2, patch.operators.two);
        updateOperator(c.Operator3, patch.operators.three);
        updateOperator(c.Operator4, patch.operators.four);
    }

    updateChannel(context.ChannelOne);
    updateChannel(context.ChannelTwo);
    updateChannel(context.ChannelThree);
    updateChannel(context.ChannelFour);
    updateChannel(context.ChannelFive);
    updateChannel(context.ChannelSix);
};