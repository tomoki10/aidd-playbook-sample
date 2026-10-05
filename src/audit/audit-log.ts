/**
 * 監査ログ。誰が・いつ・何に対して・何をしたか・結果はどうだったかを残す。
 * 研修ではインメモリに保持し、テストから中身を確かめられるようにしている。
 * 個人情報（メールアドレス、電話番号など）は記録しない。
 */
export type AuditEntry = {
  at: string;
  actorId: string;
  action: string;
  targetId: string | null;
  result: "success" | "denied" | "failure";
};

export class AuditLog {
  readonly #entries: AuditEntry[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  record(entry: Omit<AuditEntry, "at">): void {
    const full = { at: this.now().toISOString(), ...entry };
    this.#entries.push(full);
  }

  entries(): readonly AuditEntry[] {
    return [...this.#entries];
  }
}
