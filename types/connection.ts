export type ConnectionType = "invite" | "request" | "group_request";
export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface Connection {
  id: string;
  from: string;
  to: string;
  /** Denormalised [from, to] for array-contains queries. */
  participants: string[];
  type: ConnectionType;
  groupId?: string;
  message?: string;
  status: ConnectionStatus;
  createdAt: number;
}
