<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoryBudget extends Model
{
    protected $primaryKey = 'id';
    protected $fillable = ['user_id', 'product_line', 'planning_month', 'budget_aed','w1_aed','w2_aed','w3_aed','w4_aed','w5_aed'];
}
