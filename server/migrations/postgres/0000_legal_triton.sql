CREATE TABLE "data_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "data_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_type" text NOT NULL,
	"config_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "derived_clusters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "derived_clusters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "derived_clusters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "derived_nodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "derived_nodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"cluster_slug" text NOT NULL,
	"radius" integer NOT NULL,
	"importance" integer NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"is_central" boolean DEFAULT false NOT NULL,
	"sentiment" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "derived_nodes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "doc_node_links" (
	"doc_id" integer NOT NULL,
	"node_slug" text NOT NULL,
	"score" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doc_node_links_doc_id_node_slug_pk" PRIMARY KEY("doc_id","node_slug")
);
--> statement-breakpoint
CREATE TABLE "docs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "docs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "node_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_slug" text NOT NULL,
	"target_slug" text NOT NULL,
	"link_kind" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_links_source_target" UNIQUE("source_slug","target_slug")
);
--> statement-breakpoint
ALTER TABLE "derived_nodes" ADD CONSTRAINT "derived_nodes_cluster_slug_derived_clusters_slug_fk" FOREIGN KEY ("cluster_slug") REFERENCES "public"."derived_clusters"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_node_links" ADD CONSTRAINT "doc_node_links_doc_id_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."docs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_node_links" ADD CONSTRAINT "doc_node_links_node_slug_derived_nodes_slug_fk" FOREIGN KEY ("node_slug") REFERENCES "public"."derived_nodes"("slug") ON DELETE no action ON UPDATE no action;