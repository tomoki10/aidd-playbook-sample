export type Item = {
  id: string;
  name: string;
  category: "pc" | "monitor" | "camera" | "projector" | "other";
};

export class ItemStore {
  readonly #items = new Map<string, Item>();

  constructor(items: readonly Item[] = []) {
    for (const item of items) this.#items.set(item.id, item);
  }

  list(): Item[] {
    return [...this.#items.values()];
  }

  get(id: string): Item | undefined {
    return this.#items.get(id);
  }
}
