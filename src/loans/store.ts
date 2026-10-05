import type { Loan } from "./domain/loan.ts";

/** 貸出のインメモリ保存先。プロセスを止めると消える */
export class LoanStore {
  readonly #loans = new Map<string, Loan>();
  #sequence = 0;

  constructor(loans: readonly Loan[] = []) {
    for (const loan of loans) this.#loans.set(loan.id, loan);
    this.#sequence = loans.length;
  }

  list(): Loan[] {
    return [...this.#loans.values()];
  }

  get(id: string): Loan | undefined {
    return this.#loans.get(id);
  }

  findActiveByItem(itemId: string): Loan | undefined {
    return this.list().find((loan) => loan.itemId === itemId && loan.returnedAt === null);
  }

  save(loan: Loan): void {
    this.#loans.set(loan.id, loan);
  }

  nextId(): string {
    this.#sequence += 1;
    return `L-${String(this.#sequence).padStart(4, "0")}`;
  }
}
