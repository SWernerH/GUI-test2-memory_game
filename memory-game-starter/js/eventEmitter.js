// ============================================================================
// eventEmitter.js — Pub/Sub factory (Observer Pattern core)
// ============================================================================
//
// WHAT THIS IS
//   A reusable event bus. The game service uses this to notify the UI layer
//   about state changes without ever touching the DOM. The UI layer uses
//   this to subscribe to events it cares about.
//
// OBSERVER PATTERN — why this matters
//   The service (subject) does not know who is listening. The UI (observer)
//   does not know how the service computes state. They communicate only
//   through named events and payloads. This is the contract you must respect.
//
// REQUIREMENTS
//   - No classes. Factory function + closure only.
//   - No `this`.
//   - Multiple listeners per event name must be supported.
//   - `off` must remove only the specific listener passed in, not all
//     listeners for that event.
//   - `emit` must call every listener for the event with the given payload.
//   - If `emit` is called for an event that has no listeners, it should
//     silently do nothing (no errors).
//   - Listener errors must not prevent other listeners from running.
//
// PUBLIC API (do not change these signatures)
//   const bus = createEventEmitter();
//   bus.on(eventName, listenerFn);     // subscribe
//   bus.off(eventName, listenerFn);    // unsubscribe
//   bus.emit(eventName, payload);      // notify all subscribers
//
// HINT
//   The internal store is a plain object whose keys are event names and
//   whose values are arrays of listener functions. The object lives in
//   closure — never expose it.
// ============================================================================

export function createEventEmitter() {
  // TODO (1): create the private listeners store here.
  //           It should be an object mapping event name → array of listeners.


  function on(eventName, listener) {
    // TODO (2):
    //   - If no array exists yet for `eventName`, create one.
    //   - Push `listener` into that array.
    //   - Validate that `listener` is a function; otherwise throw a
    //     TypeError with a clear message (fail loud, fail early).

  }

  function off(eventName, listener) {
    // TODO (3):
    //   - If there is no array for `eventName`, return quietly.
    //   - Otherwise remove ONLY the matching listener reference.
    //   - Do not mutate the array in place in a way that breaks a
    //     concurrent `emit` iteration — filter into a new array instead.

  }

  function emit(eventName, payload) {
    // TODO (4):
    //   - If no listeners are registered for `eventName`, return.
    //   - Otherwise call every listener with `payload`.
    //   - Wrap each call in a try/catch so one bad listener does not
    //     break the others. Log errors with console.error.

  }

  // Public interface — factory return value. Notice how the internal
  // store is not exposed; it is sealed inside this closure.
  return Object.freeze({ on, off, emit });
}
