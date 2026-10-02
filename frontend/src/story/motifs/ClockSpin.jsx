import MotifArtwork from "./MotifArtwork.jsx";
export default function ClockSpin(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "clock_spin" }} />; }