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
        Schema::table('user_plannings', function (Blueprint $table) {
            $table->dropColumn('is_confirmed');
            $table->integer('confirmed_quantity')->default(0)->after('total_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_plannings', function (Blueprint $table) {
            $table->dropColumn('confirmed_quantity');
            $table->boolean('is_confirmed')->default(false);
        });
    }
};
