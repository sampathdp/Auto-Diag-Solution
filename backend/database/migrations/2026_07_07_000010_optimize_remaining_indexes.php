<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Composite/query-shape indexes for access patterns identified while reviewing the
// full schema, across tables not already touched by the products/orders migrations.
class OptimizeRemainingIndexes extends Migration
{
    public function up(): void
    {
        // Public category listing: "active categories, ordered by sort_order".
        $this->execute("ALTER TABLE categories ADD INDEX idx_categories_active_sort (is_active, sort_order);");

        // Storefront "approved reviews for product X" — product_id alone is already the
        // leftmost column of uq_reviews_product_user, but folding is_approved in lets
        // MySQL filter within the index instead of revisiting every row for the product.
        $this->execute("ALTER TABLE reviews ADD INDEX idx_reviews_product_approved (product_id, is_approved);");

        // Admin customer list "active vs blocked" filter, independent of role.
        $this->execute("ALTER TABLE users ADD INDEX idx_users_is_active (is_active);");

        // "This customer's default address" lookup — user_id alone is already covered by
        // idx_customer_addresses_user_id's leftmost column, so this composite replaces it
        // outright rather than stacking a second index on the same leading column.
        $this->execute("ALTER TABLE customer_addresses ADD INDEX idx_customer_addresses_user_default (user_id, is_default);");
        $this->execute("ALTER TABLE customer_addresses DROP INDEX idx_customer_addresses_user_id;");

        // Admin settings UI groups settings by tab/section.
        $this->execute("ALTER TABLE settings ADD INDEX idx_settings_group (group_name);");

        // Admin "abandoned carts" report.
        $this->execute("ALTER TABLE carts ADD INDEX idx_carts_status (status);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE carts DROP INDEX idx_carts_status;");
        $this->execute("ALTER TABLE settings DROP INDEX idx_settings_group;");
        $this->execute("ALTER TABLE customer_addresses ADD INDEX idx_customer_addresses_user_id (user_id);");
        $this->execute("ALTER TABLE customer_addresses DROP INDEX idx_customer_addresses_user_default;");
        $this->execute("ALTER TABLE users DROP INDEX idx_users_is_active;");
        $this->execute("ALTER TABLE reviews DROP INDEX idx_reviews_product_approved;");
        $this->execute("ALTER TABLE categories DROP INDEX idx_categories_active_sort;");
    }
}
