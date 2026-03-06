import { ValueObject } from "@/core/shared/domain/ValueObject";

export class GuildId extends ValueObject<string> {
  getValue(): string {
    return this.value;
  }

  protected validate(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error("GuildId cannot be empty");
    }

    // Discord snowflake IDs are numeric strings
    if (!/^\d+$/.test(value)) {
      throw new Error(
        `GuildId must be a valid Discord snowflake, got: "${value}"`,
      );
    }

    return value;
  }

  static create(value: string): GuildId {
    return new GuildId(value);
  }
}
