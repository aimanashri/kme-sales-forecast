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
            $table->integer('kmi_qty')->default(0)->after('cogs_currency');
            $table->integer('kme_qty')->default(0)->after('kmi_qty');
            $table->integer('total_qty')->default(0)->after('kme_qty');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['kmi_qty', 'kme_qty', 'total_qty']);
        });
    }
};
