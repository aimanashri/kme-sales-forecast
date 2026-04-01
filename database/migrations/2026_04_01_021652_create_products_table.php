<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id('product_id');
            $table->string('item_code')->unique();
            $table->string('item_description')->nullable();
            $table->string('product_model')->nullable();
            $table->string('product_category')->nullable();
            $table->string('product_line')->nullable();
            $table->string('item_group')->nullable();
            $table->string('brand')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
