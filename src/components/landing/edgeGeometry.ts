export type PortSide = "left" | "right" | "top" | "bottom";

export interface EdgeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeGeometry {
  d: string;
  sourceSide: PortSide;
  targetSide: PortSide;
}

/** Path stops this far before the target port so the arrowhead sits beside the handle dot, not under it. */
const ARROW_GAP = 7;
/** Horizontal clearance needed before an edge is drawn right→left; anything tighter is routed vertically. */
const FORWARD_MIN = 24;
/** Loop edges run this far right of the source and this far above the highest node they span. */
const LOOP_OFFSET_X = 18;
const LOOP_CLEARANCE_Y = 36;
const LOOP_RADIUS = 12;

/**
 * Path between two node boxes.
 * - forward edges: right port → left port, horizontal S-curve
 * - stacked / backward edges: bottom port → top port (or top → bottom), vertical S-curve
 * - loop edges: rounded orthogonal return — out the right port, up past the top row, down into the target's top port
 */
export function getEdgeGeometry(
  src: EdgeBox,
  tgt: EdgeBox,
  opts: { loop?: boolean; arrowGap?: number } = {}
): EdgeGeometry {
  const gap = opts.arrowGap ?? ARROW_GAP;
  const sx = src.x + src.width;
  const sy = src.y + src.height / 2;
  const tx = tgt.x - gap;
  const ty = tgt.y + tgt.height / 2;

  if (opts.loop) {
    const r = LOOP_RADIUS;
    const runX = sx + LOOP_OFFSET_X;
    const topY = Math.min(src.y, tgt.y) - LOOP_CLEARANCE_Y;
    const tcx = tgt.x + tgt.width / 2;
    const endY = tgt.y - gap;
    return {
      d: [
        `M ${sx} ${sy}`,
        `L ${runX - r} ${sy}`,
        `Q ${runX} ${sy} ${runX} ${sy - r}`,
        `L ${runX} ${topY + r}`,
        `Q ${runX} ${topY} ${runX - r} ${topY}`,
        `L ${tcx + r} ${topY}`,
        `Q ${tcx} ${topY} ${tcx} ${topY + r}`,
        `L ${tcx} ${endY}`,
      ].join(" "),
      sourceSide: "right",
      targetSide: "top",
    };
  }

  if (tgt.x - sx >= FORWARD_MIN) {
    const dx = Math.max(30, (tx - sx) / 2);
    return {
      d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`,
      sourceSide: "right",
      targetSide: "left",
    };
  }

  const vx1 = src.x + src.width / 2;
  const vx2 = tgt.x + tgt.width / 2;
  if (tgt.y + tgt.height / 2 >= sy) {
    const vy1 = src.y + src.height;
    const vy2 = tgt.y - gap;
    const dy = Math.max(30, (vy2 - vy1) / 2);
    return {
      d: `M ${vx1} ${vy1} C ${vx1} ${vy1 + dy}, ${vx2} ${vy2 - dy}, ${vx2} ${vy2}`,
      sourceSide: "bottom",
      targetSide: "top",
    };
  }

  const vy1 = src.y;
  const vy2 = tgt.y + tgt.height + gap;
  const dy = Math.max(30, (vy1 - vy2) / 2);
  return {
    d: `M ${vx1} ${vy1} C ${vx1} ${vy1 - dy}, ${vx2} ${vy2 + dy}, ${vx2} ${vy2}`,
    sourceSide: "top",
    targetSide: "bottom",
  };
}
