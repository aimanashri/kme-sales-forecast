<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lob extends Model
{
    protected $primaryKey = 'lob_id';
    protected $fillable = ['sold_to_bp', 'sold_to_bp_name', 'lob_code'];

    public function userPlannings()
    {
        return $this->hasMany(UserPlanning::class, 'lob_id', 'lob_id');
    }
}
