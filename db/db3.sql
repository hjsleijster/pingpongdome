ALTER TABLE `players`
CHANGE `created_at` `created_at` datetime NOT NULL DEFAULT current_timestamp() AFTER `full_name`;
