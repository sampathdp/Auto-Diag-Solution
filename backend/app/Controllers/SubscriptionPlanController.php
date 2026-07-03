<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;

class SubscriptionPlanController extends BaseController
{
    public function index(Request $request): void
    {
        $sql = "SELECT * FROM subscription_plans ORDER BY id ASC";
        $stmt = DatabaseManager::query($sql);
        $plans = $stmt->fetchAll();

        // Decode JSON features and allowed themes
        foreach ($plans as &$plan) {
            $plan['features'] = json_decode($plan['features'], true);
            $plan['allowed_themes'] = isset($plan['allowed_themes']) ? json_decode($plan['allowed_themes'], true) : [];
        }

        $this->success($plans);
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $data = $request->all();

        if (isset($data['features']) && is_array($data['features'])) {
            $data['features'] = json_encode($data['features']);
        }

        if (isset($data['allowed_themes']) && is_array($data['allowed_themes'])) {
            $data['allowed_themes'] = json_encode($data['allowed_themes']);
        }


        // Whitelist columns from the real table schema so request body keys
        // can never inject arbitrary SQL via the column name.
        $columns = DatabaseManager::query("SHOW COLUMNS FROM subscription_plans")->fetchAll(\PDO::FETCH_COLUMN);
        $allowedColumns = array_diff($columns, ['id', 'created_at', 'updated_at']);

        $fields = [];
        $params = ['_id' => $id];
        foreach ($data as $key => $value) {
            if (!in_array($key, $allowedColumns, true)) {
                continue;
            }
            $fields[] = "`$key` = :$key";
            $params[$key] = $value;
        }

        if (empty($fields)) {
            $this->error('No valid fields to update');
            return;
        }

        $fieldsStr = implode(', ', $fields);
        $sql = "UPDATE subscription_plans SET $fieldsStr WHERE id = :_id";
        
        try {
            DatabaseManager::query($sql, $params);
            $this->success(null, 'Subscription plan updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
