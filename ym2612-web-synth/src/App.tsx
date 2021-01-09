import * as React from "react";

import * as Ch from "@chakra-ui/react";

import './App.css';
import { useSynth } from "./useSynth";
import { SynthComponent } from "./SynthComponent";
import { PianoRoll } from "./PianoRoll";



function App() {
  // HACK: We bump 'key' here to force a redraw. 
  const [synthWrites, setSynthWrites] = React.useState(0);
  const refreshSynthControl = () => {
    setSynthWrites((p) => p + 1);
  };

  const synth = useSynth(refreshSynthControl);

  return (
    <Ch.ChakraProvider>
      <Ch.CSSReset />
      <Ch.Heading>Mini YM2612 Synth Demo</Ch.Heading>
      <PianoRoll synth={synth} />
      <SynthComponent key={synthWrites} context={synth} />
      <Ch.Text>Based off of the <Ch.Link href="https://github.com/apollolux/ym2612-js">ym2612-js</Ch.Link> library, and <Ch.Link href="https://www.smspower.org/maxim/Documents/YM2612/">this reference sheet.</Ch.Link></Ch.Text>
      <Ch.Text>still extremely a WIP...</Ch.Text>
    </Ch.ChakraProvider>
  );
}

export default App;
