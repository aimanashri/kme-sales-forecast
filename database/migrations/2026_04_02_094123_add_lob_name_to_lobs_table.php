<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lobs', function (Blueprint $table) {
            $table->string('lob_name')->nullable()->after('lob_code');
        });
    }

    public function down(): void
    {
        Schema::table('lobs', function (Blueprint $table) {
            $table->dropColumn('lob_name');
        });
    }
};