import MotifArtwork from "./MotifArtwork.jsx";
export default function StormClouds(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "storm_clouds" }} />; }