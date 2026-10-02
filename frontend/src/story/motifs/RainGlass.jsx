import MotifArtwork from "./MotifArtwork.jsx";
export default function RainGlass(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "rain_glass" }} />; }