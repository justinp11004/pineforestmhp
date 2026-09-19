CREATE TABLE `lot_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `payload_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lot_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lot_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `timeline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `contact_method` text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `source` text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `consent_version` text DEFAULT '2026-09-13' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `status` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `updated_at` integer DEFAULT 0 NOT NULL;