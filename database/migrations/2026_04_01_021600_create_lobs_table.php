<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lobs', function (Blueprint $table) {
            $table->id('lob_id');
            $table->string('sold_to_bp')->unique();
            $table->string('sold_to_bp_name')->nullable();
            $table->string('lob_code')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('lobs');
    }
};
