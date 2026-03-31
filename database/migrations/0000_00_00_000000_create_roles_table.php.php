<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->increments('role_id');
            $table->string('role_name', 50)->unique();
            $table->timestamps(0);
        });

        DB::table('roles')->insert([
            ['role_name' => 'User', 'created_at' => now(), 'updated_at' => now()],
            ['role_name' => 'Admin', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};