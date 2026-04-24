# Belize Memory Match — CMPS2212 Take-Home Assessment

## Overview

You will complete a 6×6 memory matching game built on the **Observer Pattern**. The game is organized into three decoupled layers, and your job is to implement the missing pieces of each layer without breaking the separation between them.

This assignment tests your ability to:

- Apply the Observer Pattern across three real layers (data, event bus, view).
- Write clean functional JavaScript — **no classes, no `this`, no OOP**.
- Respect an event contract: publish the right events with the right payloads.
- Keep the DOM and game logic in their proper lanes.
- Use modern, scalable DOM techniques (event delegation, DocumentFragment, `textContent`).

**Estimated effort:** ~4 hours.

---

## Architecture

```
   ┌───────────────────┐      emits events      ┌───────────────────┐
   │   gameService.js  │ ─────────────────────▶ │  eventEmitter.js  │
   │  (Data / Logic)   │                        │    (Pub / Sub)    │
   └───────────────────┘                        └─────────┬─────────┘
             ▲                                            │ notifies
             │ method calls                               ▼
             │ (start, flipCard,)       ┌───────────────────┐
             └──────────────────────────│      ui.js        │
                                        │  (View / DOM)     │
                                        └───────────────────┘
```

**Three rules that must never be broken:**

1. `gameService.js` must not touch the DOM.
2. `ui.js` must not contain game logic (no match checks, no move counting, no timer state).
3. The service and UI only communicate through the event bus (plus the UI calling the service's public methods on user input).

---

## File Map

| File | Status | Your job |
|------|--------|----------|
| `index.html` | Complete | Read only |
| `styles.css` | Complete | Read only |
| `js/eventEmitter.js` | **Skeleton** | Implement `on`, `off`, `emit` |
| `js/gameService.js` | **Skeleton** | Implement every `TODO (N)` body |
| `js/ui.js` | **Skeleton** | Implement every `TODO (N)` body |
| `js/main.js` | Complete | Read only |

---

## The Event Contract

Your service must emit these events with these exact names and payloads. Your UI must subscribe to them and respond correctly.

| Event | Payload | When |
|-------|---------|------|
| `game:started` | `{ cards, totalPairs }` | A new game starts. |
| `game:cardFlipped` | `{ cardId, symbol }` | A valid click flips a card face-up. |
| `game:matchFound` | `{ firstId, secondId, matchedCount }` | Two flipped cards match. |
| `game:matchFailed` | `{ firstId, secondId }` | Two flipped cards do not match. |
| `game:moveCountChanged` | `{ moves }` | The move counter changes. |
| `game:timerTick` | `{ elapsedSeconds }` | Once per second while playing. |
| `game:won` | `{ moves, elapsedSeconds }` | All 18 pairs matched. |

---

## Acceptance Criteria

Your submission is considered complete when **all** of the following pass:

1. Opening `index.html` renders a 6×6 grid of 36 face-down cards.
2. Clicking a card flips it to reveal a symbol.
3. Clicking a second card:
   - If it matches: both stay face-up and glow.
   - If it does not: both flip back after ~900 ms.
4. Click ignored during the 900 ms no-match window (the lock).
5. A card that is already face-up or matched ignores further clicks.
6. Move counter increments by 1 per completed pair attempt (two flips = one move).
7. Timer starts at 0:00 on game start and advances each second.
8. "New Game" button restarts from scratch (shuffled, counters reset, timer reset).
9. When all 18 pairs are found, the win overlay appears with final stats and the timer stops.
10. Pressing "Play Again" starts a fresh game.
11. Opening DevTools Console → no errors on any interaction.
12. Opening DevTools Elements → verify that `.is-flipped` and `.is-matched` classes are applied/removed as expected.

---

## Constraints (non-negotiable)

- **Functional JavaScript only.** No `class`, no `this`, no prototypes. Use factory functions and closures.
- **ES modules** (`import` / `export`) — do not bundle everything into one file.
- **No external libraries.** Vanilla JS only.
- **No `innerHTML`** for inserting dynamic content. Use `createElement` + `textContent`.
- **Event delegation** on the board — one listener, not 36.
- Do not modify `index.html`, `styles.css`, or `js/main.js`.
- Do not add new event names. Use exactly the names in the contract.
- Do not expose the service's internal state. The only way the UI should learn about state changes is through event payloads.

---

## Grading Rubric (100 points)

| Area | Points | What we check |
|------|--------|---------------|
| **EventEmitter correctness** | 15 | `on` / `off` / `emit` behave correctly; multiple listeners supported; one listener's error does not break others; internal store is not exposed. |
| **Service — state & shuffle** | 10 | Deck is built correctly (each symbol appears exactly twice), shuffle is pure, state shape matches spec. |
| **Service — flipCard logic** | 20 | All validation rules honored; match / no-match branches correct; lock behavior correct; win detection correct. |
| **Service — timer** | 5 | Starts on game start, stops on win, resets on restart, no double-starts. |
| **Service — event emission** | 10 | Every event fired at the right moment with the correct payload shape. |
| **UI — rendering** | 10 | Board renders from payload; cards built with correct DOM structure; uses `textContent`; uses DocumentFragment. |
| **UI — event handling** | 10 | Event delegation used; handlers only forward intent; no game logic in UI. |
| **UI — subscription & cleanup** | 10 | All events subscribed; subscriptions tracked; `unmount` detaches cleanly. |
| **Layer discipline** | 10 | Service does not touch DOM. UI does not reach into service state. Clean separation. |

**Automatic 0** if you use `class`, `this`, or OOP patterns anywhere in the JS layers.

---

## How To Test As You Build

Build bottom-up:

1. **EventEmitter first.** Test it in the console:
   ```js
   const bus = createEventEmitter();
   bus.on('ping', (x) => console.log('heard', x));
   bus.emit('ping', 42); // → "heard 42"
   ```
2. **Then the service.** You can test without the UI — listen on the bus and call service methods from the console. You should see events firing with correct payloads.
3. **Then the UI.** Once the first two layers work, the UI is just rendering + forwarding clicks.

---

## Submission

Submit a ZIP of the project folder containing:

```
memory-game/
├── index.html
├── styles.css
├── js/
│   ├── eventEmitter.js
│   ├── gameService.js
│   ├── ui.js
│   └── main.js
└── README.md   (this file, unmodified)
```

**Filename:** `<LastName>_<FirstName>_CMPS2212_MemoryMatch.zip`

**Deadline:** See course schedule.

---

## Hints

- The flip animation and all styling are already handled by `styles.css`. You only need to toggle `.is-flipped` and `.is-matched` on the card element.
- When the service detects a no-match, it schedules an internal `setTimeout` to flip the cards back in state. The UI independently schedules its own `setTimeout` to toggle the DOM classes after the same delay. Both must agree on the delay (900 ms, constant provided).
- `rootEl.querySelector('[data-card-id="N"]')` is the idiomatic way to find a card node by id.
- `Object.freeze(...)` on your factory return value prevents accidental API tampering. This is already done in the skeleton — keep it.
- If your game seems to "skip" a flip, you probably forgot to emit `game:cardFlipped` for the second pick before the match/no-match event.

Good luck. Keep the layers clean and the pattern will do most of the work for you.
