// ============================================================================
// gameService.js — Data / Logic Layer (the Subject in Observer Pattern)
// ============================================================================
//
// LAYER RULES — read this before writing a single line of code.
//
//   1. This file MUST NOT import anything from a DOM API. No `document`,
//      no `window.document`, no `querySelector`. If you find yourself
//      reaching for the DOM, you are in the wrong layer.
//
//   2. The outside world sees this service only through:
//        - the method calls it makes (start, flipCard, restart, ...)
//        - the events it emits via the injected event bus
//      Nothing else. Do not expose the internal state object.
//
//   3. State is mutated only inside this file. The UI layer reads state
//      from the event payloads, never by reaching in.
//
// ============================================================================
// EVENT CONTRACT (these are the names — use exactly these strings)
// ----------------------------------------------------------------------------
//
//   'game:started'           payload: { cards, totalPairs }
//     emitted when a new game begins. `cards` is the full shuffled array
//     with every card face-down. UI renders the board from this.
//
//   'game:cardFlipped'       payload: { cardId, symbol }
//     emitted when the player successfully flips a face-down card.
//     UI adds the .is-flipped class and shows the symbol.
//
//   'game:matchFound'        payload: { firstId, secondId, matchedCount }
//     emitted when the two currently flipped cards match. UI marks both
//     as .is-matched.
//
//   'game:matchFailed'       payload: { firstId, secondId }
//     emitted when the two flipped cards do not match. UI should schedule
//     removal of .is-flipped after a short delay (~900ms) so the player
//     can see the second card before it flips back.
//
//   'game:moveCountChanged'  payload: { moves }
//     emitted whenever the move count changes. A "move" is one completed
//     pair attempt (two cards flipped).
//
//   'game:timerTick'         payload: { elapsedSeconds }
//     emitted once per second while status === 'playing'.
//
//   'game:won'               payload: { moves, elapsedSeconds }
//     emitted when every pair has been matched.
//
// ============================================================================
// STATE SHAPE (this is the exact shape you will maintain)
// ----------------------------------------------------------------------------
//
//   {
//     status:          'idle' | 'playing' | 'won',
//     cards:           Array<Card>,
//     firstPickId:     number | null,   // id of the first card of the pair
//     secondPickId:    number | null,   // id of the second card of the pair
//     moves:           number,
//     elapsedSeconds:  number,
//     matchedCount:    number,          // number of MATCHED CARDS (not pairs)
//     isLocked:        boolean,         // true between a failed match and
//                                       // the flip-back (prevents clicks)
//     timerId:         number | null,   // setInterval id, null when stopped
//   }
//
//   Card = {
//     id:         number,    // 0..(cards.length - 1)
//     symbol:     string,    // emoji string
//     isFlipped:  boolean,
//     isMatched:  boolean,
//   }
//
// ============================================================================

// The 18 Belizean-themed symbols. Each one will appear on exactly two cards.
const SYMBOLS = [
  '🦜', '🐆', '🌊', '🏝️', '🐢', '🥥',
  '🌴', '🥭', '🦈', '🐬', '🦩', '🐠',
  '☀️',  '⛰️', '🌺', '🦎', '🦀', '🛶',
];

const TOTAL_PAIRS = SYMBOLS.length;          // 18
const TOTAL_CARDS = TOTAL_PAIRS * 2;         // 36
const FLIP_BACK_DELAY_MS = 900;              // time to view a failed match
const TIMER_INTERVAL_MS = 1000;

/**
 * Factory: produces a game service bound to the given event bus.
 *
 * @param {object} eventBus  an instance from createEventEmitter()
 * @returns {object} public API — { start, flipCard, restart, destroy }
 */
export function createGameService(eventBus) {
  if (!eventBus || typeof eventBus.emit !== 'function') {
    throw new TypeError('createGameService requires an event bus.');
  }

  // -------------------------------------------------------------------------
  // Private state — sealed in this closure. Never expose, never return.
  // -------------------------------------------------------------------------
  let state = createInitialState();

  function createInitialState() {
    return {
      status:         'idle',
      cards:          [],
      firstPickId:    null,
      secondPickId:   null,
      moves:          0,
      elapsedSeconds: 0,
      matchedCount:   0,
      isLocked:       false,
      timerId:        null,
    };
  }

  // -------------------------------------------------------------------------
  // Pure helpers — no state mutation, no side effects.
  // -------------------------------------------------------------------------

  /**
   * Fisher–Yates shuffle. Returns a NEW array; does not mutate the input.
   * This must be pure — given the same input it can produce different
   * outputs (because of randomness) but it must never mutate `arr`.
   */
  function shuffle(arr) {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  }

  /**
   * Builds the initial deck: two cards per symbol, shuffled, each with a
   * stable numeric id in the range [0, TOTAL_CARDS). Returns a new array.
   */
  function buildDeck() {
    const symbols = SYMBOLS.flatMap(symbol => [symbol, symbol]);
    const shuffled = shuffle(symbols);
    return shuffled.map((symbol, id) => ({
      id,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));
  }

  /**
   * Look up a card by id. Returns the actual card object from state.cards
   * (not a copy). Only helpers inside this file should use this.
   */
  function getCardById(id) {
    return state.cards.find(card => card.id === id);
  }

  // -------------------------------------------------------------------------
  // Timer — private side effect, controlled via start/stop helpers.
  // -------------------------------------------------------------------------

  function startTimer() {
    if (state.timerId !== null) return;
    state.timerId = setInterval(() => {
      state.elapsedSeconds++;
      eventBus.emit('game:timerTick', { elapsedSeconds: state.elapsedSeconds });
    }, TIMER_INTERVAL_MS);
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Begin a new game. Builds a fresh shuffled deck, resets state,
   * and emits 'game:started'. Also starts the timer.
   */
  function start() {
    stopTimer();
    state = createInitialState();
    state.cards = buildDeck();
    state.status = 'playing';
    eventBus.emit('game:started', { cards: state.cards, totalPairs: TOTAL_PAIRS });
    startTimer();
  }

  /**
   * Player clicked a card. Validates the click, flips the card, and
   * handles match / no-match logic.
   *
   * Rejection rules (return early, do nothing):
   *   - status is not 'playing'
   *   - isLocked is true (we're in the flip-back window)
   *   - no card with that id exists
   *   - the card is already flipped or already matched
   *   - secondPickId is already set (can't pick a third)
   */
  function flipCard(cardId) {
    if (state.status !== 'playing' || state.isLocked) return;
    const card = getCardById(cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (state.secondPickId !== null) return;

    card.isFlipped = true;
    eventBus.emit('game:cardFlipped', { cardId, symbol: card.symbol });

    if (state.firstPickId === null) {
      state.firstPickId = cardId;
    } else {
      state.secondPickId = cardId;
      state.moves++;
      eventBus.emit('game:moveCountChanged', { moves: state.moves });

      const firstCard = getCardById(state.firstPickId);
      const secondCard = getCardById(state.secondPickId);

      if (firstCard.symbol === secondCard.symbol) {
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        state.matchedCount += 2;
        eventBus.emit('game:matchFound', { firstId: state.firstPickId, secondId: state.secondPickId, matchedCount: state.matchedCount });
        state.firstPickId = null;
        state.secondPickId = null;
        if (state.matchedCount === TOTAL_CARDS) {
          state.status = 'won';
          stopTimer();
          eventBus.emit('game:won', { moves: state.moves, elapsedSeconds: state.elapsedSeconds });
        }
      } else {
        state.isLocked = true;
        eventBus.emit('game:matchFailed', { firstId: state.firstPickId, secondId: state.secondPickId });
        setTimeout(() => {
          firstCard.isFlipped = false;
          secondCard.isFlipped = false;
          state.firstPickId = null;
          state.secondPickId = null;
          state.isLocked = false;
        }, FLIP_BACK_DELAY_MS);
      }
    }
  }

  /**
   * Abort the current game (if any) and begin a new one.
   * This is a thin wrapper around start() — start() already resets state
   * and restarts the timer, so restart just delegates.
   */
  function restart() {
    start();
  }

  /**
   * Cleanup hook — stop the timer and clear listeners. Useful if the
   * service is torn down (e.g. page navigation in a SPA).
   */
  function destroy() {
    stopTimer();
  }

  return Object.freeze({ start, flipCard, restart, destroy });
}
