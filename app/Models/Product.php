<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $primaryKey = 'product_id';
    protected $fillable = ['item_code', 'item_description', 'product_model', 'product_category', 'product_line', 'item_group', 'brand','cogs_price','cogs_currency',
    'kmi_qty','kme_qty','total_qty', ''];

    public function prices()
    {
        return $this->hasMany(ProductPrice::class, 'product_id', 'product_id');
    }
    public function userPlannings()
    {
        return $this->hasMany(UserPlanning::class, 'product_id', 'product_id');
    }
}
