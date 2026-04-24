// ============================================================================
// main.js — Composition root
// ============================================================================
//
// READ ONLY. You do not need to modify this file to complete the assignment.
//
// This is where the three layers are instantiated and wired together.
// Notice the direction of dependencies:
//
//     eventBus  ←  gameService  (service publishes to the bus)
//     eventBus  ←  ui           (ui subscribes to the bus)
//     ui         →  gameService  (ui calls service methods on user input)
//
// The service NEVER imports the ui, and the ui NEVER mutates service state.
// They are decoupled. That is the Observer Pattern in one picture.
// ============================================================================

import { createEventEmitter } from './eventEmitter.js';
import { createGameService }  from './gameService.js';
import { createUI }           from './ui.js';

const eventBus    = createEventEmitter();
const gameService = createGameService(eventBus);
const ui          = createUI(eventBus, gameService, document.body);

ui.mount();
gameService.start();
