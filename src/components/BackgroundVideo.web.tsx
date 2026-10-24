/**
 * BackgroundVideo — web platform override (production)
 *
 * ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * expo-video's VideoView targets native GPU surfaces and cannot be used as a
 * CSS-positioned fullscreen background on web. Metro/webpack resolve this file
 * instead of BackgroundVideo.tsx on web because of the `.web.tsx` suffix.
 *
 * ─── ROOT CAUSE OF THE 5-SECOND DELAY (now fixed) ────────────────────────────
 * The original login_bg.mp4 had its moov atom at byte 8,971,650 — near the end
 * of an 8.98 MB file. Browsers must read the moov atom before they can decode
 * a single frame. Without fast-start, the browser had to download ~100 % of the
 * file before rendering anything, causing the observed 5-second blank period.
 *
 * login_bg_faststart.mp4 is a lossless remux (-c copy -movflags +faststart).
 * Its moov atom sits at byte 32 — the browser gets decoder parameters in the
 * very first TCP segment and can display the first frame almost immediately.
 *
 * ─── POSTER IMAGE ─────────────────────────────────────────────────────────────
 * login_bg_poster.jpg (53 KB, 1280×720) is the exact first frame of the video.
 * The browser renders it synchronously during HTML parse, so the background is
 * never blank — even before a single byte of video data arrives.
 * Once the video's `playing` event fires the poster is automatically replaced
 * by the live video; no JavaScript is needed for this transition.
 *
 * ─── MOUNT STABILITY ──────────────────────────────────────────────────────────
 * React.memo prevents reconciler churn. BackgroundVideo is a sibling of the
 * auth card in LoginScreen, so switching sign-in/sign-up or any auth state
 * change never causes this component to unmount or remount. The <video> DOM
 * node is created exactly once per page load and plays continuously.
 *
 * ─── PLAYBACK SETUP ───────────────────────────────────────────────────────────
 * Attributes are set declaratively so the browser's media engine handles
 * autoplay in a single, consistent pass:
 *
 *   autoPlay     — request immediate playback (required for muted autoplay)
 *   muted        — mandatory for autoplay in all modern browsers
 *   loop         — seamless restart at the end of the 28-second clip
 *   playsInline  — prevents iOS Safari from taking over the screen
 *   preload="auto" — browser buffers aggressively; avoids rebuffering stalls
 *   poster       — first-frame JPEG shown before the first video frame decodes
 *
 * We also call el.play() imperatively in a useEffect so we can catch and
 * silently swallow any NotAllowedError from strict browser autoplay policies.
 * The dark fallback (backgroundColor on the overlay) remains visible in those
 * rare cases so the login card is always readable.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

// Fast-start MP4 — moov atom at byte 32, before mdat.
// Metro (web) and webpack both resolve require() of an asset to a URL string.
const VIDEO_SRC: string = require('../../assets/login_bg_faststart.mp4');

// 53 KB JPEG first-frame poster — shown instantly before video decoding begins.
const POSTER_SRC: string = require('../../assets/login_bg_poster.jpg');

// ─── Component ────────────────────────────────────────────────────────────────
const BackgroundVideo = React.memo(function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Imperatively trigger playback so we can handle the promise. This is safe
    // to call alongside the `autoPlay` attribute — the browser deduplicates the
    // play request if it already started from the attribute.
    el.play().catch(() => {
      // NotAllowedError: autoplay blocked by browser policy (e.g. user hasn't
      // interacted with the page yet on some mobile browsers). The poster and
      // dark overlay are still visible so the UI remains fully functional.
    });
    // Run once on mount — empty dep array is intentional.
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/*
       * The <video> element is a raw DOM node; we style it with inline
       * CSSProperties rather than StyleSheet so it covers the viewport exactly
       * like StyleSheet.absoluteFill without requiring a global stylesheet.
       */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={videoStyle}
        controls={false}
      />

      {/*
       * Dark cinematic overlay — two-layer approach:
       *
       * 1. backgroundColor: painted synchronously on the very first render,
       *    before any video or poster data loads. This is the guaranteed
       *    fallback that keeps the login card readable at all times.
       *
       * 2. backgroundImage gradient (RN Web maps it to a CSS linear-gradient):
       *    heavier at top/bottom edges, lighter in the centre so the video
       *    texture reads through around the card area.
       */}
      <View style={styles.overlay} />
    </View>
  );
});

export default BackgroundVideo;

// ─── Styles ───────────────────────────────────────────────────────────────────

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  // Ensure all pointer events fall through to the auth card above.
  pointerEvents: 'none',
  border: 'none',
  outline: 'none',
  display: 'block',
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    // Layer 1 — solid fallback, always visible from the first paint.
    backgroundColor: 'rgba(0,0,0,0.50)',
    // Layer 2 — cinematic gradient (web only).
    // @ts-ignore — backgroundImage is a valid web-only style via RN Web
    backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.65) 100%)',
  },
});
