---
name: remotion-video-generation
description: Instructions for creating and rendering programmatic videos using Remotion. Includes setup, composition patterns, and rendering workflows.
---

# Remotion Video Generation Skill

This skill provides instructions for using [Remotion](https://www.remotion.dev/) to create videos programmatically using React.

## Setup Instructions

Since the standard `npx create-video` is interactive, follow these steps to set up Remotion in a sub-directory (e.g., `video/`):

### 1. Initialize Project
```bash
mkdir video
cd video
npm init -y
```

### 2. Install Dependencies
```bash
npm install remotion @remotion/cli @remotion/renderer react react-dom
npm install -D @types/react @types/react-dom typescript
```

### 3. Basic File Structure
- `src/index.ts`: The entry point for Remotion.
- `src/Composition.tsx`: Your React component for the video.
- `src/Root.tsx`: Where you register your compositions.

### 4. Example `src/index.ts`
```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

### 5. Example `src/Root.tsx`
```typescript
import { Composition } from 'remotion';
import { MyVideo } from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={MyVideo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

## Core Concepts

### Compositions
A `Composition` is the main unit of a Remotion video. It defines the dimensions, frame rate, and duration.

### Frames vs. Seconds
Remotion is frame-based. Use `useCurrentFrame()` to get the current frame number and `useVideoConfig()` to get FPS and duration.
```typescript
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const seconds = frame / fps;
```

### Sequencing
Use the `<Sequence>` component to time-shift components.
```typescript
<Sequence from={30} durationInFrames={60}>
  <MyComponent />
</Sequence>
```

### Interpolation
Use `interpolate()` for smooth animations.
```typescript
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: 'clamp',
});
```

## Essential Commands

### Preview
Open the Remotion Studio to see a live preview.
```bash
npx remotion preview src/index.ts
```

### Rendering
Render the composition to a video file (requires FFmpeg).
```bash
npx remotion render src/index.ts HelloWorld out/video.mp4
```

## Best Practices

1. **Keep it Deterministic**: Avoid `Math.random()` or `new Date()` inside components. Use the frame number as the source of truth for all movement.
2. **Component Granularity**: Break the video into small, reusable components.
3. **Asset Handling**: Use `staticFile()` for local assets or external URLs for dynamic assets.
4. **Performance**: Avoid heavy computations inside the render loop. Pre-calculate values if possible.

## Troubleshooting

- **FFmpeg not found**: Ensure `ffmpeg` is installed on the system path.
- **Browser issues**: Remotion uses Puppeteer/Chromium behind the scenes. Ensure sufficient memory is available.
- **Type Errors**: If using TypeScript, ensure `remotion` and `@types/react` versions are compatible.
