// Re-export of the root city.config.js so src/ code can import the
// city configuration cleanly as `@/lib/cityConfig`.
import cityConfig from '../../city.config.js';

export default cityConfig;
export { cityConfig };
