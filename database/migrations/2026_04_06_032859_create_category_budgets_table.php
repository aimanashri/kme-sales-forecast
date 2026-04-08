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
        Schema::create('category_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'user_id')->onDelete('cascade');
            $table->string('product_line'); 
            $table->string('planning_month', 7); 
            $table->decimal('budget_aed', 15, 2)->default(0);
            $table->timestamps();

            // Ensure a user can only have one budget per category per month
            $table->unique(['user_id', 'product_line', 'planning_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('category_budgets');
    }
};
