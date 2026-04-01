<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_plannings', function (Blueprint $table) {
            $table->id('user_planning_id');
            $table->foreignId('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreignId('lob_id')->references('lob_id')->on('lobs')->onDelete('restrict');
            $table->foreignId('product_id')->references('product_id')->on('products')->onDelete('restrict');
            $table->string('planning_month', 7);
            $table->integer('planned_quantity');
            $table->decimal('planned_price_myr', 12, 2);
            $table->decimal('planned_price_usd', 12, 2);
            $table->decimal('planned_price_aed', 12, 2);
            $table->decimal('total_amount', 15, 2);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('user_plannings');
    }
};
