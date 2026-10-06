import { createElement } from "react";
import { BookOpen, Boxes, Braces, Cloud, Code2, Compass, Database, FileText, Gem, GitMerge, Globe, HeartPulse, Home, KeyRound, Layers, LifeBuoy, Library, ListChecks, Mail, Network, PenLine, Rocket, Server, Settings2, Shield, Smartphone, Sparkles, Triangle, UserRound, Wrench, Zap, Bell, Brain, History, Flag, Workflow, Bot, Lightbulb } from "lucide-react";

export const GROUP_ICON = { "Start here": Sparkles, "Product tour": Compass, Architecture: Layers, "Run it": Rocket, Reference: Library };

const PAGE_ICON = {
  welcome: BookOpen, story: Lightbulb, principles: Network,
  "tour-home": Home, "tour-library": Library, "tour-gems": Gem, "tour-memory": Brain, "tour-session": PenLine, "tour-profile": UserRound, "tour-support": LifeBuoy,
  "arch-overview": Boxes, "arch-code": Code2, "arch-data": Database, "arch-flows": Workflow, "arch-ai": Bot, "arch-pwa": Smartphone, "arch-security": Shield,
  "ops-map": Network, "ops-github": GitMerge, "ops-vercel": Triangle, "ops-domain": Globe, "ops-supabase": Database, "ops-render": Server, "ops-cloudflare": Cloud,
  "ops-resend": Mail, "ops-google": KeyRound, "ops-ai-keys": Braces, "ops-push": Bell, "ops-workflow": GitMerge, "ops-runbook": HeartPulse,
  "ref-env": Settings2, "ref-changelog": History, "ref-limits": Flag, "ref-maintain": Wrench,
};

export const pageIcon = (page) => PAGE_ICON[page?.id] || GROUP_ICON[page?.group] || FileText;
export { ListChecks, Zap };

export const PageIcon = ({ page, size = 15 }) => createElement(pageIcon(page), { size, "aria-hidden": true });
