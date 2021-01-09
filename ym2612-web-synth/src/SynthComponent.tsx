import * as React from "react";
import * as Ch from "@chakra-ui/react"

import SynthContext, { MappedFlag, MappedNumber, Operator } from "./synth";

const maxValue = (bits: number) => Math.pow(2, bits) - 1;

const BoundNumber = (boundSynth: SynthContext) => (props: { name: string, field: (context: SynthContext) => MappedNumber}) => <>
    <Ch.FormControl id={`synth-control-${props.name}`}>
        <Ch.FormLabel>{props.name}</Ch.FormLabel>
        <Ch.NumberInput 
            size="sm"
            id={`synth-control-num-${props.name}`} 
            value={props.field(boundSynth).get()} 
            min={0} 
            max={maxValue(props.field(boundSynth).bits())}
            onChange={(_, n) => { props.field(boundSynth).set(n) }}>

            <Ch.NumberInputField />
            <Ch.NumberInputStepper>
                <Ch.NumberIncrementStepper />
                <Ch.NumberDecrementStepper />
            </Ch.NumberInputStepper>
        </Ch.NumberInput>
    </Ch.FormControl>
</>;

const BoundFlag = (boundSynth: SynthContext) => (props: { name: string, field: (context: SynthContext) => MappedFlag}) => <>
    <Ch.FormControl id={`synth-control-${props.name}`}>
        <Ch.FormLabel>{props.name}</Ch.FormLabel>
        <Ch.Switch isChecked={props.field(boundSynth).get()} onChange={(e) => props.field(boundSynth).set(e.target.checked)}></Ch.Switch>
    </Ch.FormControl>
</>;

export const SynthComponent = (props: { context: SynthContext }) => {
    const { context } = props;

    const Number = React.useMemo(() => BoundNumber(context), [context]);
    const Flag = React.useMemo(() => BoundFlag(context), [context]);

    const OperatorFields = (props: { operator: number, operatorSelector: (s: SynthContext) => Operator }) => {
        const num = (n: string) => <Number key={`${n}-${props.operator}`} name={n} field={(s) => ((props.operatorSelector(s) as any)[n] as any as MappedNumber)} />;
        const bit = (n: string) => <Flag key={`${n}-${props.operator}`} name={n} field={(s) => ((props.operatorSelector(s) as any)[n] as any as MappedFlag)} />
        return <>{[
            num("Level"),
            num("Attack"),
            num("Decay"),
            num("Sustain"),
            num("Release"),
            num("SustainLevel"),
            num("Scaling"),
            num("Detune"),
            num("Multiple"),
            num("CustomEnvelope"),
            bit("CustomEnvelopeEnable"),
            bit("FmEnable"),
        ]}</>;
    };

    return <>
        <Ch.Stack direction="row">
            <div>
                <Ch.Heading size="xs">Operator 1</Ch.Heading> 
                <OperatorFields operator={1} operatorSelector={(s) => s.ChannelOne.Operator1} />
            </div>
            <div>
                <Ch.Heading size="xs">Operator 2</Ch.Heading> 
                <OperatorFields operator={2} operatorSelector={(s) => s.ChannelOne.Operator2} />
            </div>
            <div>
                <Ch.Heading size="xs">Operator 3</Ch.Heading> 
                <OperatorFields operator={3} operatorSelector={(s) => s.ChannelOne.Operator3} />
            </div>
            <div>
                <Ch.Heading size="xs">Operator 4</Ch.Heading> 
                <OperatorFields operator={4} operatorSelector={(s) => s.ChannelOne.Operator4} />
            </div>
        <div>
            <Ch.Heading size="xs">Channel Params</Ch.Heading>
            <Number name="Algorithm" field={(s) => s.ChannelOne.Algorithm} />
            <Number name="Feedback" field={(s) => s.ChannelOne.Feedback} />
            <Number name="AmplitudeModulationSensitivity" field={(s) => s.ChannelOne.AmplitudeModulationSensitivity} />
            <Number name="PhaseModulationSensitivity" field={(s) => s.ChannelOne.PhaseModulationSensitivity} />
            <Flag name="Left" field={(s) => s.ChannelOne.Left} />
            <Flag name="Right" field={(s) => s.ChannelOne.Right} />

            <Ch.Heading size="xs">Operator Flags</Ch.Heading>
            <Flag name="Operator1Enable" field={(s) => s.OperatorS1Enable} />
            <Flag name="Operator2Enable" field={(s) => s.OperatorS2Enable} />
            <Flag name="Operator3Enable" field={(s) => s.OperatorS3Enable} />
            <Flag name="Operator4Enable" field={(s) => s.OperatorS4Enable} />

            <Ch.Heading size="xs">LFO</Ch.Heading>
            <Flag name="LfoEnable" field={(s) => s.LfoEnable} />
            <Number name="LfoFreq" field={(s) => s.LfoFreq} />
        </div>
        </Ch.Stack>
    </>;
};