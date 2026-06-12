/** Delivery lifecycle, strictly monotonic: sent → delivered → read. */
export type MessageStatus = "sent" | "delivered" | "read";

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
  /** Absent on legacy messages — treat as "sent". */
  status?: MessageStatus;
}
