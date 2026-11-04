import { mergeConfig } from 'vite';
import viteConfig from './vite.config';

// Archived native-smoke checkouts have their own React dependencies and tests.
export default mergeConfig(viteConfig, {
  test: { include: ['src/**/*.test.{ts,tsx}'] },
});
