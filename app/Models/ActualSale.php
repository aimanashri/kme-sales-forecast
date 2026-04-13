<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActualSale extends Model
{
    protected $primaryKey = 'actual_sale_id';

    protected $fillable = [
        'product_id',
        'lob_id',
        'sales_representative_no',
        'invoice_date',
        'quantities',
        'sales',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function lob()
    {
        return $this->belongsTo(Lob::class, 'lob_id', 'lob_id');
    }
}
