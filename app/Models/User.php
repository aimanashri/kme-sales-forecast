<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

  
    protected $primaryKey = 'user_id';

    const CREATED_AT = 'inserted_at';

    protected $fillable = [
        'full_name',
        'first_name',
        'last_name',
        'email',
        'password',
        'role_id',
        'is_active',
        'microsoft_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'reset_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    
    // Optional: Add relationship to Role
    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }
}