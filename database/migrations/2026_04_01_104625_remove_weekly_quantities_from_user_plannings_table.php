<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The "up" method now DROPS the columns
        Schema::table('user_plannings', function (Blueprint $table) {
            $table->dropColumn([
                'qty_w1', 
                'qty_w2', 
                'qty_w3', 
                'qty_w4', 
                'qty_w5'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // The "down" method adds them back (just in case you rollback)
        Schema::table('user_plannings', function (Blueprint $table) {
            $table->integer('qty_w1')->default(0)->after('planning_month');
            $table->integer('qty_w2')->default(0)->after('qty_w1');
            $table->integer('qty_w3')->default(0)->after('qty_w2');
            $table->integer('qty_w4')->default(0)->after('qty_w3');
            $table->integer('qty_w5')->default(0)->after('qty_w4');
        });
    }
};