import MotifArtwork from "./MotifArtwork.jsx";
export default function NameTags(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "name_tags" }} />; }