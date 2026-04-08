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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('avg_12m_qty',12,2)->default(0)->after('total_qty');
            $table->decimal('avg_6m_qty', 12,2)->default(0)->after('avg_12m_qty');
            $table->decimal('avg_3m_qty', 12,2)->default(0)->after('avg_6m_qty');

            $table->decimal('avg_12m_sales', 12,2)->default(0)->after('avg_3m_qty');
            $table->decimal('avg_6m_sales', 12,2)->default(0)->after('avg_12m_sales');
            $table->decimal('avg_3m_sales', 12,2)->default(0)->after('avg_6m_sales');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
        
        });
    }
};
