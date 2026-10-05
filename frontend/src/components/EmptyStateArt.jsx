import { useId } from "react";
import "./EmptyStateArt.css";

export function EmptyLibraryArt() {
  const prefix = `empty-library-${useId().replace(/:/g, "")}`;
  return (
    <div className="empty-library-art" aria-hidden="true">
      <svg viewBox="0 0 180 118" role="presentation">
        <defs>
          <linearGradient id={`${prefix}-page`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#ddd2ff" />
          </linearGradient>
          <linearGradient id={`${prefix}-shelf`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id={`${prefix}-float`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <g className="ela-spark ela-spark-a"><path d="M34 28v12M28 34h12" /></g>
        <g className="ela-spark ela-spark-b"><path d="M145 25v9M140.5 29.5h9" /></g>
        <path className="ela-float-page" d="M57 23c7-8 15-9 22-5l-5 20c-7-4-12-4-19 1z" />
        <path className="ela-float-page ela-page-two" d="M116 34c5-7 11-9 17-7l-2 16c-6-2-10-1-15 3z" />
        <path className="ela-book-shadow" d="M42 80c15-8 32-7 48 2 16-9 34-10 48-2v10c-16-7-32-7-48 2-16-9-32-9-48-2z" />
        <path className="ela-book-page" d="M90 43c-15-12-32-13-49-5v39c17-8 34-7 49 5z" />
        <path className="ela-book-page ela-book-page-right" d="M90 43c15-12 32-13 49-5v39c-17-8-34-7-49 5z" />
        <path className="ela-book-lines" d="M52 49c10-4 20-3 29 1M52 58c10-4 20-3 29 1M52 67c10-4 20-3 29 1M99 50c9-4 19-5 29-1M99 59c9-4 19-5 29-1M99 68c9-4 19-5 29-1" />
        <path className="ela-book-spine" d="M90 43v39" />
        <rect className="ela-shelf" x="27" y="86" width="126" height="8" rx="4" fill={`url(#${prefix}-shelf)`} />
        <path className="ela-shelf-leg" d="M38 94v9m108-9v9" />
        <path className="ela-shelf-foot" d="M32 104h18m98 0h-18" />
      </svg>
    </div>
  );
}

export function EmptyGemsArt() {
  const prefix = `empty-gems-${useId().replace(/:/g, "")}`;
  return (
    <div className="empty-gems-art" aria-hidden="true">
      <svg viewBox="0 0 180 118" role="presentation">
        <defs>
          <linearGradient id={`${prefix}-gem`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9c6ff" />
            <stop offset=".48" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id={`${prefix}-shine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".88" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${prefix}-clip`}>
            <path d="M66 35 78 23h24l12 12 13 14-35 49-35-49z" />
          </clipPath>
        </defs>
        <ellipse className="ega-orbit" cx="90" cy="60" rx="67" ry="30" transform="rotate(-12 90 60)" />
        <g className="ega-gem">
          <path className="ega-gem-body" d="M66 35 78 23h24l12 12 13 14-35 49-35-49z" fill={`url(#${prefix}-gem)`} />
          <path className="ega-facet" d="m66 35 26 63 26-63M54 49h72M78 23l14 26 10-26M92 49v49" />
          <g clipPath={`url(#${prefix}-clip)`}>
            <rect className="ega-shine" x="42" y="18" width="24" height="92" fill={`url(#${prefix}-shine)`} />
          </g>
        </g>
        <g className="ega-spark ega-spark-a"><path d="M39 42v13M32.5 48.5h13" /></g>
        <g className="ega-spark ega-spark-b"><path d="M143 62v10M138 67h10" /></g>
        <circle className="ega-dot ega-dot-a" cx="50" cy="77" r="2.5" />
        <circle className="ega-dot ega-dot-b" cx="129" cy="29" r="2" />
      </svg>
    </div>
  );
}
