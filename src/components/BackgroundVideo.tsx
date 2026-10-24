/**
 * BackgroundVideo — native (Android / iOS)
 *
 * Uses expo-video's VideoView + useVideoPlayer to render the full-screen
 * looping background video. A dark overlay sits on top so the auth card
 * remains readable regardless of video brightness.
 *
 * This file is the native implementation. The bundler automatically picks
 * BackgroundVideo.web.tsx on web instead of this file.
 */
import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Resolve the local asset at bundle time.
const VIDEO_SOURCE = require('../../assets/login_bg.mp4');

export default function BackgroundVideo() {
  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      {/* Dark overlay — keeps text contrast over any video frame */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
