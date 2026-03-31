<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('user_id');
            $table->string('email', 150)->unique();
            $table->string('first_name', 150)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('full_name', 255);
            $table->string('password', 255)->nullable();
            $table->string('microsoft_id', 255)->nullable()->unique();
            $table->integer('role_id')->default(1);
            $table->smallInteger('is_active')->default(1);
            $table->timestamp('email_verified_at', 0)->nullable();
            $table->string('remember_token', 100)->nullable();
            $table->timestamp('reset_token_created_at', 0)->nullable();
            $table->string('reset_token', 100)->nullable();
            $table->string('inserted_by', 100)->nullable();
            $table->string('updated_by', 100)->nullable();
            $table->timestamp('inserted_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->useCurrent()->useCurrentOnUpdate();

            $table->foreign('role_id')->references('role_id')->on('roles')->onDelete('restrict');
            $table->index('email', 'idx_user_email');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at', 0)->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};