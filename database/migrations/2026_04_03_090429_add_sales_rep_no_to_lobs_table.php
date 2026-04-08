<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lobs', function (Blueprint $table) {
            $table->string('sales_representative_no')->nullable()->after('lob_name');
        });
    }

    public function down(): void
    {
        Schema::table('lobs', function (Blueprint $table) {
            $table->dropColumn('sales_representative_no');
        });
    }
};