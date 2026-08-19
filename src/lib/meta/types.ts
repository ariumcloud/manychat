export type WebhookBody = {
  object?: string;
  entry?: WebhookEntry[];
};

export type WebhookEntry = {
  id?: string;
  time?: number;
  messaging?: MessagingEvent[];
  changes?: ChangeEvent[];
};

export type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    quick_reply?: { payload?: string };
    reply_to?: { mid?: string; story?: { id?: string; url?: string } };
    attachments?: Array<{ type?: string; payload?: { url?: string; title?: string } }>;
  };
  postback?: { mid?: string; title?: string; payload?: string };
  reaction?: { mid?: string; action?: string; reaction?: string; emoji?: string };
  read?: { mid?: string };
};

export type ChangeEvent = {
  /** "comments" | "live_comments" | "mentions" | ... */
  field?: string;
  value?: {
    id?: string;
    text?: string;
    parent_id?: string;
    from?: { id?: string; username?: string };
    media?: { id?: string; media_product_type?: string };
  };
};
