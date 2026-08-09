import { useMemo } from "react";

const PHOTOS = [
  "/photos/capsule-1.jpg",
  "/photos/capsule-2.jpg",
  "/photos/capsule-3.jpg",
  "/photos/capsule-4.jpg",
  "/photos/capsule-5.jpg",
  "/photos/capsule-6.jpg",
  "/photos/capsule-7.jpg",
  "/photos/capsule-8.jpg",
  "/photos/capsule-9.jpg"
];

const MAX_TILT = 9;
const EDGE_INSET = 14;
const MIN_SPACING = 21;
const RELAX_PASSES = 160;
const RING_INSET = 0.62;
const between = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function scatter(count) {
  const min = EDGE_INSET;
  const max = 100 - EDGE_INSET;
  const centre = 50;
  const radius = ((max - min) / 2) * RING_INSET;

  const points = Array.from({ length: count }, (_, index) => {
    const angle =
      (index / count) * Math.PI * 2 + between(-0.6, 0.6);
    const distance = radius * Math.sqrt(between(0.05, 1));

    return {
      x: clamp(centre + Math.cos(angle) * distance, min, max),
      y: clamp(centre + Math.sin(angle) * distance, min, max)
    };
  });

  for (let pass = 0; pass < RELAX_PASSES; pass += 1) {
    let settled = true;

    for (let a = 0; a < count; a += 1) {
      for (let b = a + 1; b < count; b += 1) {
        const first = points[a];
        const second = points[b];

        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 0.001;

        if (distance >= MIN_SPACING) continue;

        settled = false;
        const push = (MIN_SPACING - distance) / 2;
        const nx = (dx / distance) * push;
        const ny = (dy / distance) * push;

        first.x = clamp(first.x - nx, min, max);
        first.y = clamp(first.y - ny, min, max);
        second.x = clamp(second.x + nx, min, max);
        second.y = clamp(second.y + ny, min, max);
      }
    }

    if (settled) break;
  }

  return points.map((point) => ({
    ...point,
    tilt: between(-MAX_TILT, MAX_TILT),
    delay: between(0, 900)
  }));
}

export default function PolaroidWall() {
  const layout = useMemo(() => scatter(PHOTOS.length), []);

  return (
    <div className="polaroid-wall" aria-hidden="true">
      {PHOTOS.map((src, index) => {
        const { x, y, tilt, delay } = layout[index];

        return (
          <figure
            key={src}
            className="polaroid"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              "--tilt": `${tilt}deg`,
              "--delay": `${delay}ms`
            }}
          >
            <img src={src} alt="" loading="lazy" />
          </figure>
        );
      })}
    </div>
  );
}
