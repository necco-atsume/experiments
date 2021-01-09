import * as React from "react";
import { applyPreset, Presets } from "./presets";
import SynthContext from "./synth";
import YM2612 from "./ym2612";

const initializeSynthContext = (notifyUpdate: () => void): SynthContext => {
    const synth = new SynthContext(
        new YM2612(),
        notifyUpdate
    );

    // applyPianoPreset(synth);
    applyPreset(synth)(Presets.marbleBass);

    return synth;
}

const initializeWebAudioContext = (context: AudioContext, synth: SynthContext) => {
    // I apologize, w3c...
    const processor = context.createScriptProcessor()!;
    
    // TODO: Need to do this over an AudioWorklet... :/
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const { outputBuffer } = e;
    
        const sample = synth.chip.update(outputBuffer.length);
    
        outputBuffer.copyToChannel(new Float32Array((sample[0] as unknown as number[]).map(a => a / 65356)), 0, 0);
        outputBuffer.copyToChannel(new Float32Array((sample[1] as unknown as number[]).map(a => a / 65356)), 1, 0);
    };
    
    processor.connect(context.destination);
    
    // Return 'teardown'.
    return () => {
        processor.disconnect(context.destination);
        context.close();
    }
};

export const useSynth = (notifyUpdate: () => void): SynthContext => {
    const synth = React.useMemo(() => initializeSynthContext(notifyUpdate), []);

    React.useEffect(() => {
        const context = new AudioContext();

        return initializeWebAudioContext(context, synth);
    }, [synth]);

    return synth;
};