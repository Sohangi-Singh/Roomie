/**
 * Thrown by `scorePair` when a questionnaire is missing required fields (Fix 6).
 * The API layer catches this and returns a friendly "hasn't finished their
 * questionnaire yet" message instead of crashing or emitting NaN.
 */
export class IncompleteProfileError extends Error {
  /** Which side was incomplete ("you" or "the other user"). */
  readonly side: string;
  /** Dot-paths of the missing/invalid fields (e.g. ["sleep.sleepTime"]). */
  readonly missingFields: string[];

  constructor(side: string, missingFields: string[]) {
    super(
      `Incomplete questionnaire (${side}): missing or invalid ${
        missingFields.length ? missingFields.join(", ") : "fields"
      }`,
    );
    this.name = "IncompleteProfileError";
    this.side = side;
    this.missingFields = missingFields;
    // Preserve instanceof across transpilation targets.
    Object.setPrototypeOf(this, IncompleteProfileError.prototype);
  }
}
