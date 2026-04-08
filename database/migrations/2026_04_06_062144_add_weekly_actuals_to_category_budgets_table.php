<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('category_budgets', function (Blueprint $table) {
            $table->decimal('w1_aed', 15, 2)->default(0)->after('budget_aed');
            $table->decimal('w2_aed', 15, 2)->default(0)->after('w1_aed');
            $table->decimal('w3_aed', 15, 2)->default(0)->after('w2_aed');
            $table->decimal('w4_aed', 15, 2)->default(0)->after('w3_aed');
            $table->decimal('w5_aed', 15, 2)->default(0)->after('w4_aed');
        });
    }

    public function down(): void
    {
        Schema::table('category_budgets', function (Blueprint $table) {
            $table->dropColumn(['w1_aed', 'w2_aed', 'w3_aed', 'w4_aed', 'w5_aed']);
        });
    }
};
