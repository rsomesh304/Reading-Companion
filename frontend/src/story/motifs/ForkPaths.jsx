import MotifArtwork from "./MotifArtwork.jsx";
export default function ForkPaths(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "fork_paths" }} />; }