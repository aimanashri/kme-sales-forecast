<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPrice extends Model
{
    protected $primaryKey = 'product_price_id';
    protected $fillable = ['product_id', 'lob_id', 'price', 'currency'];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
    public function lob()
    {
        return $this->belongsTo(Lob::class, 'lob_id', 'lob_id');
    }
}
