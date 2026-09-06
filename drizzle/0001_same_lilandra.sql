CREATE TABLE `memory_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transcript_id` integer NOT NULL,
	`memory_id` integer,
	`outcome` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
