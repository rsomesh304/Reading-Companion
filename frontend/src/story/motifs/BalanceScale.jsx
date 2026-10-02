import MotifArtwork from "./MotifArtwork.jsx";
export default function BalanceScale(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "balance_scale" }} />; }