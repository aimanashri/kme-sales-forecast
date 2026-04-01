
<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id('product_price_id');
            $table->foreignId('product_id')->references('product_id')->on('products')->onDelete('cascade');
            $table->foreignId('lob_id')->nullable()->references('lob_id')->on('lobs')->onDelete('cascade');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('AED');
            $table->timestamps();

            $table->unique(['product_id', 'lob_id']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('product_prices');
    }
};
