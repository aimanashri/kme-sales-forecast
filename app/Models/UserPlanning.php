<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPlanning extends Model
{
    protected $primaryKey = 'user_planning_id';
    protected $fillable = ['user_id', 'lob_id', 'product_id', 'planning_month', 'planned_quantity', 'planned_price_myr', 'planned_price_usd', 'planned_price_aed', 'total_amount', 'confirmed_quantity', 'updated_by'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
    public function lob()
    {
        return $this->belongsTo(Lob::class, 'lob_id', 'lob_id');
    }
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
