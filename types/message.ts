export interface Message {
  id: string;
  /** Sender uid. */
  from: string;
  /** Recipient uid. */
  to: string;
  /** Denormalised [from, to] for array-contains queries. */
  participants: string[];
  text: string;
  createdAt: number;
}
