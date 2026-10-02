import MotifArtwork from "./MotifArtwork.jsx";
export default function MirrorSplit(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "mirror_split" }} />; }