"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";

/* ─────────────────────────────────────────────────────────────────────────────
   Square crop, before the photo is uploaded.

   Drag to move, the slider or the wheel to zoom, and what is inside the frame
   is what gets saved. No cropping library: the whole job is one transform and
   one drawImage, and a dependency here would be more code than the maths.

   The preview and the export share COVER_SCALE and the same offsets, so the
   frame is a true preview rather than an approximation of one.
   ───────────────────────────────────────────────────────────────────────────── */

/** The saved image. 512 is generous for a 42px avatar at any density. */
const OUTPUT = 512;

/** The frame the host drags within, in CSS pixels. */
const VIEW = 260;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Offset = { x: number; y: number };

export function AvatarCropper({
  file,
  onCancel,
  onCropped,
  busy,
}: {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  busy?: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  const dragging = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Only the image load lives here — setImage and setError happen in the
  // callbacks, which is the effect subscribing to an external system rather
  // than driving a cascade. Zoom and offset need no reset: the parent gives
  // this component a fresh key per pick, so a new file remounts it.
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError("That file could not be read as an image.");
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [file]);

  /** Scale at which the image just covers the frame — zoom 1. */
  const coverScale = image ? Math.max(VIEW / image.width, VIEW / image.height) : 1;

  /** Keeps the frame full: the image can never be dragged off its own edge. */
  const clamp = useCallback(
    (next: Offset, atZoom: number): Offset => {
      if (!image) return { x: 0, y: 0 };
      const scale = coverScale * atZoom;
      const limitX = Math.max(0, (image.width * scale - VIEW) / 2);
      const limitY = Math.max(0, (image.height * scale - VIEW) / 2);
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [image, coverScale],
  );

  // Derived, not stored. Zooming out has to pull the image back inside the
  // frame, and doing that in an effect means a second render every time the
  // slider moves.
  const shown = clamp(offset, zoom);

  function onPointerDown(e: React.PointerEvent) {
    if (!image) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY, ox: shown.x, oy: shown.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragging.current = null;
    if ((e.target as Element).hasPointerCapture?.(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  }

  function crop() {
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("This browser cannot render the crop.");
      return;
    }

    // The frame is VIEW wide on screen and OUTPUT wide in the file, so every
    // preview measurement scales by the same ratio. That is what makes what
    // you see what you get.
    const ratio = OUTPUT / VIEW;
    const scale = coverScale * zoom * ratio;
    const w = image.width * scale;
    const h = image.height * scale;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, (OUTPUT - w) / 2 + shown.x * ratio, (OUTPUT - h) / 2 + shown.y * ratio, w, h);

    canvas.toBlob(
      (blob) => (blob ? onCropped(blob) : setError("The crop could not be saved.")),
      "image/webp",
      0.9,
    );
  }

  return (
    <Modal
      open={Boolean(file)}
      onClose={onCancel}
      title="Adjust your photo"
      subtitle="Drag to reposition, and zoom until it sits how you want it."
      primary={{ label: "Save photo", onClick: crop, variant: "accent", busy }}
      secondary={{ label: "Cancel", onClick: onCancel }}
    >
      <div className="flex flex-col gap-[14px]">
        {error ? <span className="text-[13px] text-red">{error}</span> : null}

        <div className="flex justify-center">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.002)))}
            className="relative touch-none overflow-hidden rounded-[10px] border border-line bg-fill-2"
            style={{ width: VIEW, height: VIEW, cursor: image ? "grab" : "default" }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                style={{
                  width: image.width * coverScale * zoom,
                  height: image.height * coverScale * zoom,
                  transform: `translate(calc(-50% + ${shown.x}px), calc(-50% + ${shown.y}px))`,
                }}
              />
            ) : null}

            {/* The saved shape, drawn over the photo so the corners it will
                lose are visible while you drag. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[10px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
            />
          </div>
        </div>

        <label className="flex items-center gap-[11px]">
          <Icon name="search" size={12} className="flex-none text-ink-3" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mr-range"
          />
          <span className="w-[38px] flex-none text-right text-[11.5px] text-ink-3">
            {zoom.toFixed(1)}×
          </span>
        </label>
      </div>
    </Modal>
  );
}
