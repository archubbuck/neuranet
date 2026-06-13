CREATE TABLE `data_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `derived_clusters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `derived_clusters_slug_unique` ON `derived_clusters` (`slug`);--> statement-breakpoint
CREATE TABLE `derived_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`cluster_slug` text NOT NULL,
	`radius` integer NOT NULL,
	`importance` integer NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`is_central` integer DEFAULT false NOT NULL,
	`sentiment` real,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`cluster_slug`) REFERENCES `derived_clusters`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `derived_nodes_slug_unique` ON `derived_nodes` (`slug`);--> statement-breakpoint
CREATE TABLE `doc_node_links` (
	`doc_id` integer NOT NULL,
	`node_slug` text NOT NULL,
	`score` real NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`doc_id`, `node_slug`),
	FOREIGN KEY (`doc_id`) REFERENCES `docs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`node_slug`) REFERENCES `derived_nodes`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `docs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'done' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `node_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_slug` text NOT NULL,
	`target_slug` text NOT NULL,
	`link_kind` text DEFAULT 'related' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `node_links_source_target` ON `node_links` (`source_slug`,`target_slug`);