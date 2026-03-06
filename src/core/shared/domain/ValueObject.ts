export abstract class ValueObject<T> {
  protected readonly value: T;

  constructor(value: T) {
    this.value = this.validate(value);
    Object.freeze(this);
  }

  protected abstract validate(value: T): T;

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  toString(): string {
    return String(this.value);
  }
}
