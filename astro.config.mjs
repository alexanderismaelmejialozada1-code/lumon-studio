import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    optimizeDeps: {
      include: ['three', 'three/addons/geometries/RoundedBoxGeometry.js', 'three/addons/environments/RoomEnvironment.js'],
    },
  },
});
