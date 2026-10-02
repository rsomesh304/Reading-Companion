import MotifArtwork from "./MotifArtwork.jsx";
export default function MapRoute(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "map_route" }} />; }