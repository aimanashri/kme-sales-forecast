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
        Schema::create('actual_sales', function (Blueprint $table) {
            $table->id("actual_sale_id");
            $table->foreignId('product_id')->constrained('products', 'product_id')->onDelete('cascade');
            $table->string('sales_representative_no')->nullable();
            $table->date('invoice_date');
            $table->integer('quantities')->default(0);
            $table->decimal('sales',15,2)->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'sales_representative_no','invoice_date'], 'actual_sales_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('actual_sales');
    }
};
