CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

ALTER TABLE "derived_nodes" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "derived_nodes" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "doc_node_links" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "node_links" ADD COLUMN "weight" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "node_links" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

CREATE INDEX idx_docs_embedding ON docs USING hnsw (embedding vector_cosine_ops);--> statement-breakpoint
CREATE INDEX idx_nodes_embedding ON derived_nodes USING hnsw (embedding vector_cosine_ops);