CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`authority` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clarifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject` text NOT NULL,
	`question` text NOT NULL,
	`memory_ids` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL,
	`value` text NOT NULL,
	`project` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`confidence` real DEFAULT 0.8 NOT NULL,
	`importance` integer DEFAULT 2 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`memory_id` integer NOT NULL,
	`transcript_id` integer NOT NULL,
	`relation` text DEFAULT 'created' NOT NULL,
	`excerpt` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`memory_consent` integer DEFAULT false NOT NULL,
	`authority_level` text DEFAULT 'confirm' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raw_text` text NOT NULL,
	`formatted_text` text NOT NULL,
	`app` text NOT NULL,
	`project` text NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
