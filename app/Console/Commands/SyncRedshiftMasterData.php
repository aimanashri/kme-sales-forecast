<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Lob;
use App\Models\Product;
use App\Models\ProductPrice;

class SyncRedshiftMasterData extends Command
{
    protected $signature = 'sync:redshift';
    protected $description = 'Pulls the latest LOBs, Products, and Prices from Redshift views securely and fast';

    public function handle()
    {
        $this->info('Starting Accelerated Redshift Sync...');


       $this->info('Syncing LOBs...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_bp_master')
            ->orderBy('sold_to_bp_code')
            ->chunk(1000, function ($bps) {
                $lobData = [];
                foreach ($bps as $bp) {
                    if (!$bp->sold_to_bp_code) continue;
                    
                    // Deduplicate by using the constraint as the array key
                    $lobData[$bp->sold_to_bp_code] = [
                        'sold_to_bp' => $bp->sold_to_bp_code,
                        'sold_to_bp_name' => $bp->sold_to_bp_name,
                        'lob_code' => $bp->lob_code,
                        'sales_representative_no' => $bp->sales_representative_no ?? null, 
                    ];
                }
                
                if(!empty($lobData)) {
                    Lob::upsert(
                        array_values($lobData), 
                        ['sold_to_bp'], 
                        ['sold_to_bp_name', 'lob_code', 'sales_representative_no'] 
                    );
                }
            });


        $this->info('Syncing Products...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_item_master')
            ->orderBy('item_code')
            ->chunk(1000, function ($items) {
                $productData = [];
                foreach ($items as $item) {
                    if (!$item->item_code) continue;

                    // Deduplicate by item_code
                    $productData[$item->item_code] = [
                        'item_code' => $item->item_code,
                        'item_description' => $item->model_description ?? $item->item ?? null,
                        'product_model' => $item->product_model,
                        'product_category' => $item->product_category,
                        'product_line' => $item->product_line,
                        'item_group' => $item->item_group,
                        'brand' => $item->brand
                    ];
                }
                
                if(!empty($productData)) {
                    Product::upsert(array_values($productData), ['item_code'], [
                        'item_description', 'product_model', 'product_category', 
                        'product_line', 'item_group', 'brand'
                    ]);
                }
            });


        $this->info('Loading memory maps...');
        $productMap = Product::pluck('product_id', 'item_code')->toArray();
        $lobMap = Lob::pluck('lob_id', 'sold_to_bp')->toArray();


        $this->info('Syncing Prices...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_item_selling_price_master')
            ->orderBy('item_code')
            ->chunk(1000, function ($prices) use ($productMap, $lobMap) {
                $priceData = [];
                foreach ($prices as $price) {
                    $productId = $productMap[$price->item_code] ?? null;
                    $lobId = $lobMap[$price->sold_to_bp_code] ?? null;

                    if ($productId) {
                        // Create a unique key combination of product_id + lob_id
                        // Example: "6285_218" or "6285_null"
                        $uniqueKey = $productId . '_' . ($lobId ?: 'null');

                        $priceData[$uniqueKey] = [
                            'product_id' => $productId,
                            'lob_id' => $lobId,
                            'price' => $price->price,
                            'currency' => $price->currency ?? 'AED'
                        ];
                    }
                }

                if(!empty($priceData)) {
                    ProductPrice::upsert(array_values($priceData), ['product_id', 'lob_id'], ['price', 'currency']);
                }
            });

        $this->info('Syncing COGS...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_item_cogs_master')->orderBy('item_code')->chunk(1000, function($cogsList) {
            DB::transaction(function() use ($cogsList) {
                foreach($cogsList as $cogs) {
                    Product::where('item_code', $cogs->item_code)->update([
                        'cogs_price' => $cogs->purchase_price,
                        'cogs_currency' => $cogs->purchase_currency
                    ]);
                }
            });
        });

        $this->info('Syncing Inventory...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_inventory_on_hand')->orderBy('item_code')->chunk(1000, function($inventoryList) {
            DB::transaction(function() use ($inventoryList) {
                foreach($inventoryList as $inv) {
                    Product::where('item_code', $inv->item_code)->update([
                        'kmi_qty' => (int) $inv->kmi_qty,
                        'kme_qty' => (int) $inv->kme_qty,
                        'total_qty' => (int) $inv->total_qty
                    ]);
                }
            });
        });

        $this->info('Syncing Sales Stats...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_actual_sales_past_12_months')->orderBy('item_code')->chunk(1000, function($statsList) {
            DB::transaction(function() use ($statsList) {
                foreach($statsList as $stat) {
                    Product::where('item_code', $stat->item_code)->update([
                        'avg_12m_qty'   => (float) $stat->avg_12m_quantities, 
                        'avg_6m_qty'    => (float) $stat->avg_6m_quantities,  
                        'avg_3m_qty'    => (float) $stat->avg_3m_quantities,  
                        'avg_12m_sales' => (float) $stat->avg_12m_sales,
                        'avg_6m_sales'  => (float) $stat->avg_6m_sales,
                        'avg_3m_sales'  => (float) $stat->avg_3m_sales
                    ]);
                }
            });
        });

        $this->info('Syncing LOB Names...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_lob_master')->orderBy('lob_code')->chunk(1000, function($lobMasters) {
            DB::transaction(function() use ($lobMasters) {
                foreach ($lobMasters as $lobMaster) {
                    Lob::where('lob_code', $lobMaster->lob_code)->update([
                        'lob_name' => $lobMaster->lob
                    ]);
                }
            });
        });


        $this->info('Syncing Actual Sales...');
        DB::connection('redshift')->table('khind_rz.vw_kme_apps_actual_sales_by_salesrep_2024_onwards')
            ->orderBy('invoice_date')
            ->chunk(1000, function ($actuals) use ($productMap, $lobMap) { 
                $actualSalesData = [];
                
                foreach ($actuals as $actual) {
                    $productId = $productMap[$actual->item_code] ?? null;
                    if (!$productId) continue; 

                    //  Map the Redshift BP Code to  local lob_id
                    $lobId = $lobMap[$actual->sold_to_bp_code] ?? null;

                    $repNo = $actual->sales_representative_no ?? 'Unknown';

                    // Update unique key to include lob_id
                    $lobKeyPart = $lobId ?: 'null';
                    $uniqueKey = $productId . '_' . $lobKeyPart . '_' . $repNo . '_' . $actual->invoice_date;

                    // Add quantities and sales together for same day matching lines
                    if (isset($actualSalesData[$uniqueKey])) {
                        $actualSalesData[$uniqueKey]['quantities'] += (int) $actual->quantities;
                        $actualSalesData[$uniqueKey]['sales']      += (float) $actual->sales;
                    } else {
                        $actualSalesData[$uniqueKey] = [
                            'product_id'              => $productId,
                            'lob_id'                  => $lobId, 
                            'sales_representative_no' => $repNo,
                            'invoice_date'            => $actual->invoice_date,
                            'quantities'              => (int) $actual->quantities,
                            'sales'                   => (float) $actual->sales,
                        ];
                    }
                } 
                
                if(!empty($actualSalesData)) {
                    \App\Models\ActualSale::upsert(
                        array_values($actualSalesData), 
                        ['product_id', 'lob_id', 'sales_representative_no', 'invoice_date'], // Updated unique columns
                        ['quantities', 'sales'] 
                    );
                }
            });


        $this->info('Sync Complete! Your local database is up to date.');
    }  
}