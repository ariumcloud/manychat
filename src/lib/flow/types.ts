export type NodeKind =
  | "trigger"
  | "text"
  | "image"
  | "buttons"
  | "quickReplies"
  | "delay"
  | "tag"
  | "condition";

export type FlowButton =
  | { kind: "url"; label: string; url: string }
  | { kind: "reply"; label: string; payload: string };

export type FlowNodeData = {
  label?: string;
  /** text, buttons, quickReplies */
  text?: string;
  /** image */
  url?: string;
  /** buttons */
  buttons?: FlowButton[];
  /**
   * text: link que vai no fim da mensagem, já rastreado.
   * Num comentário só existe UMA mensagem (a private reply) — o Instagram
   * recusa qualquer envio seguinte enquanto a pessoa não responder. Então o
   * link viaja dentro do texto em vez de num botão, que exigiria uma segunda.
   */
  link?: { url: string; label?: string };
  /** quickReplies */
  options?: Array<{ label: string; payload: string }>;
  /** delay (segundos) */
  seconds?: number;
  /** tag */
  tagName?: string;
  /** condition */
  field?: "is_user_follow_business" | "follower_count" | "has_tag" | "last_text";
  op?: "is_true" | "is_false" | "gt" | "lt" | "contains";
  value?: string;
};

export type FlowNode = {
  id: string;
  type: NodeKind;
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type Flow = {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  status: "draft" | "live" | "paused";
  nodes: FlowNode[];
  edges: FlowEdge[];
  sent_count: number;
};

export type TriggerKind =
  | "comment_keyword"
  | "dm_keyword"
  | "story_reply"
  | "default_reply"
  | "icebreaker";

export type Trigger = {
  id: string;
  account_id: string;
  flow_id: string;
  kind: TriggerKind;
  keywords: string[];
  match_type: "contains" | "exact" | "any" | "regex";
  media_id: string | null;
  enabled: boolean;
  priority: number;
  public_reply_enabled: boolean;
  public_reply_texts: string[];
  only_first_time: boolean;
};
