import { ValueObject } from "@/core/shared/domain/ValueObject";

export const DEFAULT_VOLUME = 3;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 200;

export class Volume extends ValueObject<number> {
  getValue(): number {
    return this.value;
  }

  protected validate(value: number): number {
    if (!Number.isInteger(value)) {
      throw new Error(`Volume must be an integer, got: ${value}`);
    }

    if (value < MIN_VOLUME || value > MAX_VOLUME) {
      throw new Error(
        `Volume must be between ${MIN_VOLUME} and ${MAX_VOLUME}, got: ${value}`,
      );
    }

    return value;
  }

  // Normalized 0.0 - 2.0 for @discordjs/voice AudioResource
  get normalized(): number {
    return this.value / 100;
  }

  static default(): Volume {
    return new Volume(DEFAULT_VOLUME);
  }

  static create(value: number): Volume {
    return new Volume(value);
  }
}
