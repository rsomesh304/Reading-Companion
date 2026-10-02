import MotifArtwork from "./MotifArtwork.jsx";
export default function SeedToTree(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "seed_to_tree" }} />; }