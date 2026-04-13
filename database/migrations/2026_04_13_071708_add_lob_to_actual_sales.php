<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actual_sales', function (Blueprint $table) {
            // 1. Drop the old unique constraint first
            $table->dropUnique('actual_sales_unique');

            // 2. Add the new lob_id column
            $table->foreignId('lob_id')->nullable()->after('product_id')->constrained('lobs', 'lob_id')->onDelete('cascade');

            // 3. Create the new unique constraint that includes the lob_id
            $table->unique(['product_id', 'lob_id', 'sales_representative_no', 'invoice_date'], 'actual_sales_unique');
        });
    }

    public function down(): void
    {
        Schema::table('actual_sales', function (Blueprint $table) {
            // Reverse the process if we ever need to rollback
            $table->dropUnique('actual_sales_unique');
            $table->dropForeign(['lob_id']);
            $table->dropColumn('lob_id');
            $table->unique(['product_id', 'sales_representative_no', 'invoice_date'], 'actual_sales_unique');
        });
    }
};