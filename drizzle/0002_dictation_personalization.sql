CREATE TABLE `dictionary_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `heard_as` text NOT NULL,
  `write_as` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shortcuts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `phrase` text NOT NULL,
  `expansion` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
