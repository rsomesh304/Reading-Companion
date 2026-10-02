import MotifArtwork from "./MotifArtwork.jsx";
export default function RisingSun(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "rising_sun" }} />; }