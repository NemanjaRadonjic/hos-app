import type { GraphSizes, RowPositions } from "./types";

type DrawGraphGrid = {
  ctx: CanvasRenderingContext2D;
  ROW_POSITIONS: RowPositions;
  GRAPH_SIZES: GraphSizes;
};
export default function drawGrid({
  ctx,
  ROW_POSITIONS,
  GRAPH_SIZES,
}: DrawGraphGrid) {
  const { paddingLeft, paddingTop, graphHeight, graphWidth, fontSize } =
    GRAPH_SIZES;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;

  // vertical
  for (let i = 0; i <= 24; i++) {
    const x = paddingLeft + (graphWidth / 24) * i;

    ctx.beginPath();
    ctx.moveTo(x, paddingTop);
    ctx.lineTo(x, paddingTop + graphHeight);
    ctx.stroke();
  }

  // horizontal
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const y = paddingTop + graphHeight * t;

    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + graphWidth, y);
    ctx.stroke();
  });

  // HOUR LABELS + MINUTE TICKS
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;

  for (let h = 0; h <= 24; h++) {
    const x = paddingLeft + (graphWidth / 24) * h;

    let label: string;
    if (h === 0 || h === 24) label = "12";
    else if (h === 12) label = "12";
    else if (h < 12) label = String(h);
    else label = String(h - 12);
    ctx.fillText(label, x, paddingTop - 8);

    if (h !== 24) {
      const baseX = paddingLeft + (graphWidth / 24) * h;
      ctx.strokeStyle = "#d3d8df";
      ctx.lineWidth = 1;
      const tickShort = graphHeight * 0.06;
      const tickMid = graphHeight * 0.12;

      Object.values(ROW_POSITIONS).forEach((y) => {
        const x15 = baseX + (graphWidth / 24) * 0.25;
        ctx.beginPath();
        ctx.moveTo(x15, y + tickMid);
        ctx.lineTo(x15, y + tickShort);
        ctx.stroke();
        const x30 = baseX + (graphWidth / 24) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x30, y + tickMid);
        ctx.lineTo(x30, y);
        ctx.stroke();
        const x45 = baseX + (graphWidth / 24) * 0.75;
        ctx.beginPath();
        ctx.moveTo(x45, y + tickMid);
        ctx.lineTo(x45, y + tickShort);
        ctx.stroke();
      });
    }
  }
}
