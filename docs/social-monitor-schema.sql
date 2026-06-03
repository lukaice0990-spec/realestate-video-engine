-- 社群監控潛在客戶表
CREATE TABLE social_monitor_leads (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  platform        text        NOT NULL,           -- 'PTT' | 'Dcard'
  post_id         text        UNIQUE NOT NULL,    -- 去重用，格式: ptt:/bbs/... | dcard:12345
  author          text,
  content         text,
  url             text,
  intent_score    integer,                        -- 1-10，由 Claude 評分
  intent_reason   text,                           -- 為何給此分數
  suggested_reply text,                           -- AI 建議業務員的回覆話術
  notified_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON social_monitor_leads (intent_score);
CREATE INDEX ON social_monitor_leads (created_at DESC);
