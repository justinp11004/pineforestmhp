CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`home_id` text DEFAULT '' NOT NULL,
	`home_name` text NOT NULL,
	`intent` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`consent` integer NOT NULL,
	`created_at` integer NOT NULL,
	`network_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inquiries_network_created` ON `inquiries` (`network_hash`,`created_at`);