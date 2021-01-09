import * as React from "react";

import * as Ch from "@chakra-ui/react";
import SynthContext from "./synth";

export const PianoRoll = (props: { synth: SynthContext}) => {
    const {synth} = props;

    const [octave, setOctave] = React.useState(4);

    const press = React.useCallback((f: number) => {
        // Set Octave & key.
        synth.ChannelOne.Octave.set(octave);
        synth.ChannelOne.Frequency.set(f);
        synth.Channel.set(0xF0);
    }, [synth, octave]);

    const release = React.useCallback(() => {
        synth.Channel.set(0x00);
    }, [synth]);

    const note = {
        "A": 617, 
        "A#": 653,
        "B": 692,
        "C": 733,
        "C#": 777,
        "D": 823,
        "D#": 872,
        "E": 924,
        "F": 979,
        "F#": 1037,
        "G": 1099,
        "G#": 1164,
    };

    return <Ch.Stack direction="row">
        <Ch.Button onMouseDown={() => press(note["A"])} onMouseUp={release}>A</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["A#"])} onMouseUp={release} colorScheme="blue">A#</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["B"])} onMouseUp={release}>B</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["C"])} onMouseUp={release}>C</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["C#"])} onMouseUp={release} colorScheme="blue">C#</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["D"])} onMouseUp={release}>D</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["D#"])} onMouseUp={release} colorScheme="blue">D#</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["E"])} onMouseUp={release}>E</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["F"])} onMouseUp={release}>F</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["F#"])} onMouseUp={release} colorScheme="blue">F#</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["G"])} onMouseUp={release} >G</Ch.Button>
        <Ch.Button onMouseDown={() => press(note["G#"])} onMouseUp={release} colorScheme="blue">G#</Ch.Button>
        <Ch.Button colorScheme="green" onClick={() => setOctave(p => p + 1)}>+</Ch.Button>
        <Ch.Button colorScheme="green" onClick={() => setOctave(p => p - 1)}>-</Ch.Button>
    </Ch.Stack>;
};