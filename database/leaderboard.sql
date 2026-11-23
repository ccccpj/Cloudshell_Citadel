-- 在目标 PG 环境运行。将本 schema 留在 PostgREST 对外暴露的 schema 列表之外。
CREATE SCHEMA IF NOT EXISTS circle_game;
REVOKE ALL ON SCHEMA circle_game FROM PUBLIC;
CREATE TABLE IF NOT EXISTS circle_game.scores (
    appid text NOT NULL,
    openid text NOT NULL,
    player bigint GENERATED ALWAYS AS IDENTITY,
    score integer NOT NULL CHECK (score >= 0),
    PRIMARY KEY (appid, openid)
);
CREATE INDEX IF NOT EXISTS scores_top ON circle_game.scores (appid, score DESC, player);

-- 保留原始成绩；正式总榜只展示云端按对局记录重算的分数。
ALTER TABLE circle_game.scores ADD COLUMN IF NOT EXISTS verified_score bigint CHECK (verified_score >= 0);
CREATE INDEX IF NOT EXISTS verified_top ON circle_game.scores (appid, verified_score DESC, player) WHERE verified_score > 0;
CREATE TABLE IF NOT EXISTS circle_game.runs (
    id uuid PRIMARY KEY,
    appid text NOT NULL,
    openid text NOT NULL,
    decks jsonb NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runs_expiry ON circle_game.runs (started_at);
