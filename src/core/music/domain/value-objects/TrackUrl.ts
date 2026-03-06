import { ValueObject } from "@/core/shared/domain/ValueObject";

type SupportedSource = "youtube" | "unknown";

export class TrackUrl extends ValueObject<string> {
  getValue(): string {
    return this.value;
  }

  protected validate(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error("TrackUrl cannot be empty");
    }

    try {
      new URL(value);
    } catch {
      throw new Error(`TrackUrl must be a valid URL, got: "${value}"`);
    }

    return value;
  }

  get source(): SupportedSource {
    if (
      this.value.includes("youtube.com") ||
      this.value.includes("youtu.be") ||
      this.value.includes("music.youtube.com")
    ) {
      return "youtube";
    }

    return "unknown";
  }

  static create(value: string): TrackUrl {
    return new TrackUrl(value);
  }
}
