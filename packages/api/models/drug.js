export class Drug {
  /** @param {{id?: number, name: string, form?: string, strength?: string, price?: number}} p */
  constructor(p) {
    this.id = p.id ?? null;
    this.name = p.name;
    this.form = p.form ?? null;
    this.strength = p.strength ?? null;
    this.price = p.price ?? 0;
  }
}
