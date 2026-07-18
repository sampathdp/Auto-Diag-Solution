<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Lets the vehicle catalog (and product fitment rows) tell generations apart —
// e.g. a 2013 Nissan Altima can be either the L32 (2007-2013) or L33 (2013-2018)
// generation, and those two are different vehicles that happen to share a model
// year. Without this, `vehicles` could only hold one row per (year, make, model),
// so the overlap year couldn't be represented twice.
class AddChassisCodeToVehiclesAndFitments extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE vehicles ADD COLUMN chassis_code VARCHAR(50) NULL AFTER model;");
        $this->execute("ALTER TABLE vehicles ADD INDEX idx_vehicles_chassis_code (chassis_code);");
        // The old (year, make, model) unique key would reject the L32/L33 overlap-year
        // row outright — replaced with a key that also includes chassis_code. NULL
        // chassis_code rows aren't deduplicated by this DB-level constraint (MySQL
        // treats each NULL as distinct); VehicleService::existsCombo() enforces the
        // NULL-safe "no chassis" duplicate check at the application layer instead.
        $this->execute("ALTER TABLE vehicles ADD UNIQUE KEY uq_vehicles_year_make_model_chassis (year, make, model, chassis_code);");
        $this->execute("ALTER TABLE vehicles DROP INDEX uq_vehicles_year_make_model;");

        $this->execute("ALTER TABLE product_fitments ADD COLUMN chassis_code VARCHAR(50) NULL AFTER model;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE product_fitments DROP COLUMN chassis_code;");

        $this->execute("ALTER TABLE vehicles ADD UNIQUE KEY uq_vehicles_year_make_model (year, make, model);");
        $this->execute("ALTER TABLE vehicles DROP INDEX uq_vehicles_year_make_model_chassis;");
        $this->execute("ALTER TABLE vehicles DROP INDEX idx_vehicles_chassis_code;");
        $this->execute("ALTER TABLE vehicles DROP COLUMN chassis_code;");
    }
}
