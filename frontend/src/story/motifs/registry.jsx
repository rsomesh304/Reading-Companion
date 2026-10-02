import BalanceScale from "./BalanceScale.jsx";
import BridgeBuild from "./BridgeBuild.jsx";
import CalendarFlip from "./CalendarFlip.jsx";
import ChainBreak from "./ChainBreak.jsx";
import ClockSpin from "./ClockSpin.jsx";
import CrowdDots from "./CrowdDots.jsx";
import Constellation from "./Constellation.jsx";
import DoorOpen from "./DoorOpen.jsx";
import FallingDusk from "./FallingDusk.jsx";
import ForkPaths from "./ForkPaths.jsx";
import HeartbeatLine from "./HeartbeatLine.jsx";
import KnotUntie from "./KnotUntie.jsx";
import LightBeam from "./LightBeam.jsx";
import MapRoute from "./MapRoute.jsx";
import MirrorSplit from "./MirrorSplit.jsx";
import NameTags from "./NameTags.jsx";
import Orbit from "./Orbit.jsx";
import PathJourney from "./PathJourney.jsx";
import QuoteGlow from "./QuoteGlow.jsx";
import RainGlass from "./RainGlass.jsx";
import RippleWaves from "./RippleWaves.jsx";
import RisingSun from "./RisingSun.jsx";
import SeedToTree from "./SeedToTree.jsx";
import StormClouds from "./StormClouds.jsx";
import TimelineTicks from "./TimelineTicks.jsx";
import { resolveMotifId } from "./motifIds.js";

const MOTIFS = {
  constellation: Constellation, orbit: Orbit, path_journey: PathJourney, fork_paths: ForkPaths,
  ripple_waves: RippleWaves, rising_sun: RisingSun, falling_dusk: FallingDusk,
  storm_clouds: StormClouds, rain_glass: RainGlass, light_beam: LightBeam,
  chain_break: ChainBreak, knot_untie: KnotUntie, mirror_split: MirrorSplit,
  timeline_ticks: TimelineTicks, balance_scale: BalanceScale, crowd_dots: CrowdDots,
  bridge_build: BridgeBuild, clock_spin: ClockSpin, calendar_flip: CalendarFlip,
  map_route: MapRoute, door_open: DoorOpen, seed_to_tree: SeedToTree,
  heartbeat_line: HeartbeatLine, quote_glow: QuoteGlow, name_tags: NameTags,
};

export function MotifRenderer({ beat, ...props }) {
  const Component = MOTIFS[resolveMotifId(beat?.motif)] || Constellation;
  return <Component {...props} beat={beat} />;
}