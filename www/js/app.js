/**
 * Antiko Web Application JS Entrypoint
 * This file coordinates and boots modular architectures.
 */

// 1. Shared State Registry
import "./app-state.js";

// 2. Audio Control Systems
import "./app-audio.js";

// 3. User Accounts and Authorization
import "./app-auth.js";

// 4. Client Router & Navigation Transitions
import "./app-ui.js";

// 5. Dynamic Data fetching Catalogues
import "./app-data.js";

// 6. Orders Processor & Validations
import "./app-orders.js";

// 7. Interactive Support Ticketing messaging
import "./app-support.js";

// 8. DB app control flags & maintenance configs
import "./app-flags.js";

// 9. CPU-Optimized Neural background visualization canvas
import "./app-canvas.js";
